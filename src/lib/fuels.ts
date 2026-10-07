import type { FuelType } from './types'

export const fuelOptions: { value: FuelType; label: string; shortLabel: string }[] = [
  { value: 'gasoline', label: 'Gasolina comum', shortLabel: 'Gasolina' },
  { value: 'ethanol', label: 'Etanol', shortLabel: 'Etanol' },
  { value: 'diesel', label: 'Diesel', shortLabel: 'Diesel' },
  { value: 'diesel_s10', label: 'Diesel S10', shortLabel: 'Diesel S10' },
]

export const fuelLabel = (fuel: FuelType) => fuelOptions.find((option) => option.value === fuel)?.label ?? fuel

export function isFuelType(value: string | null): value is FuelType {
  return fuelOptions.some((option) => option.value === value)
}
