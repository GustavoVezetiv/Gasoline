'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { getLocation, haversineKm, type Coordinates } from '@/lib/geo'
import { googleMapsUrl, type RoadRoute } from '@/lib/api-validation'
import { freshness } from '@/lib/pricing'
import type { StationWithPrice } from '@/lib/types'

const LeafletMap = dynamic(() => import('./stations-map-leaflet').then((module) => module.StationsMapLeaflet), {
  ssr: false,
  loading: () => <div className="map-loading" role="status">Carregando mapa…</div>,
})

const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 3 })

export function StationsMap({ stations, location, onLocation }: { stations: StationWithPrice[]; location: Coordinates | null; onLocation: (value: Coordinates) => void }) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [route, setRoute] = useState<{ stationId: string; origin: Coordinates; data: RoadRoute } | null>(null)
  const [routeMessage, setRouteMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const request = useRef<AbortController | null>(null)
  const panel = useRef<HTMLDivElement>(null)
  const selected = stations.find((station) => station.id === selectedId)
  const roadRoute = route?.stationId === selectedId && route?.origin.latitude === location?.latitude && route?.origin.longitude === location?.longitude ? route?.data ?? null : null
  const distance = selected && location ? haversineKm(location, selected) : null
  useEffect(() => () => { request.current?.abort(); request.current = null }, [])
  useEffect(() => { if (selectedId) panel.current?.scrollIntoView({ block: 'nearest' }) }, [selectedId])

  function selectStation(id: string | null) {
    if (id === selectedId) return
    request.current?.abort(); request.current = null
    setLoading(false); setRoute(null); setRouteMessage(''); setSelectedId(id)
  }
  async function traceRoute() {
    if (!selected || request.current) return
    const controller = new AbortController()
    request.current = controller
    setLoading(true); setRoute(null); setRouteMessage(location ? 'Calculando rota…' : 'Buscando sua localização…')
    let timeout: number | undefined
    try {
      const origin = location ?? await getLocation()
      if (controller.signal.aborted) return
      onLocation(origin)
      setRouteMessage('Calculando rota…')
      timeout = window.setTimeout(() => controller.abort(), 18000)
      const response = await fetch('/api/route', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin, stationId: selected.id }), signal: controller.signal,
      })
      const result = await response.json()
      if (controller.signal.aborted) return
      if (!response.ok) {
        setRouteMessage(typeof result.error === 'string' ? result.error : 'Rota indisponível. Use Navegar para continuar.')
        return
      }
      setRoute({ stationId: selected.id, origin, data: result as RoadRoute }); setRouteMessage('')
    } catch (error) {
      if (request.current !== controller) return
      setRouteMessage(controller.signal.aborted ? 'A rota demorou demais. Tente novamente ou use Navegar.' : !location && error instanceof Error && error.message.toLowerCase().includes('localização') ? `${error.message} Você pode usar Navegar.` : 'Não foi possível traçar a rota. Verifique a conexão ou use Navegar.')
    } finally {
      window.clearTimeout(timeout)
      if (request.current === controller) { request.current = null; setLoading(false) }
    }
  }

  return <section aria-label="Postos no mapa">
    <LeafletMap stations={stations} location={location} selectedId={selectedId} onSelect={selectStation} route={roadRoute} />
    {selected ? <div ref={panel} className="map-station-panel" aria-label={`Posto selecionado: ${selected.name}`}>
      <div className="map-panel-heading"><h2>{selected.name}</h2><button type="button" className="map-close" aria-label="Fechar posto selecionado" onClick={() => selectStation(null)}><X size={19} /></button></div>
      <div className="map-panel-price"><strong>{selected.report ? money(selected.report.price) : 'Sem preço'}</strong>{selected.report && <><span>/L</span><span className={`freshness ${freshness(selected.report.created_at).level}`}>{freshness(selected.report.created_at).label}</span></>}</div>
      <p className="map-distance" role="status">{roadRoute ? `${roadRoute.distanceKm.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km por ruas · cerca de ${Math.max(1, Math.round(roadRoute.durationMinutes))} min de carro` : distance !== null ? `≈ ${distance.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km em linha reta` : 'Trace uma rota para ver a distância.'}</p>
      {routeMessage && <p className="hint" role="status">{routeMessage}</p>}
      <div className="map-panel-actions">
        <Link className="secondary-button" href={`/stations/${selected.id}`}>Ver posto</Link>
        <button type="button" className="primary-button" disabled={loading} onClick={traceRoute}>{loading ? 'Buscando…' : 'Traçar rota'}</button>
        <a className="secondary-button" href={googleMapsUrl(selected.latitude, selected.longitude)} target="_blank" rel="noreferrer">Navegar</a>
      </div>
      {roadRoute && <p className="route-attribution">Rota: © openrouteservice.org / HeiGIT · © OpenStreetMap contributors</p>}
    </div> : <p className="hint map-prompt">{stations.length ? 'Toque em um preço para ver o posto e traçar a rota.' : 'Ainda não há postos cadastrados.'}</p>}
  </section>
}
