import { serverClient } from '@/lib/supabase/server'
import { ReportForm } from '@/components/report-form'
import type { Station } from '@/lib/types'

export const dynamic = 'force-dynamic'
export default async function ReportPage({ searchParams }: { searchParams: Promise<{ station?: string }> }) {
  const db = await serverClient()
  const [stations, params] = await Promise.all([db.from('stations').select('id,name,address,latitude,longitude,active').eq('active', true).order('name'), searchParams])
  return <ReportForm stations={(stations.data ?? []) as Station[]} initialStation={params.station} loadError={Boolean(stations.error)} />
}
