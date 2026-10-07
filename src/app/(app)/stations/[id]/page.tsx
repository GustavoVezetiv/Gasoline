import { notFound } from 'next/navigation'
import { StationDetail } from '@/components/station-detail'
import { stationData } from '@/lib/data'

export const dynamic = 'force-dynamic'
export default async function StationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { station, reports, comments, current } = await stationData(id)
  if (!station) notFound()
  return <StationDetail station={station} reports={reports} comments={comments} current={current} />
}
