import { parsePrice } from './pricing'

export function priceCandidates(text: string): number[] {
  const matches = text.match(/(?:R\$\s*)?\d{1,2}[,.]\d{2,3}/g) ?? []
  return [...new Set(matches.map((match) => parsePrice(match.replace(/R\$\s*/, ''))).filter((value): value is number => value !== null))]
}

export async function recognizePrices(image: Blob): Promise<number[]> {
  const { recognize } = await import('tesseract.js')
  const result = await recognize(image, 'eng')
  return priceCandidates(result.data.text)
}
