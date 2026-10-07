'use client'

import Link from 'next/link'
import { ArrowRight, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Brand } from './brand'
import { FuelSelector } from './fuel-selector'
import { PriceHistoryChart } from './price-history-chart'
import { useFuelPreference } from '@/lib/fuel-preference'
import { fuelLabel } from '@/lib/fuels'
import { historyForPeriod, stationsForFuel } from '@/lib/pricing'
import type { PriceReport, Profile, Station } from '@/lib/types'

const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
const periods = [7, 30, 90] as const

export function HomeSummary({ stations, latestPrices, history, profile }: { stations: Station[]; latestPrices: PriceReport[]; history: PriceReport[]; profile: Profile | null }) {
  const [fuel, setFuel] = useFuelPreference()
  const available = useMemo(() => stationsForFuel(stations, latestPrices, fuel).filter((station) => station.report), [fuel, latestPrices, stations])
  const best = [...available].sort((a, b) => (a.report?.price ?? Infinity) - (b.report?.price ?? Infinity))[0]
  const [stationId, setStationId] = useState('')
  const [days, setDays] = useState<(typeof periods)[number]>(30)
  const selectedStation = stationId || best?.id || stations[0]?.id || ''
  const reports = historyForPeriod(history, selectedStation, fuel, days)
  return <main className="shell page home-page">
    <header className="topbar"><Brand /><Link className="topbar-action" href="/report" aria-label="Atualizar preço"><Plus size={22} /></Link></header>
    <div className="home-heading"><p className="eyebrow">MELHOR OPÇÃO AGORA</p><div><h1>Onde abastecer?</h1><FuelSelector value={fuel} onChange={setFuel} compact /></div></div>
    {best?.report ? <section className="best-option" aria-label="Melhor opção agora">
      <div><span className="best-kicker">MENOR PREÇO</span><h2>{best.name}</h2><p>{best.address ?? 'Endereço não informado'}</p></div>
      <div className="best-price"><strong>{money(best.report.price)}</strong><span>/L</span></div>
      <Link href={`/stations/${best.id}`} className="best-link">Ver posto <ArrowRight size={17} /></Link>
    </section> : <section className="best-option empty"><h2>Sem preço de {fuelLabel(fuel).toLowerCase()}</h2><p>Atualize um posto para ajudar seu grupo.</p><Link href="/report" className="best-link">Atualizar preço <Plus size={17} /></Link></section>}
    <div className="quick-actions"><Link href="/stations">Explorar postos <ArrowRight size={17} /></Link><Link href="/report">Atualizar preço <Plus size={17} /></Link></div>
    <section className="history-section"><div className="section-heading"><div><p className="eyebrow">ACOMPANHE</p><h2>Histórico de preços</h2></div></div>
      <div className="history-filters"><label><span className="visually-hidden">Posto</span><select value={selectedStation} onChange={(event) => setStationId(event.target.value)}><option value="">Selecione um posto</option>{stations.map((station) => <option value={station.id} key={station.id}>{station.name}</option>)}</select></label><span className="history-fuel">{fuelLabel(fuel)}</span></div>
      <div className="period-tabs" role="group" aria-label="Período do histórico">{periods.map((period) => <button type="button" className={days === period ? 'selected' : ''} onClick={() => setDays(period)} key={period}>{period} dias</button>)}</div>
      <PriceHistoryChart reports={reports} />
    </section>
    {profile?.vehicle_consumption_km_l && profile.default_fill_liters ? <p className="footnote">Configure distância na aba Postos para comparar o custo total da viagem.</p> : <p className="footnote">Configure seu veículo no Perfil para comparar o custo total nos postos.</p>}
  </main>
}
