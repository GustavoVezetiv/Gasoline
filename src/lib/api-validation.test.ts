import { describe, expect, it } from 'vitest'
import { googleMapsUrl, validCoordinates, validateIdentifiedPrices, validateRoadRoute } from './api-validation'
import { readBody, validImage } from './api-response'
import { allowRequest, resetRateLimits } from './rate-limit'

describe('photo response validation', () => {
  const price = { fuel_type: 'diesel_s10', price: 6.199, confidence: 0.95 }
  it('keeps three decimal places and the fuel association', () => expect(validateIdentifiedPrices({ prices: [price] })).toEqual([price]))
  it('accepts no confident findings', () => expect(validateIdentifiedPrices({ prices: [] })).toEqual([]))
  it('omits low confidence associations', () => expect(validateIdentifiedPrices({ prices: [{ ...price, confidence: 0.4 }] })).toEqual([]))
  it.each([null, {}, { prices: {} }, { prices: [{ price: 5.99 }] }, { prices: [price, price] }])('rejects incomplete or duplicate data: %j', (data) => expect(() => validateIdentifiedPrices(data)).toThrow())
  it.each([
    { fuel_type: 'premium' }, { price: '6,19' }, { price: 0.99 }, { price: 20.001 },
    { price: 6.1234 }, { price: Infinity }, { confidence: -1 }, { confidence: 1.1 },
  ])('rejects invalid domain values: %j', (patch) => expect(() => validateIdentifiedPrices({ prices: [{ ...price, ...patch }] })).toThrow())
})

describe('route validation and links', () => {
  it.each([null, {}, { latitude: '10', longitude: 10 }, { latitude: 91, longitude: 10 }, { latitude: 0, longitude: -181 }, { latitude: NaN, longitude: 0 }])('rejects invalid coordinates: %j', (value) => expect(validCoordinates(value)).toBe(false))
  it('accepts zero and boundary coordinates', () => {
    expect(validCoordinates({ latitude: 0, longitude: 0 })).toBe(true)
    expect(validCoordinates({ latitude: -90, longitude: 180 })).toBe(true)
  })
  it('converts meters to kilometers and seconds to minutes', () => {
    expect(validateRoadRoute({ features: [{ geometry: { type: 'LineString', coordinates: [[-56.1, -15.6], [-56.11, -15.61]] }, properties: { summary: { distance: 1250, duration: 150 } } }] })).toEqual({ coordinates: [[-56.1, -15.6], [-56.11, -15.61]], distanceKm: 1.25, durationMinutes: 2.5 })
  })
  it.each([{}, { features: [] }, { features: [{ geometry: { type: 'Polygon', coordinates: [] } }] }, { features: [{ geometry: { type: 'LineString', coordinates: [[-190, 0], [0, 0]] }, properties: { summary: { distance: 10, duration: 1 } } }] }])('rejects missing or invalid roads: %j', (data) => expect(() => validateRoadRoute(data)).toThrow('no_route'))
  it('creates navigation URLs with latitude before longitude and no key', () => {
    const url = new URL(googleMapsUrl(-15.6, -56.1))
    expect(url.origin + url.pathname).toBe('https://www.google.com/maps/dir/')
    expect(Object.fromEntries(url.searchParams)).toEqual({ api: '1', destination: '-15.6,-56.1', travelmode: 'driving', dir_action: 'navigate' })
    expect(() => googleMapsUrl(100, 0)).toThrow()
  })
})

describe('request limits', () => {
  it('bounds actual streamed bytes even without Content-Length', async () => {
    await expect(readBody(new Request('http://localhost', { method: 'POST', body: '123456' }), 5)).rejects.toMatchObject({ status: 413 })
  })
  it('rejects a spoofed image MIME type', () => expect(validImage(new TextEncoder().encode('this is not an image'), 'image/jpeg')).toBe(false))
  it('isolates users and resets a consumed window', () => {
    resetRateLimits()
    expect(allowRequest('u1', 1, 1000, 100)).toBe(true)
    expect(allowRequest('u1', 1, 1000, 101)).toBe(false)
    expect(allowRequest('u2', 1, 1000, 101)).toBe(true)
    expect(allowRequest('u1', 1, 1000, 1100)).toBe(true)
  })
})
