'use client'

import dynamic from 'next/dynamic'
import type { Coordinates } from '@/lib/geo'
import type { StationWithPrice } from '@/lib/types'

const LeafletMap = dynamic(() => import('./stations-map-leaflet').then((module) => module.StationsMapLeaflet), {
  ssr: false,
  loading: () => <div className="map-loading">Carregando mapa…</div>,
})

export function StationsMap({ stations, location }: { stations: StationWithPrice[]; location: Coordinates | null }) {
  return <LeafletMap stations={stations} location={location} />
}
