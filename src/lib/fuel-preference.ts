'use client'

import { useCallback, useSyncExternalStore } from 'react'
import { isFuelType } from './fuels'
import type { FuelType } from './types'

const storageKey = 'gasoline:selected-fuel'
const changeEvent = 'gasoline:fuel-change'

function readFuel(): FuelType {
  if (typeof window === 'undefined') return 'gasoline'
  const stored = window.localStorage.getItem(storageKey)
  return isFuelType(stored) ? stored : 'gasoline'
}

function serverFuel(): FuelType {
  return 'gasoline'
}

function subscribe(listener: () => void) {
  window.addEventListener('storage', listener)
  window.addEventListener(changeEvent, listener)
  return () => {
    window.removeEventListener('storage', listener)
    window.removeEventListener(changeEvent, listener)
  }
}

export function useFuelPreference(): [FuelType, (fuel: FuelType) => void] {
  const fuel = useSyncExternalStore(subscribe, readFuel, serverFuel)
  const setFuel = useCallback((nextFuel: FuelType) => {
    window.localStorage.setItem(storageKey, nextFuel)
    window.dispatchEvent(new Event(changeEvent))
  }, [])
  return [fuel, setFuel]
}
