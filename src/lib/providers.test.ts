import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ create: vi.fn(), fetch: vi.fn() }))
vi.mock('server-only', () => ({}))
vi.mock('@google/genai', () => ({ GoogleGenAI: class { interactions = { create: mocks.create } } }))
import { analyzePricePhoto } from './gemini'
import { fetchRoadRoute } from './ors'

beforeEach(() => {
  mocks.create.mockReset(); mocks.fetch.mockReset()
  vi.stubEnv('GEMINI_API_KEY', 'test-gemini-key'); vi.stubEnv('GEMINI_MODEL', 'configured-model')
  vi.stubEnv('ORS_API_KEY', 'test-ors-key'); vi.stubGlobal('fetch', mocks.fetch)
})
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

describe('Gemini adapter', () => {
  it('uses Interactions with the configured model, inline image and structured output', async () => {
    const prices = [{ fuel_type: 'gasoline', price: 5.79, confidence: 0.95 }]
    mocks.create.mockResolvedValue({ status: 'completed', output_text: JSON.stringify({ prices }) })
    expect(await analyzePricePhoto(new Uint8Array([1, 2]), 'image/jpeg')).toEqual(prices)
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ model: 'configured-model', store: false, input: [expect.any(Object), { type: 'image', data: 'AQI=', mime_type: 'image/jpeg' }], response_format: [expect.objectContaining({ mime_type: 'application/json' })] }), { timeout_ms: 20000, retries: { strategy: 'none' } })
  })
  it.each([
    { status: 'incomplete', output_text: '{"prices":[]}' },
    { status: 'completed' }, { status: 'completed', output_text: 'not JSON' },
    { status: 'completed', output_text: '{"prices":[{"fuel_type":"diesel"}]}' },
  ])('rejects incomplete or invalid responses: %j', async (response) => {
    mocks.create.mockResolvedValue(response)
    await expect(analyzePricePhoto(new Uint8Array([1]), 'image/webp')).rejects.toThrow()
  })
  it('requires a key without making a provider call', async () => {
    vi.stubEnv('GEMINI_API_KEY', '')
    await expect(analyzePricePhoto(new Uint8Array([1]), 'image/webp')).rejects.toThrow('not_configured')
    expect(mocks.create).not.toHaveBeenCalled()
  })
  it('propagates provider failure for the endpoint to sanitize', async () => {
    mocks.create.mockRejectedValue(new Error('provider unavailable'))
    await expect(analyzePricePhoto(new Uint8Array([1]), 'image/webp')).rejects.toThrow('provider unavailable')
  })
})

describe('ORS adapter', () => {
  const origin = { latitude: -15.6, longitude: -56.1 }
  const destination = { latitude: -15.61, longitude: -56.11 }
  it('uses the current host and longitude before latitude', async () => {
    mocks.fetch.mockResolvedValue(Response.json({ features: [{ geometry: { type: 'LineString', coordinates: [[-56.1, -15.6], [-56.11, -15.61]] }, properties: { summary: { distance: 2500, duration: 300 } } }] }))
    expect(await fetchRoadRoute(origin, destination)).toMatchObject({ distanceKm: 2.5, durationMinutes: 5 })
    const [url, options] = mocks.fetch.mock.calls[0]
    expect(url).toBe('https://api.heigit.org/openrouteservice/v2/directions/driving-car/geojson')
    expect(options.headers.Authorization).toBe('test-ors-key')
    expect(JSON.parse(options.body).coordinates).toEqual([[-56.1, -15.6], [-56.11, -15.61]])
  })
  it.each([[429, {}, 'rate_limited'], [503, {}, 'provider_unavailable'], [404, { error: { code: 2009 } }, 'no_route'], [404, { error: { code: 2010 } }, 'no_route']])('handles provider status %i', async (status, body, code) => {
    mocks.fetch.mockResolvedValue(Response.json(body, { status: status as number }))
    await expect(fetchRoadRoute(origin, destination)).rejects.toThrow(code as string)
  })
  it('handles missing configuration without fetching', async () => {
    vi.stubEnv('ORS_API_KEY', '')
    await expect(fetchRoadRoute(origin, destination)).rejects.toThrow('not_configured')
    expect(mocks.fetch).not.toHaveBeenCalled()
  })
  it('propagates timeout without retrying', async () => {
    mocks.fetch.mockRejectedValue(new DOMException('timed out', 'TimeoutError'))
    await expect(fetchRoadRoute(origin, destination)).rejects.toMatchObject({ name: 'TimeoutError' })
    expect(mocks.fetch).toHaveBeenCalledTimes(1)
  })
})
