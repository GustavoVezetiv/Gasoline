import type { PriceReport, StationWithPrice } from './types'

export function latestReports(reports: PriceReport[]): Map<string, PriceReport> {
  const result = new Map<string, PriceReport>()
  for (const report of reports) {
    const key = `${report.station_id}:${report.fuel_type}`
    if (!result.has(key) || new Date(report.created_at).getTime() > new Date(result.get(key)!.created_at).getTime()) result.set(key, report)
  }
  return result
}

export function freshness(iso: string, now = new Date()): { label: string; level: 'fresh' | 'okay' | 'old' | 'stale' } {
  const hours = Math.max(0, (now.getTime() - new Date(iso).getTime()) / 3600000)
  if (hours < 1) return { label: 'agora há pouco', level: 'fresh' }
  if (hours < 24) return { label: `há ${Math.floor(hours)} h`, level: 'fresh' }
  const days = Math.floor(hours / 24)
  if (days === 1) return { label: 'ontem', level: 'okay' }
  return { label: `há ${days} dias`, level: days <= 3 ? 'okay' : days <= 7 ? 'old' : 'stale' }
}

export function estimatedTotal(price: number, distanceKm: number, consumptionKmL: number, fillLiters: number): number {
  return price * (fillLiters + (2 * distanceKm) / consumptionKmL)
}

export function parsePrice(value: string): number | null {
  const normalized = value.trim().replace(/\s/g, '').replace(',', '.')
  if (!/^\d{1,2}\.\d{2,3}$/.test(normalized)) return null
  const price = Number(normalized)
  return price >= 1 && price <= 20 ? price : null
}

export function sortStations(items: StationWithPrice[], mode: 'cost' | 'price' | 'distance', distances: Map<string, number>, consumption: number | null, liters: number | null) {
  return [...items].sort((a, b) => {
    const da = distances.get(a.id) ?? Infinity, db = distances.get(b.id) ?? Infinity
    if (mode === 'distance' && Number.isFinite(da) && Number.isFinite(db)) return da - db
    const pa = a.report?.price ?? Infinity, pb = b.report?.price ?? Infinity
    if (mode === 'cost' && consumption && liters && Number.isFinite(da) && Number.isFinite(db)) return estimatedTotal(pa, da, consumption, liters) - estimatedTotal(pb, db, consumption, liters)
    return pa - pb || da - db
  })
}
