import { authenticatedRequest } from '@/lib/api-guards'
import { apiError, isStationId, jsonResponse, readBody, RequestError } from '@/lib/api-response'
import { analyzePricePhoto } from '@/lib/gemini'
import { allowRequest } from '@/lib/rate-limit'
import { validatePhoto } from '@/lib/validate-photo'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(request: Request) {
  try {
    const session = await authenticatedRequest(request)
    if (!session) return jsonResponse({ error: 'Entre novamente para identificar os preços.' }, 401)
    const stationId = new URL(request.url).searchParams.get('station')
    if (!isStationId(stationId)) throw new RequestError('Escolha um posto válido.')
    const mimeType = request.headers.get('content-type')?.split(';')[0]
    if (mimeType !== 'image/jpeg' && mimeType !== 'image/webp') throw new RequestError('Escolha uma foto em JPEG ou WebP.', 415)
    const image = await readBody(request, 2 * 1024 * 1024)
    if (!process.env.GEMINI_API_KEY) throw new Error('not_configured')
    if (!allowRequest(`photo:${session.userId}`, 5, 10 * 60 * 1000)) throw new Error('rate_limited')
    await validatePhoto(image, mimeType)
    const { data: station, error } = await session.db.from('stations').select('id').eq('id', stationId).eq('active', true).maybeSingle()
    if (error) throw new Error('station_unavailable')
    if (!station) throw new RequestError('Esse posto não está disponível. Escolha outro.', 404)
    const prices = await analyzePricePhoto(image, mimeType)
    return jsonResponse({ prices })
  } catch (error) { return apiError(error, 'photo') }
}
