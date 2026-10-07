'use client'

import { useEffect } from 'react'
import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet'
import type { Coordinates } from '@/lib/geo'
import type { StationWithPrice } from '@/lib/types'

const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 }).format(value)

function FitBounds({ stations, location }: { stations: StationWithPrice[]; location: Coordinates | null }) {
  const map = useMap()
  useEffect(() => {
    const points: [number, number][] = stations.map((station) => [station.latitude, station.longitude])
    if (location) points.push([location.latitude, location.longitude])
    if (points.length > 1) map.fitBounds(points, { padding: [32, 32], maxZoom: 14 })
  }, [location, map, stations])
  return null
}

export function StationsMapLeaflet({ stations, location }: { stations: StationWithPrice[]; location: Coordinates | null }) {
  const center: [number, number] = stations[0] ? [stations[0].latitude, stations[0].longitude] : [-15.5989, -56.0949]
  return <div className="station-map"><MapContainer center={center} zoom={13} scrollWheelZoom={false} aria-label="Mapa de postos">
    <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
    <FitBounds stations={stations} location={location} />
    {stations.map((station) => <CircleMarker key={station.id} center={[station.latitude, station.longitude]} radius={10} pathOptions={{ color: '#111', fillColor: station.report ? '#111' : '#fff', fillOpacity: 1, weight: 2 }}>
      {station.report && <Tooltip permanent direction="top" offset={[0, -8]} className="price-tooltip">{money(station.report.price)}</Tooltip>}
      <Popup><strong>{station.name}</strong><br />{station.report ? `${money(station.report.price)} / L` : 'Sem preço para este combustível'}<br /><a href={`/stations/${station.id}`}>Ver detalhes</a></Popup>
    </CircleMarker>)}
    {location && <CircleMarker center={[location.latitude, location.longitude]} radius={8} pathOptions={{ color: '#fff', fillColor: '#2563eb', fillOpacity: 1, weight: 3 }}><Tooltip>Você está aqui</Tooltip></CircleMarker>}
  </MapContainer></div>
}
