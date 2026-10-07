import { describe, expect, it } from 'vitest'
import { haversineKm } from './geo'
import { estimatedTotal, freshness, historyForPeriod, latestReports, parsePrice, priceStats, sortStations, stationsForFuel } from './pricing'
import { priceCandidates } from './ocr'
import type { PriceReport } from './types'

describe('distance and cost', () => {
  it('calculates Haversine distance in kilometers', () => {
    expect(haversineKm({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 })).toBeCloseTo(111.19, 1)
    expect(haversineKm({ latitude: -15.6, longitude: -56.1 }, { latitude: -15.6, longitude: -56.1 })).toBe(0)
  })
  it('includes round trip fuel cost', () => expect(estimatedTotal(5.8, 2, 10, 30)).toBeCloseTo(176.32))
})

describe('price reports', () => {
  const report = (id: string, created_at: string, fuel_type: PriceReport['fuel_type'] = 'gasoline'): PriceReport => ({ id, station_id: 's1', user_id: 'u1', fuel_type, price: 5.8, photo_path: null, created_at })
  it('selects the latest per station and fuel even when input is unordered', () => {
    const latest = latestReports([report('new', '2026-10-06T10:00:00Z'), report('ethanol', '2026-10-01T10:00:00Z', 'ethanol'), report('old', '2026-10-01T10:00:00Z')])
    expect(latest.get('s1:gasoline')?.id).toBe('new')
    expect(latest.get('s1:ethanol')?.id).toBe('ethanol')
  })
  it('uses the selected fuel when preparing station rows', () => {
    const stations = [{ id: 's1', name: 'A', address: null, latitude: 0, longitude: 0, active: true }]
    const reports = [report('gas', '2026-10-01T10:00:00Z'), { ...report('eth', '2026-10-02T10:00:00Z', 'ethanol'), price: 3.89 }]
    expect(stationsForFuel(stations, reports, 'ethanol')[0].report?.id).toBe('eth')
    expect(stationsForFuel(stations, reports, 'diesel')[0].report).toBeNull()
  })
  it('filters history by station, fuel, and selected period', () => {
    const reports = [report('old', '2026-07-01T10:00:00Z'), report('recent', '2026-10-01T10:00:00Z'), report('ethanol', '2026-10-02T10:00:00Z', 'ethanol'), { ...report('other', '2026-10-03T10:00:00Z'), station_id: 's2' }]
    const history = historyForPeriod(reports, 's1', 'gasoline', 30, new Date('2026-10-06T00:00:00Z'))
    expect(history.map((item) => item.id)).toEqual(['recent'])
    expect(priceStats(history)).toEqual({ current: 5.8, min: 5.8, max: 5.8, variation: 0 })
  })
  it('labels freshness without relying on color', () => {
    const now = new Date('2026-10-06T12:00:00Z')
    expect(freshness('2026-10-06T10:00:00Z', now)).toEqual({ label: 'há 2 h', level: 'fresh' })
    expect(freshness('2026-10-01T12:00:00Z', now)).toEqual({ label: 'há 5 dias', level: 'old' })
    expect(freshness('2026-09-18T12:00:00Z', now).level).toBe('stale')
  })
  it('normalizes and rejects invalid prices', () => {
    expect(parsePrice(' 5,79 ')).toBe(5.79)
    expect(parsePrice('5.799')).toBe(5.799)
    expect(parsePrice('0,99')).toBeNull()
    expect(parsePrice('5,7')).toBeNull()
    expect(parsePrice('abc')).toBeNull()
  })
})

it('extracts distinct plausible OCR candidates', () => {
  expect(priceCandidates('GASOLINA R$ 5,79\nETANOL 3.89\n5,79\n999,99')).toEqual([5.79, 3.89])
})

it('falls back to price when distance is unavailable', () => {
  const stations = [
    { id: 'a', name: 'A', address: null, latitude: 0, longitude: 0, active: true, report: { id: 'r1', station_id: 'a', user_id: 'u', fuel_type: 'gasoline' as const, price: 5.9, photo_path: null, created_at: '2026-10-06T00:00:00Z' } },
    { id: 'b', name: 'B', address: null, latitude: 0, longitude: 0, active: true, report: { id: 'r2', station_id: 'b', user_id: 'u', fuel_type: 'gasoline' as const, price: 5.7, photo_path: null, created_at: '2026-10-06T00:00:00Z' } },
  ]
  expect(sortStations(stations, 'distance', new Map(), null, null)[0].id).toBe('b')
})
