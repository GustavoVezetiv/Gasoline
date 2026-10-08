import { authenticatedRequest } from '@/lib/api-guards'
import { apiError, isStationId, jsonResponse, readBody, RequestError } from '@/lib/api-response'
import { validCoordinates } from '@/lib/api-validation'
import { fetchRoadRoute } from '@/lib/ors'
import { allowRequest } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const maxDuration = 25

export async function POST(request: Request) {
  try {
    const session = await authenticatedRequest(request)
    if (!session) return jsonResponse({ error: 'Entre novamente para traçar uma rota.' }, 401)
    if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') throw new RequestError('Envie uma origem e um posto válidos.', 415)
    const raw = await readBody(request, 4096)
    let body: unknown
    try { body = JSON.parse(new TextDecoder().decode(raw)) } catch { throw new RequestError('Envie uma origem e um posto válidos.') }
    if (!body || typeof body !== 'object' || !('origin' in body) || !('stationId' in body) || !validCoordinates(body.origin) || !isStationId(body.stationId)) throw new RequestError('Não foi possível usar essa localização ou posto.')
    if (!process.env.ORS_API_KEY) throw new Error('not_configured')
    if (!allowRequest(`route:${session.userId}`, 20, 10 * 60 * 1000)) throw new Error('rate_limited')
    const { data: station, error } = await session.db.from('stations').select('id, latitude, longitude').eq('id', body.stationId).eq('active', true).maybeSingle()
    if (error) throw new Error('station_unavailable')
    if (!station || !validCoordinates(station)) throw new RequestError('Esse posto não está disponível. Escolha outro.', 404)
    return jsonResponse(await fetchRoadRoute(body.origin, station))
  } catch (error) { return apiError(error, 'route') }
}
