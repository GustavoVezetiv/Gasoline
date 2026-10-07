import { serverClient } from './supabase/server'
import { latestReports } from './pricing'
import type { PriceReport, Profile, Station, StationComment, StationWithPrice } from './types'

export async function homeData(userId: string) {
  const db = await serverClient()
  const [stationsResult, pricesResult, profilesResult, profileResult] = await Promise.all([
    db.from('stations').select('id,name,address,latitude,longitude,active').eq('active', true).order('name'),
    db.from('latest_prices').select('id,station_id,user_id,fuel_type,price,photo_path,created_at').eq('fuel_type', 'gasoline'),
    db.from('profiles').select('id,name'),
    db.from('profiles').select('id,name,vehicle_consumption_km_l,default_fill_liters').eq('id', userId).maybeSingle(),
  ])
  const error = stationsResult.error || pricesResult.error || profilesResult.error || profileResult.error
  if (error) throw new Error(error.message)
  const names = new Map((profilesResult.data ?? []).map((p) => [p.id, p.name]))
  const reports = (pricesResult.data ?? []).map((p) => ({ ...p, price: Number(p.price), profiles: { name: names.get(p.user_id) ?? 'Integrante' } })) as PriceReport[]
  const latest = latestReports(reports)
  const stations = (stationsResult.data ?? []).map((s) => ({ ...s, report: latest.get(`${s.id}:gasoline`) ?? null })) as StationWithPrice[]
  return { stations, profile: (profileResult.data as Profile | null) ?? null }
}

export async function stationData(id: string) {
  const db = await serverClient()
  const [station, reports, comments, profiles, current] = await Promise.all([
    db.from('stations').select('id,name,address,latitude,longitude,active').eq('id', id).eq('active', true).maybeSingle(),
    db.from('price_reports').select('id,station_id,user_id,fuel_type,price,photo_path,created_at').eq('station_id', id).order('created_at', { ascending: false }).limit(30),
    db.from('station_comments').select('id,station_id,user_id,comment,created_at').eq('station_id', id).order('created_at', { ascending: false }).limit(30),
    db.from('profiles').select('id,name'),
    db.from('latest_prices').select('id,station_id,user_id,fuel_type,price,photo_path,created_at').eq('station_id', id).eq('fuel_type', 'gasoline').maybeSingle(),
  ])
  const error = station.error || reports.error || comments.error || profiles.error || current.error
  if (error) throw new Error(error.message)
  const names = new Map((profiles.data ?? []).map((p) => [p.id, p.name]))
  return {
    station: station.data as Station | null,
    reports: (reports.data ?? []).map((p) => ({ ...p, price: Number(p.price), profiles: { name: names.get(p.user_id) ?? 'Integrante' } })) as PriceReport[],
    comments: (comments.data ?? []).map((c) => ({ ...c, profiles: { name: names.get(c.user_id) ?? 'Integrante' } })) as StationComment[],
    current: current.data ? ({ ...current.data, price: Number(current.data.price), profiles: { name: names.get(current.data.user_id) ?? 'Integrante' } } as PriceReport) : null,
  }
}
