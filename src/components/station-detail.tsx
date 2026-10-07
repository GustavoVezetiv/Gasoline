'use client'

import Link from 'next/link'
import { ArrowLeft, ArrowUpRight, MapPin, Plus } from 'lucide-react'
import { useMemo } from 'react'
import { Comments } from './comments'
import { FuelSelector } from './fuel-selector'
import { PriceHistoryChart } from './price-history-chart'
import { ReportPhoto } from './report-photo'
import { StationDistance } from './station-distance'
import { useFuelPreference } from '@/lib/fuel-preference'
import { fuelLabel, fuelOptions } from '@/lib/fuels'
import { freshness, historyForPeriod, latestReports } from '@/lib/pricing'
import type { PriceReport, Station, StationComment } from '@/lib/types'

const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

export function StationDetail({ station, reports, comments, current }: { station: Station; reports: PriceReport[]; comments: StationComment[]; current: PriceReport[] }) {
  const [fuel, setFuel] = useFuelPreference()
  const latest = useMemo(() => latestReports(current), [current])
  const selected = latest.get(`${station.id}:${fuel}`) ?? null
  const filtered = useMemo(() => reports.filter((report) => report.fuel_type === fuel), [fuel, reports])
  const chartReports = useMemo(() => historyForPeriod(reports, station.id, fuel, 90), [fuel, reports, station.id])
  return <main className="shell page detail-page">
    <header className="simple-header"><Link href="/stations" aria-label="Voltar"><ArrowLeft /></Link><span>Posto</span><span /></header>
    <div className="detail-title"><p className="eyebrow">POSTO DE COMBUSTÍVEL</p><h1>{station.name}</h1>{station.address && <p>{station.address}</p>}<StationDistance station={station} /></div>
    <div className="detail-price"><div className="detail-price-label"><span>{fuelLabel(fuel).toUpperCase()}</span><FuelSelector value={fuel} onChange={setFuel} compact /></div>{selected ? <><strong>{money(selected.price)}<small>/L</small></strong><p><span className={`freshness ${freshness(selected.created_at).level}`}>{freshness(selected.created_at).label}</span> · por {selected.profiles?.name ?? 'Integrante'}</p></> : <><strong className="no-price">Sem preço</strong><p>Se souber o valor, ajude o grupo a atualizar.</p></>}</div>
    <div className="detail-actions"><Link className="primary-button" href={`/report?station=${station.id}`}><Plus size={20} /> Atualizar preço</Link><a className="secondary-button" href={`https://www.google.com/maps/search/?api=1&query=${station.latitude},${station.longitude}`} target="_blank" rel="noreferrer"><MapPin size={19} /> Abrir mapa <ArrowUpRight size={16} /></a></div>
    <section className="detail-section"><div className="section-heading"><h2>Preços atuais</h2><span>por litro</span></div><div className="fuel-price-grid">{fuelOptions.map((option) => { const report = latest.get(`${station.id}:${option.value}`); return <button className={fuel === option.value ? 'selected' : ''} type="button" onClick={() => setFuel(option.value)} key={option.value}><span>{option.shortLabel}</span><strong>{report ? money(report.price) : 'Sem preço'}</strong>{report && <small>{freshness(report.created_at).label}</small>}</button> })}</div></section>
    <section className="detail-section"><div className="section-heading"><h2>Histórico</h2><span>{fuelLabel(fuel)}</span></div><PriceHistoryChart reports={chartReports} emptyLabel={`Ainda não há histórico de ${fuelLabel(fuel).toLowerCase()}.`} /><div className="history-list">{filtered.length === 0 ? <p className="muted">Nenhum preço informado para este combustível.</p> : filtered.map((report) => <div className="history-row" key={report.id}><div><strong>{fuelLabel(report.fuel_type)}</strong><span>{new Date(report.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })} · {report.profiles?.name ?? 'Integrante'}</span>{report.photo_path && <ReportPhoto path={report.photo_path} />}</div><b>{money(report.price)}</b></div>)}</div></section>
    <Comments stationId={station.id} initial={comments} />
  </main>
}
