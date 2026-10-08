'use client'

import { useEffect } from 'react'
import { divIcon } from 'leaflet'
import { CircleMarker, MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet'
import type { Coordinates } from '@/lib/geo'
import type { RoadRoute } from '@/lib/api-validation'
import type { StationWithPrice } from '@/lib/types'

const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 3 })
const fuelIcon = '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21V4a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v17M3 21h12M4 10h10M14 12h2a2 2 0 0 1 2 2v4a2 2 0 0 0 4 0V8l-4-4M20 6v3h2"/></svg>'

function FitBounds({ pointsKey, isRoute }: { pointsKey: string; isRoute: boolean }) {
  const map = useMap()
  useEffect(() => {
    const points: [number, number][] = JSON.parse(pointsKey)
    if (points.length) map.fitBounds(points, { padding: [54, 36], maxZoom: isRoute ? 16 : 15, animate: false })
  }, [isRoute, map, pointsKey])
  return null
}

export function StationsMapLeaflet({ stations, location, selectedId, onSelect, route }: { stations: StationWithPrice[]; location: Coordinates | null; selectedId: string | null; onSelect: (id: string) => void; route: RoadRoute | null }) {
  const center: [number, number] = stations[0] ? [stations[0].latitude, stations[0].longitude] : [-15.5989, -56.0949]
  const routePoints: [number, number][] | undefined = route?.coordinates.map(([lng, lat]) => [lat, lng])
  const stationPoints: [number, number][] = [...stations].sort((a, b) => a.id.localeCompare(b.id)).map((station) => [station.latitude, station.longitude])
  if (location) stationPoints.push([location.latitude, location.longitude])
  const pointsKey = JSON.stringify(routePoints ?? stationPoints)
  return <div className="station-map"><MapContainer center={center} zoom={13} scrollWheelZoom={false} aria-label="Mapa de postos">
    <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
    <FitBounds pointsKey={pointsKey} isRoute={Boolean(route)} />
    {routePoints && <Polyline positions={routePoints} pathOptions={{ color: '#111', weight: 5, opacity: 0.8 }} />}
    {stations.map((station) => <Marker key={station.id} position={[station.latitude, station.longitude]} title={`${station.name}: ${station.report ? money(station.report.price) : 'sem preço'}`} zIndexOffset={selectedId === station.id ? 1000 : 0} eventHandlers={{ click: () => onSelect(station.id) }} icon={divIcon({
      className: `fuel-marker${selectedId === station.id ? ' selected' : ''}`,
      html: `${fuelIcon}<span>${station.report ? money(station.report.price) : '—'}</span>`, iconSize: [112, 44], iconAnchor: [56, 22],
    })} />)}
    {location && <CircleMarker center={[location.latitude, location.longitude]} radius={8} pathOptions={{ color: '#fff', fillColor: '#2563eb', fillOpacity: 1, weight: 3 }}><Tooltip>Você está aqui</Tooltip></CircleMarker>}
  </MapContainer></div>
}
