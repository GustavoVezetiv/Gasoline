'use client'

import { ChevronDown } from 'lucide-react'
import { fuelOptions } from '@/lib/fuels'
import type { FuelType } from '@/lib/types'

export function FuelSelector({ value, onChange, compact = false, label = 'Combustível' }: { value: FuelType; onChange: (fuel: FuelType) => void; compact?: boolean; label?: string }) {
  return <label className={`fuel-selector${compact ? ' compact' : ''}`}>
    <span className="visually-hidden">{label}</span>
    <select value={value} onChange={(event) => onChange(event.target.value as FuelType)} aria-label={label}>
      {fuelOptions.map((fuel) => <option key={fuel.value} value={fuel.value}>{compact ? fuel.shortLabel : fuel.label}</option>)}
    </select>
    <ChevronDown aria-hidden="true" size={17} />
  </label>
}
