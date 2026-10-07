export type Coordinates = { latitude: number; longitude: number }

export function haversineKm(a: Coordinates, b: Coordinates): number {
  const rad = Math.PI / 180
  const dLat = (b.latitude - a.latitude) * rad
  const dLon = (b.longitude - a.longitude) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLon / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

export function getLocation(): Promise<Coordinates & { accuracy: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Geolocalização indisponível neste navegador.'))
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy }),
      (error) => reject(new Error(error.code === 1 ? 'Localização recusada. Você ainda pode usar o app normalmente.' : 'Não foi possível obter sua localização.')),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
    )
  })
}
