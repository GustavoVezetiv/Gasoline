export class RequestError extends Error {
  constructor(message: string, readonly status = 400) { super(message) }
}

export function jsonResponse(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'private, no-store', ...(status === 429 ? { 'Retry-After': '600' } : {}) } })
}

// Read incrementally: Content-Length alone does not protect streamed requests.
export async function readBody(request: Request, maxBytes: number): Promise<Uint8Array> {
  if (Number(request.headers.get('content-length')) > maxBytes) throw new RequestError('O arquivo ou pedido é grande demais.', 413)
  if (!request.body) throw new RequestError('Envie os dados para continuar.')
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > maxBytes) {
        await reader.cancel()
        throw new RequestError('O arquivo ou pedido é grande demais.', 413)
      }
      chunks.push(value)
    }
  } finally { reader.releaseLock() }
  const body = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength }
  return body
}

export function isStationId(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

export function validImage(bytes: Uint8Array, mimeType: string): boolean {
  if (bytes.length < 12) return false
  if (mimeType === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff && bytes.at(-2) === 0xff && bytes.at(-1) === 0xd9
  if (mimeType === 'image/webp') return new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' && new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP'
  return false
}

export function apiError(error: unknown, service: 'photo' | 'route') {
  if (error instanceof RequestError) return jsonResponse({ error: error.message }, error.status)
  const code = error instanceof Error ? error.message : ''
  const name = error instanceof Error ? error.name : ''
  const status = error && typeof error === 'object' && 'status' in error ? error.status : null
  const statusCode = error && typeof error === 'object' && 'statusCode' in error ? error.statusCode : null
  if (code === 'rate_limited' || status === 429 || statusCode === 429) return jsonResponse({ error: 'Muitas solicitações. Tente novamente em alguns minutos.' }, 429)
  if (['TimeoutError', 'AbortError', 'RequestTimeoutError'].includes(name)) return jsonResponse({ error: service === 'photo' ? 'A leitura demorou demais. Tente novamente ou digite os preços.' : 'A rota demorou demais. Tente novamente ou use Navegar.' }, 504)
  if (code === 'not_configured') return jsonResponse({ error: service === 'photo' ? 'A leitura por foto ainda não está disponível. Digite os preços abaixo.' : 'As rotas ainda não estão disponíveis. Use Navegar para abrir o Google Maps.' }, 503)
  if (service === 'photo' && ['empty_response', 'incomplete_response', 'invalid_response', 'invalid_fuel', 'invalid_price'].includes(code)) return jsonResponse({ error: 'Não foi possível identificar os preços com segurança. Tente outra foto ou digite os valores.' }, 422)
  if (code === 'no_route') return jsonResponse({ error: 'Não encontramos uma rota até esse posto. Você pode tentar pelo botão Navegar.' }, 422)
  return jsonResponse({ error: service === 'photo' ? 'Não foi possível ler a foto agora. Tente novamente ou digite os preços.' : 'Não foi possível calcular a rota agora. Tente novamente ou use Navegar.' }, 503)
}
