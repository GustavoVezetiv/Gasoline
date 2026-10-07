'use client'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ArrowUpRight, LocateFixed, Plus } from 'lucide-react'
import { Brand } from './brand'
import { getLocation, haversineKm, type Coordinates } from '@/lib/geo'
import { estimatedTotal, freshness, sortStations } from '@/lib/pricing'
import type { Profile, StationWithPrice } from '@/lib/types'

const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
export function HomeList({ stations, profile, title = 'Onde abastecer?', showIntro = true }: { stations: StationWithPrice[]; profile: Profile | null; title?: string; showIntro?: boolean }) {
  const [location, setLocation] = useState<Coordinates | null>(null)
  const [locationMessage, setLocationMessage] = useState('Usar minha localização')
  const [mode, setMode] = useState<'cost' | 'price' | 'distance'>('price')
  const distances = useMemo(() => new Map(stations.map((station) => [station.id, location ? haversineKm(location, station) : Infinity])), [stations, location])
  const sorted = useMemo(() => sortStations(stations, mode, distances, profile?.vehicle_consumption_km_l ?? null, profile?.default_fill_liters ?? null), [stations, mode, distances, profile])
  const canEstimate = Boolean(location && profile?.vehicle_consumption_km_l && profile?.default_fill_liters)
  const first = sorted[0], second = sorted[1]
  const saving = canEstimate && mode === 'cost' && first?.report && second?.report ? estimatedTotal(second.report.price, distances.get(second.id)!, profile!.vehicle_consumption_km_l!, profile!.default_fill_liters!) - estimatedTotal(first.report.price, distances.get(first.id)!, profile!.vehicle_consumption_km_l!, profile!.default_fill_liters!) : null
  async function locate() {
    setLocationMessage('Buscando localização…')
    try { setLocation(await getLocation()); setLocationMessage('Distâncias aproximadas') }
    catch (error) { setLocationMessage(error instanceof Error ? error.message : 'Localização indisponível.') }
  }
  function selectMode(next: 'cost' | 'price' | 'distance') {
    setMode(next)
    if (next !== 'price' && !location) void locate()
  }
  return <main className="shell page">
    <header className="topbar"><Brand /><Link className="topbar-action" href="/report" aria-label="Atualizar preço"><Plus size={22} /></Link></header>
    {showIntro && <div className="intro"><p className="eyebrow">SEU GRUPO, SEUS PREÇOS</p><h1>{title}</h1><p>Encontre a melhor opção sem perder tempo.</p></div>}
    {!showIntro && <h1 className="section-title">{title}</h1>}
    <button className="location-row" onClick={locate} type="button"><LocateFixed size={19} /><span>{locationMessage}</span><ArrowUpRight size={17} /></button>
    <div className="sort-tabs" role="group" aria-label="Ordenar postos">
      <button className={mode === 'cost' ? 'selected' : ''} onClick={() => selectMode('cost')}>Melhor custo</button>
      <button className={mode === 'price' ? 'selected' : ''} onClick={() => selectMode('price')}>Mais barato</button>
      <button className={mode === 'distance' ? 'selected' : ''} onClick={() => selectMode('distance')}>Mais perto</button>
    </div>
    {mode === 'cost' && !canEstimate && <p className="hint">Para estimar o custo total, <Link href="/profile">configure seu veículo</Link> e permita a localização. Enquanto isso, mostramos os menores preços.</p>}
    {mode === 'distance' && !location && <p className="hint">Permita a localização para ordenar por distância. Enquanto isso, mostramos os menores preços.</p>}
    {saving !== null && saving > 0.05 && <div className="saving">Economia estimada de {money(saving)} frente à próxima opção.</div>}
    <div className="list-heading"><span>{stations.length} {stations.length === 1 ? 'posto' : 'postos'}</span><span>GASOLINA COMUM</span></div>
    {stations.length === 0 && <div className="empty-state"><h2>Nenhum posto por aqui ainda</h2><p>Cadastre os postos no Supabase para começar.</p></div>}
    <div className="station-list">{sorted.map((station, index) => {
      const fresh = station.report ? freshness(station.report.created_at) : null
      const distance = distances.get(station.id)
      return <Link href={`/stations/${station.id}`} className="station-row" key={station.id}>
        <div className="station-main"><div className="station-name"><span>{station.name}</span>{index === 0 && station.report && <span className="best-tag">{mode === 'distance' && location ? 'MAIS PERTO' : mode === 'cost' && canEstimate ? 'MELHOR CUSTO' : 'MENOR PREÇO'}</span>}</div><div className="station-meta">{distance !== undefined && Number.isFinite(distance) ? `≈ ${distance.toFixed(1).replace('.', ',')} km` : station.address ?? 'Distância indisponível'}{fresh ? <> <span aria-hidden="true">·</span> <span className={`freshness ${fresh.level}`}>{fresh.label}</span></> : null}</div>{station.report?.profiles?.name && <div className="station-by">por {station.report.profiles.name}</div>}</div>
        <div className="station-price">{station.report ? <><strong>{money(station.report.price)}</strong><span>/L</span></> : <span className="no-price">Sem preço</span>}</div>
      </Link>
    })}</div>
    <p className="footnote">Distâncias em linha reta e custos são estimativas. Confira o preço no posto.</p>
  </main>
}
