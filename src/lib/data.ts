import { serverClient } from './supabase/server'
import type { PriceReport, Profile, Station, StationComment } from './types'

function mapReports(rows: unknown[], names: Map<string, string>): PriceReport[] {
  return rows.map((row) => {
    const report = row as Omit<PriceReport, 'price' | 'profiles'> & { price: string | number }
    return { ...report, price: Number(report.price), profiles: { name: names.get(report.user_id) ?? 'Integrante' } }
  }) as PriceReport[]
}

export async function homeData(userId: string) {
  const db = await serverClient()
  const historyStart = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  const [stationsResult, pricesResult, historyResult, profilesResult, profileResult] = await Promise.all([
    db.from('stations').select('id,name,address,latitude,longitude,active').eq('active', true).order('name'),
    db.from('latest_prices').select('id,station_id,user_id,fuel_type,price,photo_path,created_at'),
    db.from('price_reports').select('id,station_id,user_id,fuel_type,price,photo_path,created_at').gte('created_at', historyStart).order('created_at').limit(1000),
    db.from('profiles').select('id,name'),
    db.from('profiles').select('id,name,vehicle_consumption_km_l,default_fill_liters').eq('id', userId).maybeSingle(),
  ])
  const error = stationsResult.error || pricesResult.error || historyResult.error || profilesResult.error || profileResult.error
  if (error) throw new Error(error.message)
  const names = new Map((profilesResult.data ?? []).map((p) => [p.id, p.name]))
  return {
    stations: (stationsResult.data ?? []) as Station[],
    latestPrices: mapReports(pricesResult.data ?? [], names),
    history: mapReports(historyResult.data ?? [], names),
    profile: (profileResult.data as Profile | null) ?? null,
  }
}

export async function stationData(id: string) {
  const db = await serverClient()
  const [station, reports, comments, profiles, current] = await Promise.all([
    db.from('stations').select('id,name,address,latitude,longitude,active').eq('id', id).eq('active', true).maybeSingle(),
    db.from('price_reports').select('id,station_id,user_id,fuel_type,price,photo_path,created_at').eq('station_id', id).order('created_at', { ascending: false }).limit(100),
    db.from('station_comments').select('id,station_id,user_id,comment,created_at').eq('station_id', id).order('created_at', { ascending: false }).limit(30),
    db.from('profiles').select('id,name'),
    db.from('latest_prices').select('id,station_id,user_id,fuel_type,price,photo_path,created_at').eq('station_id', id),
  ])
  const error = station.error || reports.error || comments.error || profiles.error || current.error
  if (error) throw new Error(error.message)
  const names = new Map((profiles.data ?? []).map((p) => [p.id, p.name]))
  return {
    station: station.data as Station | null,
    reports: mapReports(reports.data ?? [], names),
    comments: (comments.data ?? []).map((c) => ({ ...c, profiles: { name: names.get(c.user_id) ?? 'Integrante' } })) as StationComment[],
    current: mapReports(current.data ?? [], names),
  }
}
