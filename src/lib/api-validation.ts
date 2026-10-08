import { parsePrice } from './pricing'
import { isFuelType } from './fuels'
import type { FuelType } from './types'

export type IdentifiedPrice = { fuel_type: FuelType; price: number; confidence: number }
export type RoadRoute = { coordinates: [number, number][]; distanceKm: number; durationMinutes: number }

export function validateIdentifiedPrices(value: unknown): IdentifiedPrice[] {
  if (!value || typeof value !== 'object' || !('prices' in value) || !Array.isArray(value.prices)) throw new Error('invalid_response')
  if (value.prices.length > 4) throw new Error('invalid_response')
  const seen = new Set<FuelType>()
  return value.prices.map((item: unknown) => {
    if (!item || typeof item !== 'object' || !('fuel_type' in item) || !('price' in item) || !('confidence' in item)) throw new Error('invalid_response')
    const { fuel_type, price, confidence } = item
    if (typeof fuel_type !== 'string' || !isFuelType(fuel_type) || seen.has(fuel_type)) throw new Error('invalid_fuel')
    if (typeof price !== 'number' || !Number.isFinite(price) || Math.abs(price * 1000 - Math.round(price * 1000)) > 0.000001 || parsePrice(price.toFixed(3)) === null) throw new Error('invalid_price')
    if (typeof confidence !== 'number' || !Number.isFinite(confidence) || confidence < 0 || confidence > 1) throw new Error('invalid_response')
    seen.add(fuel_type)
    return { fuel_type, price, confidence }
  }).filter((item) => item.confidence >= 0.8)
}

export function validCoordinates(value: unknown): value is { latitude: number; longitude: number } {
  if (!value || typeof value !== 'object') return false
  const point = value as Record<string, unknown>
  return typeof point.latitude === 'number' && Number.isFinite(point.latitude) && point.latitude >= -90 && point.latitude <= 90 && typeof point.longitude === 'number' && Number.isFinite(point.longitude) && point.longitude >= -180 && point.longitude <= 180
}

export function validateRoadRoute(value: unknown): RoadRoute {
  if (!value || typeof value !== 'object' || !('features' in value) || !Array.isArray(value.features) || !value.features.length) throw new Error('no_route')
  const feature = value.features[0]
  const raw = feature?.geometry?.coordinates
  const summary = feature?.properties?.summary
  if (feature?.geometry?.type !== 'LineString' || !Array.isArray(raw) || raw.length < 2 || raw.length > 10000 || !summary || typeof summary.distance !== 'number' || !Number.isFinite(summary.distance) || summary.distance < 0 || typeof summary.duration !== 'number' || !Number.isFinite(summary.duration) || summary.duration < 0) throw new Error('no_route')
  const coordinates: [number, number][] = raw.map((point: unknown) => {
    if (!Array.isArray(point) || point.length < 2 || !validCoordinates({ longitude: point[0], latitude: point[1] })) throw new Error('no_route')
    return [point[0], point[1]]
  })
  return { coordinates, distanceKm: summary.distance / 1000, durationMinutes: summary.duration / 60 }
}

export function googleMapsUrl(latitude: number, longitude: number): string {
  if (!validCoordinates({ latitude, longitude })) throw new Error('invalid_coordinates')
  return `https://www.google.com/maps/dir/?api=1&destination=${latitude}%2C${longitude}&travelmode=driving&dir_action=navigate`
}
