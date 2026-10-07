'use client'

import Link from 'next/link'
import { ArrowUpRight, List, LocateFixed, Map as MapIcon, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Brand } from './brand'
import { FuelSelector } from './fuel-selector'
import { StationsMap } from './stations-map'
import { useFuelPreference } from '@/lib/fuel-preference'
import { getLocation, haversineKm, type Coordinates } from '@/lib/geo'
import { estimatedTotal, freshness, sortStations, stationsForFuel } from '@/lib/pricing'
import type { PriceReport, Profile, Station } from '@/lib/types'

const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
type SortMode = 'cost' | 'price' | 'distance'

export function StationsExplorer({ stations, latestPrices, profile }: { stations: Station[]; latestPrices: PriceReport[]; profile: Profile | null }) {
  const [fuel, setFuel] = useFuelPreference()
  const [location, setLocation] = useState<Coordinates | null>(null)
  const [locationMessage, setLocationMessage] = useState('Usar minha localização')
  const [mode, setMode] = useState<SortMode>('price')
  const [view, setView] = useState<'list' | 'map'>('list')
  const pricedStations = useMemo(() => stationsForFuel(stations, latestPrices, fuel), [fuel, latestPrices, stations])
  const distances = useMemo(() => new Map(pricedStations.map((station) => [station.id, location ? haversineKm(location, station) : Infinity])), [location, pricedStations])
  const sorted = useMemo(() => sortStations(pricedStations, mode, distances, profile?.vehicle_consumption_km_l ?? null, profile?.default_fill_liters ?? null), [distances, mode, pricedStations, profile])
  const canEstimate = Boolean(location && profile?.vehicle_consumption_km_l && profile?.default_fill_liters)
  const first = sorted[0]
  const second = sorted[1]
  const saving = canEstimate && mode === 'cost' && first?.report && second?.report ? estimatedTotal(second.report.price, distances.get(second.id)!, profile!.vehicle_consumption_km_l!, profile!.default_fill_liters!) - estimatedTotal(first.report.price, distances.get(first.id)!, profile!.vehicle_consumption_km_l!, profile!.default_fill_liters!) : null
  async function locate() {
    setLocationMessage('Buscando localização…')
    try {
      setLocation(await getLocation())
      setLocationMessage('Distâncias aproximadas')
    } catch (error) {
      setLocationMessage(error instanceof Error ? error.message : 'Localização indisponível.')
    }
  }
  function selectMode(next: SortMode) {
    setMode(next)
    if (next !== 'price' && !location) void locate()
  }
  return <main className="shell page explorer-page">
    <header className="topbar"><Brand /><Link className="topbar-action" href="/report" aria-label="Atualizar preço"><Plus size={22} /></Link></header>
    <div className="explorer-heading"><div><p className="eyebrow">EXPLORAR</p><h1>Postos</h1></div><FuelSelector value={fuel} onChange={setFuel} compact /></div>
    <button className="location-row" onClick={locate} type="button"><LocateFixed size={19} /><span>{locationMessage}</span><ArrowUpRight size={17} /></button>
    <div className="view-toggle" role="group" aria-label="Visualização"><button className={view === 'list' ? 'selected' : ''} type="button" onClick={() => setView('list')}><List size={17} /> Lista</button><button className={view === 'map' ? 'selected' : ''} type="button" onClick={() => setView('map')}><MapIcon size={17} /> Mapa</button></div>
    {view === 'map' ? <><StationsMap stations={sorted} location={location} /><p className="footnote">Os valores exibidos correspondem a {fuel === 'gasoline' ? 'gasolina comum' : fuel.replace('_', ' ').toUpperCase()}.</p></> : <>
      <div className="sort-tabs" role="group" aria-label="Ordenar postos"><button className={mode === 'cost' ? 'selected' : ''} onClick={() => selectMode('cost')}>Melhor custo</button><button className={mode === 'price' ? 'selected' : ''} onClick={() => selectMode('price')}>Menor preço</button><button className={mode === 'distance' ? 'selected' : ''} onClick={() => selectMode('distance')}>Mais perto</button></div>
      {mode === 'cost' && !canEstimate && <p className="hint">Para estimar o custo total, <Link href="/profile">configure seu veículo</Link> e permita a localização. Enquanto isso, mostramos os menores preços.</p>}
      {mode === 'distance' && !location && <p className="hint">Permita a localização para ordenar por distância. Enquanto isso, mostramos os menores preços.</p>}
      {saving !== null && saving > 0.05 && <div className="saving">Economia estimada de {money(saving)} frente à próxima opção.</div>}
      <div className="list-heading"><span>{sorted.length} {sorted.length === 1 ? 'posto' : 'postos'}</span><span>{fuel.replace('_', ' ')}</span></div>
      <div className="station-list">{sorted.map((station, index) => {
        const fresh = station.report ? freshness(station.report.created_at) : null
        const distance = distances.get(station.id)
        return <Link href={`/stations/${station.id}`} className="station-row" key={station.id}><div className="station-main"><div className="station-name"><span>{station.name}</span>{index === 0 && station.report && <span className="best-tag">{mode === 'distance' && location ? 'MAIS PERTO' : mode === 'cost' && canEstimate ? 'MELHOR CUSTO' : 'MENOR PREÇO'}</span>}</div><div className="station-meta">{distance !== undefined && Number.isFinite(distance) ? `≈ ${distance.toFixed(1).replace('.', ',')} km` : station.address ?? 'Distância indisponível'}{fresh && <><span aria-hidden="true"> · </span><span className={`freshness ${fresh.level}`}>{fresh.label}</span></>}</div>{station.report?.profiles?.name && <div className="station-by">por {station.report.profiles.name}</div>}</div><div className="station-price">{station.report ? <><strong>{money(station.report.price)}</strong><span>/L</span></> : <span className="no-price">Sem preço</span>}</div></Link>
      })}</div>
      <p className="footnote">Distâncias em linha reta e custos são estimativas. Confira o preço no posto.</p>
    </>}
  </main>
}
