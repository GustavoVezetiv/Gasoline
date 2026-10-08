class PhotoError extends Error {}

export async function compressPhoto(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new PhotoError('Escolha uma imagem.')
  if (file.size > 12 * 1024 * 1024) throw new PhotoError('A foto deve ter até 12 MB antes da compressão.')
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    try { await image.decode() } catch { throw new PhotoError('Não foi possível abrir essa foto. Tente outra imagem ou use JPEG.') }
    if (!image.naturalWidth || !image.naturalHeight) throw new PhotoError('A foto não contém uma imagem válida.')
    const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(image.naturalWidth * scale)
    canvas.height = Math.round(image.naturalHeight * scale)
    const context = canvas.getContext('2d')
    if (!context) throw new PhotoError('Não foi possível processar a foto.')
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    for (const type of ['image/webp', 'image/jpeg']) {
      for (const quality of [0.85, 0.7, 0.55]) {
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality))
        if (blob?.type === type && blob.size <= 2 * 1024 * 1024) return blob
        if (blob?.type !== type) break
      }
    }
    throw new PhotoError('A foto ficou muito grande. Tente tirar outra de mais perto.')
  } catch (error) {
    if (error instanceof PhotoError) throw error
    throw new PhotoError('Não foi possível preparar essa foto. Tente outra imagem.')
  } finally { URL.revokeObjectURL(url) }
}
