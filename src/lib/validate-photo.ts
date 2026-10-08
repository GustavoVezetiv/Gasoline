import 'server-only'
import sharp from 'sharp'
import { RequestError, validImage } from './api-response'

export async function validatePhoto(bytes: Uint8Array, mimeType: 'image/jpeg' | 'image/webp') {
  const invalid = () => new RequestError('Não foi possível abrir essa foto. Escolha outra imagem.')
  if (!validImage(bytes, mimeType)) throw invalid()
  try {
    const image = sharp(bytes, { limitInputPixels: 1600 * 1600, failOn: 'warning' })
    const metadata = await image.metadata()
    if (metadata.format !== mimeType.slice(6) || !metadata.width || !metadata.height || Math.max(metadata.width, metadata.height) > 1600 || (metadata.pages ?? 1) > 1) throw invalid()
    // Decode the bounded image too: a correct header can still hide corrupt pixels.
    await image.raw().toBuffer()
  } catch { throw invalid() }
}
