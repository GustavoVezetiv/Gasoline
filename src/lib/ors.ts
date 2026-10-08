import 'server-only'
import { validateRoadRoute, type RoadRoute } from './api-validation'
import type { Coordinates } from './geo'

export async function fetchRoadRoute(origin: Coordinates, destination: Coordinates): Promise<RoadRoute> {
  const apiKey = process.env.ORS_API_KEY
  if (!apiKey) throw new Error('not_configured')
  const response = await fetch('https://api.heigit.org/openrouteservice/v2/directions/driving-car/geojson', {
    method: 'POST',
    headers: { Authorization: apiKey, 'Content-Type': 'application/json', Accept: 'application/geo+json' },
    body: JSON.stringify({ coordinates: [[origin.longitude, origin.latitude], [destination.longitude, destination.latitude]] }),
    signal: AbortSignal.timeout(12000),
    cache: 'no-store',
  })
  if (response.status === 429) throw new Error('rate_limited')
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    if ([2009, 2010].includes(body?.error?.code)) throw new Error('no_route')
    throw new Error('provider_unavailable')
  }
  return validateRoadRoute(await response.json())
}
