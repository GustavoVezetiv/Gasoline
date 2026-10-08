import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import sharp from 'sharp'
const mocks = vi.hoisted(() => ({ claims: vi.fn(), station: vi.fn(), eq: vi.fn(), photo: vi.fn(), route: vi.fn(), from: vi.fn() }))
vi.mock('server-only', () => ({}))
vi.mock('./supabase/server', () => ({ serverClient: async () => ({
  auth: { getClaims: mocks.claims },
  from: mocks.from,
}) }))
vi.mock('./gemini', () => ({ analyzePricePhoto: mocks.photo }))
vi.mock('./ors', () => ({ fetchRoadRoute: mocks.route }))
import { POST as photoPost } from '../app/api/analyze-price-photo/route'
import { POST as routePost } from '../app/api/route/route'
import { resetRateLimits } from './rate-limit'

const stationId = '00000000-0000-4000-8000-000000000001'
const destination = { id: stationId, latitude: -15.61, longitude: -56.11 }
const origin = { latitude: -15.6, longitude: -56.1 }
let testPhoto: Uint8Array
beforeAll(async () => { testPhoto = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#fff' } }).jpeg().toBuffer() })
const routeRequest = (body: unknown = { stationId, origin }, headers: Record<string, string> = {}) => new Request('https://gasoline.test/api/route', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) })
const photoRequest = (headers: Record<string, string> = {}, body: Uint8Array = testPhoto) => new Request(`https://gasoline.test/api/analyze-price-photo?station=${stationId}`, { method: 'POST', headers: { 'Content-Type': 'image/jpeg', ...headers }, body: new Blob([body as Uint8Array<ArrayBuffer>]) })

beforeEach(() => {
  vi.resetAllMocks(); resetRateLimits()
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://supabase.test')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'public-test-key')
  vi.stubEnv('GEMINI_API_KEY', 'test-key'); vi.stubEnv('ORS_API_KEY', 'test-key')
  mocks.claims.mockResolvedValue({ data: { claims: { sub: 'user-1' } }, error: null })
  mocks.station.mockResolvedValue({ data: destination, error: null })
  const query = { eq: mocks.eq, maybeSingle: mocks.station }
  mocks.eq.mockReturnValue(query)
  mocks.from.mockReturnValue({ select: () => query })
  mocks.photo.mockResolvedValue([{ fuel_type: 'gasoline', price: 5.99, confidence: 0.9 }])
  mocks.route.mockResolvedValue({ coordinates: [[-56.1, -15.6], [-56.11, -15.61]], distanceKm: 2, durationMinutes: 5 })
})
afterEach(() => vi.unstubAllEnvs())

