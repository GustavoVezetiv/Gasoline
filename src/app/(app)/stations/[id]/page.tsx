import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowUpRight, MapPin, Plus } from 'lucide-react'
import { stationData } from '@/lib/data'
import { freshness } from '@/lib/pricing'
import { Comments } from '@/components/comments'
import { ReportPhoto } from '@/components/report-photo'
import { StationDistance } from '@/components/station-distance'

export const dynamic = 'force-dynamic'
const fuelLabels: Record<string, string> = { gasoline: 'Gasolina comum', ethanol: 'Etanol', diesel: 'Diesel', diesel_s10: 'Diesel S10' }
export default async function StationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { station, reports, comments, current } = await stationData(id)
  if (!station) notFound()
  const latest = current
  const money = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
  return <main className="shell page detail-page">
    <header className="simple-header"><Link href="/home" aria-label="Voltar"><ArrowLeft /></Link><span>Posto</span><span /></header>
    <div className="detail-title"><p className="eyebrow">POSTO DE COMBUSTÍVEL</p><h1>{station.name}</h1>{station.address && <p>{station.address}</p>}<StationDistance station={station} /></div>
    <div className="detail-price"><span>GASOLINA COMUM</span>{latest ? <><strong>{money(latest.price)}<small>/L</small></strong><p><span className={`freshness ${freshness(latest.created_at).level}`}>{freshness(latest.created_at).label}</span> · por {latest.profiles?.name ?? 'Integrante'}</p></> : <><strong className="no-price">Sem preço</strong><p>Se souber o valor, ajude o grupo a atualizar.</p></>}</div>
    <div className="detail-actions"><Link className="primary-button" href={`/report?station=${id}`}><Plus size={20} /> Atualizar preço</Link><a className="secondary-button" href={`https://www.google.com/maps/search/?api=1&query=${station.latitude},${station.longitude}`} target="_blank" rel="noreferrer"><MapPin size={19} /> Abrir mapa <ArrowUpRight size={16} /></a></div>
    <section className="detail-section"><div className="section-heading"><h2>Histórico recente</h2><span>{reports.length} registros</span></div>{reports.length === 0 ? <p className="muted">Nenhum preço informado ainda.</p> : <div className="history-list">{reports.map((r) => <div className="history-row" key={r.id}><div><strong>{fuelLabels[r.fuel_type]}</strong><span>{new Date(r.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })} · {r.profiles?.name ?? 'Integrante'}</span>{r.photo_path && <ReportPhoto path={r.photo_path} />}</div><b>{money(r.price)}</b></div>)}</div>}</section>
    <Comments stationId={id} initial={comments} />
  </main>
}
