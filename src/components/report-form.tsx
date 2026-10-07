'use client'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Camera, LocateFixed, Sparkles } from 'lucide-react'
import { browserClient } from '@/lib/supabase/browser'
import { getLocation, haversineKm, type Coordinates } from '@/lib/geo'
import { parsePrice } from '@/lib/pricing'
import { compressPhoto } from '@/lib/photo'
import { fuelOptions } from '@/lib/fuels'
import type { FuelType, Station } from '@/lib/types'

export function ReportForm({ stations, initialStation, loadError = false }: { stations: Station[]; initialStation?: string; loadError?: boolean }) {
  const router = useRouter()
  const [stationId, setStationId] = useState(initialStation ?? '')
  const [values, setValues] = useState<Record<FuelType, string>>({ gasoline: '', ethanol: '', diesel: '', diesel_s10: '' })
  const [location, setLocation] = useState<(Coordinates & { accuracy: number }) | null>(null)
  const [locationStatus, setLocationStatus] = useState('Localização opcional')
  const [photo, setPhoto] = useState<Blob | null>(null)
  const [photoName, setPhotoName] = useState('')
  const [candidates, setCandidates] = useState<number[]>([])
  const [ocrStatus, setOcrStatus] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const nearest = useMemo(() => location ? [...stations].map((s) => ({ station: s, distance: haversineKm(location, s) })).sort((a, b) => a.distance - b.distance)[0] : null, [location, stations])
  const selectedStationId = stationId
  useEffect(() => {
    if (!navigator.permissions?.query) return
    let active = true
    navigator.permissions.query({ name: 'geolocation' }).then((permission) => {
      if (permission.state === 'granted') getLocation().then((value) => { if (active) { setLocation(value); setLocationStatus('Localização adicionada ao registro') } }).catch(() => {})
    }).catch(() => {})
    return () => { active = false }
  }, [])
  async function locate() {
    setLocationStatus('Buscando localização…')
    try { const value = await getLocation(); setLocation(value); setLocationStatus('Localização adicionada ao registro') }
    catch (e) { setLocationStatus(e instanceof Error ? e.message : 'Localização indisponível.') }
  }
  async function choosePhoto(file?: File) {
    if (!file) return
    setError(''); setCandidates([]); setOcrStatus(''); setPhotoName('Preparando foto…')
    try { const compressed = await compressPhoto(file); setPhoto(compressed); setPhotoName(`${(compressed.size / 1024).toFixed(0)} KB · pronta para envio`) }
    catch (e) { setPhoto(null); setPhotoName(''); setError(e instanceof Error ? e.message : 'Não foi possível abrir a foto.') }
  }
  async function runOcr() {
    if (!photo) return
    setOcrStatus('Lendo a foto… isso pode demorar alguns segundos.')
    try { const { recognizePrices } = await import('@/lib/ocr'); const found = await recognizePrices(photo); setCandidates(found); setOcrStatus(found.length ? 'Toque em um valor para preencher um campo. Confirme antes de salvar.' : 'Nenhum valor encontrado. Digite o preço manualmente.') }
    catch { setOcrStatus('Não foi possível ler a foto. Digite o preço manualmente.') }
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError('')
    if (!selectedStationId) return setError('Escolha um posto.')
    const entered = fuelOptions.map(({ value }) => ({ key: value, raw: values[value].trim(), price: parsePrice(values[value]) })).filter(({ raw }) => raw)
    if (!entered.length) return setError('Informe ao menos um preço.')
    if (entered.some(({ price }) => price === null)) return setError('Use preços entre R$ 1,00 e R$ 20,00, com 2 ou 3 casas decimais.')
    setBusy(true)
    const db = browserClient()
    let uploadedPath: string | null = null
    try {
      const { data: { user }, error: authError } = await db.auth.getUser()
      if (authError || !user) throw new Error('Sua sessão expirou. Entre novamente.')
      if (photo) {
        const now = new Date()
        const extension = photo.type === 'image/webp' ? 'webp' : 'jpg'
        uploadedPath = `price-reports/${user.id}/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${crypto.randomUUID()}.${extension}`
        const { error: uploadError } = await db.storage.from('station-photos').upload(uploadedPath, photo, { contentType: photo.type, upsert: false })
        if (uploadError) throw new Error('A foto não foi enviada. Tente novamente ou remova a foto.')
      }
      const { error: insertError } = await db.from('price_reports').insert(entered.map(({ key, price }) => ({ station_id: selectedStationId, user_id: user.id, fuel_type: key, price: price!, photo_path: uploadedPath, latitude: location?.latitude ?? null, longitude: location?.longitude ?? null, location_accuracy: location?.accuracy ?? null })))
      if (insertError) { if (uploadedPath) await db.storage.from('station-photos').remove([uploadedPath]); throw new Error('Não foi possível salvar o preço. Tente novamente.') }
      router.push(`/stations/${selectedStationId}`); router.refresh()
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível salvar.'); setBusy(false) }
  }
  return <main className="shell page report-page">
    <header className="simple-header"><Link href="/home" aria-label="Voltar"><ArrowLeft /></Link><span>Novo preço</span><span /></header>
    <div className="form-intro"><p className="eyebrow">AJUDE O GRUPO</p><h1>Atualizar preço</h1><p>Leva só alguns segundos.</p></div>
    {nearest && nearest.distance < 0.3 && <button type="button" className="suggestion" onClick={() => setStationId(nearest.station.id)}>Você está no <strong>{nearest.station.name}</strong>? <span>Selecionar</span></button>}
    {loadError && <p className="form-error" role="alert">Não foi possível carregar os postos. Verifique a conexão e atualize a página.</p>}
    <form onSubmit={submit} className="form-stack">
      <label htmlFor="station">Posto</label><select id="station" required value={selectedStationId} onChange={(e) => setStationId(e.target.value)}><option value="">Selecione um posto</option>{stations.map((s) => <option value={s.id} key={s.id}>{s.name}</option>)}</select>
      <button className="inline-action" type="button" onClick={locate}><LocateFixed size={18} />{locationStatus}</button>
      <div className="form-divider" /><div className="form-label-row"><strong>Foto da placa</strong><span>opcional</span></div><label className="photo-picker" htmlFor="camera"><Camera size={21} /><span>{photoName || 'Tirar foto'}</span></label><input className="visually-hidden" id="camera" type="file" accept="image/*" capture="environment" onChange={(e) => void choosePhoto(e.target.files?.[0])} /><label className="photo-picker" htmlFor="gallery"><span>Escolher da galeria</span></label><input className="visually-hidden" id="gallery" type="file" accept="image/*" onChange={(e) => void choosePhoto(e.target.files?.[0])} />
      {photo && <><button type="button" className="inline-action" onClick={() => { setPhoto(null); setPhotoName(''); setCandidates([]) }}>Remover foto</button><button type="button" className="ocr-button" onClick={runOcr}><Sparkles size={17} /> Ler valores da foto</button></>}
      {ocrStatus && <p className="hint" role="status">{ocrStatus}</p>}
      {candidates.length > 0 && <div className="candidates">{candidates.map((value) => <div key={value}><strong>R$ {value.toFixed(2).replace('.', ',')}</strong><button type="button" onClick={() => setValues({ ...values, gasoline: value.toFixed(2).replace('.', ',') })}>Usar na gasolina</button><button type="button" onClick={() => setValues({ ...values, ethanol: value.toFixed(2).replace('.', ',') })}>Usar no etanol</button></div>)}</div>}
      <div className="form-divider" /><div className="form-label-row"><strong>Preços por litro</strong><span>Preencha os que souber</span></div>
      {fuelOptions.map(({ value, label }) => <div className="price-field" key={value}><label htmlFor={value}>{label}</label><div><span>R$</span><input id={value} inputMode="decimal" autoComplete="off" placeholder="0,00" value={values[value]} onChange={(e) => setValues({ ...values, [value]: e.target.value })} /></div></div>)}
      <p className="hint">Confira os valores antes de salvar. A leitura da foto pode errar.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary-button submit-button" disabled={busy || stations.length === 0} type="submit">{busy ? 'Salvando…' : 'Salvar preços'}</button>
    </form>
  </main>
}