describe('authenticated endpoints', () => {
  it('rejects absent or invalid sessions before accessing providers or data', async () => {
    mocks.claims.mockResolvedValue({ data: null, error: new Error('invalid jwt') })
    expect((await photoPost(photoRequest())).status).toBe(401)
    expect((await routePost(routeRequest())).status).toBe(401)
    expect(mocks.photo).not.toHaveBeenCalled(); expect(mocks.route).not.toHaveBeenCalled(); expect(mocks.from).not.toHaveBeenCalled()
  })
  it('rejects anonymous accounts', async () => {
    mocks.claims.mockResolvedValue({ data: { claims: { sub: 'anon', is_anonymous: true } } })
    expect((await routePost(routeRequest())).status).toBe(401)
  })
  it('rejects cross-site requests, even with an authenticated cookie', async () => {
    expect((await routePost(routeRequest(undefined, { Origin: 'https://evil.test' }))).status).toBe(401)
    expect((await photoPost(photoRequest({ 'Sec-Fetch-Site': 'cross-site' }))).status).toBe(401)
    expect(mocks.claims).not.toHaveBeenCalled()
  })
  it('resolves the active station on the server instead of trusting client destination', async () => {
    const response = await routePost(routeRequest({ origin, stationId, destination: { latitude: 1, longitude: 2 } }))
    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toContain('no-store')
    expect(mocks.eq).toHaveBeenCalledWith('active', true)
    expect(mocks.route).toHaveBeenCalledWith(origin, destination)
  })
  it('rejects invalid origins and station ids before calling ORS', async () => {
    expect((await routePost(routeRequest({ stationId, origin: { latitude: 300, longitude: 0 } }))).status).toBe(400)
    expect((await routePost(routeRequest({ stationId: 'invalid', origin }))).status).toBe(400)
    expect(mocks.route).not.toHaveBeenCalled()
  })
  it('rejects unknown or inactive stations for both providers', async () => {
    mocks.station.mockResolvedValue({ data: null, error: null })
    expect((await routePost(routeRequest())).status).toBe(404)
    expect((await photoPost(photoRequest())).status).toBe(404)
    expect(mocks.route).not.toHaveBeenCalled(); expect(mocks.photo).not.toHaveBeenCalled()
  })
  it('returns validated prices without inserting reports or uploading photographs', async () => {
    const response = await photoPost(photoRequest())
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ prices: [{ fuel_type: 'gasoline', price: 5.99, confidence: 0.9 }] })
    expect(mocks.from).toHaveBeenCalledTimes(1); expect(mocks.from).toHaveBeenCalledWith('stations')
  })
  it('rejects invalid formats and oversized photo bodies', async () => {
    expect((await photoPost(photoRequest({ 'Content-Type': 'image/svg+xml' }))).status).toBe(415)
    expect((await photoPost(photoRequest({}, new Uint8Array([1, 2])))).status).toBe(400)
    expect((await photoPost(photoRequest({}, new Uint8Array(2 * 1024 * 1024 + 1)))).status).toBe(413)
    expect(mocks.photo).not.toHaveBeenCalled()
  })
  it('decodes the photo and rejects corrupted or uncompressed large dimensions', async () => {
    const corrupt = new Uint8Array([255, 216, 255, 0, 0, 0, 0, 0, 0, 0, 255, 217])
    const huge = await sharp({ create: { width: 1601, height: 1, channels: 3, background: '#fff' } }).jpeg().toBuffer()
    expect((await photoPost(photoRequest({}, corrupt))).status).toBe(400)
    expect((await photoPost(photoRequest({}, huge))).status).toBe(400)
    expect(mocks.photo).not.toHaveBeenCalled()
  })
  it('accepts a valid WebP and rejects a MIME mismatch', async () => {
    const webp = await sharp(testPhoto).webp().toBuffer()
    expect((await photoPost(photoRequest({ 'Content-Type': 'image/webp' }, webp))).status).toBe(200)
    expect((await photoPost(photoRequest({ 'Content-Type': 'image/jpeg' }, webp))).status).toBe(400)
    expect(mocks.photo).toHaveBeenCalledTimes(1)
  })
  it('limits photo calls for the authenticated user', async () => {
    for (let n = 0; n < 5; n++) expect((await photoPost(photoRequest())).status).toBe(200)
    const response = await photoPost(photoRequest())
    expect(response.status).toBe(429); expect(response.headers.get('Retry-After')).toBe('600')
    expect(mocks.photo).toHaveBeenCalledTimes(5)
  })
  it('limits route calls for the authenticated user', async () => {
    for (let n = 0; n < 20; n++) expect((await routePost(routeRequest())).status).toBe(200)
    expect((await routePost(routeRequest())).status).toBe(429)
    expect(mocks.route).toHaveBeenCalledTimes(20)
  })
  it('handles missing keys while preserving the manual/external fallback', async () => {
    vi.stubEnv('GEMINI_API_KEY', ''); vi.stubEnv('ORS_API_KEY', '')
    const photo = await photoPost(photoRequest()); const route = await routePost(routeRequest())
    expect(photo.status).toBe(503); expect((await photo.json()).error).toContain('Digite')
    expect(route.status).toBe(503); expect((await route.json()).error).toContain('Navegar')
  })
  it('never exposes technical errors or provider keys', async () => {
    mocks.photo.mockRejectedValue(new Error('API error with secret-key and internal URL'))
    mocks.route.mockRejectedValue(new Error('API error with secret-key and internal URL'))
    for (const response of [await photoPost(photoRequest()), await routePost(routeRequest())]) {
      expect(response.status).toBe(503)
      const content = await response.text()
      expect(content).not.toContain('secret-key'); expect(content).not.toContain('internal URL')
    }
  })
  it('returns a retryable timeout and handles invalid model output', async () => {
    mocks.route.mockRejectedValue(new DOMException('upstream timeout', 'TimeoutError'))
    expect((await routePost(routeRequest())).status).toBe(504)
    mocks.photo.mockRejectedValue(new Error('incomplete_response'))
    expect((await photoPost(photoRequest())).status).toBe(422)
  })
})
