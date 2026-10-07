export type FuelType = 'gasoline' | 'ethanol' | 'diesel' | 'diesel_s10'
export type Profile = { id: string; name: string; vehicle_consumption_km_l: number | null; default_fill_liters: number | null }
export type Station = { id: string; name: string; address: string | null; latitude: number; longitude: number; active: boolean }
export type PriceReport = { id: string; station_id: string; user_id: string; fuel_type: FuelType; price: number; photo_path: string | null; created_at: string; profiles?: { name: string } | null }
export type StationComment = { id: string; station_id: string; user_id: string; comment: string; created_at: string; profiles?: { name: string } | null }
export type StationWithPrice = Station & { report: PriceReport | null }
