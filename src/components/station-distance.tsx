'use client'
import { useState } from 'react'
import { LocateFixed } from 'lucide-react'
import { getLocation, haversineKm } from '@/lib/geo'
import type { Station } from '@/lib/types'

export function StationDistance({ station }: { station: Station }) {
  const [label, setLabel] = useState('Ver distância aproximada')
  async function locate() {
    setLabel('Buscando localização…')
    try { const distance = haversineKm(await getLocation(), station); setLabel(`≈ ${distance.toFixed(1).replace('.', ',')} km em linha reta`) }
    catch { setLabel('Localização indisponível') }
  }
  return <button className="inline-action" type="button" onClick={locate}><LocateFixed size={17} />{label}</button>
}
