'use client'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Camera, LocateFixed, Sparkles } from 'lucide-react'
import { browserClient } from '@/lib/supabase/browser'
import { getLocation, haversineKm, type Coordinates } from '@/lib/geo'
import { parsePrice } from '@/lib/pricing'
import { compressPhoto } from '@/lib/photo'
import { fuelOptions } from '@/lib/fuels'
import { validateIdentifiedPrices } from '@/lib/api-validation'
import type { FuelType, Station } from '@/lib/types'

class ReportError extends Error {}

export function ReportForm({ stations, initialStation, loadError = false }: { stations: Station[]; initialStation?: string; loadError?: boolean }) {
  const router = useRouter()
  const [stationId, setStationId] = useState(initialStation ?? '')
  const [values, setValues] = useState<Record<FuelType, string>>({ gasoline: '', ethanol: '', diesel: '', diesel_s10: '' })
  const [location, setLocation] = useState<(Coordinates & { accuracy: number }) | null>(null)
  const [locationStatus, setLocationStatus] = useState('Localização opcional')
  const [photo, setPhoto] = useState<Blob | null>(null)
  const [photoName, setPhotoName] = useState('')
  const [analysisStatus, setAnalysisStatus] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [preparing, setPreparing] = useState(false)
  const analysisRequest = useRef<AbortController | null>(null)
  const cameraInput = useRef<HTMLInputElement>(null)
  const galleryInput = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const locked = busy || analyzing || preparing
  const nearest = useMemo(() => location ? [...stations].map((s) => ({ station: s, distance: haversineKm(location, s) })).sort((a, b) => a.distance - b.distance)[0] : null, [location, stations])
  const selectedStationId = stationId
  useEffect(() => () => analysisRequest.current?.abort(), [])
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
    setPreparing(true); setError(''); setAnalysisStatus(''); setPhoto(null); setPhotoName('Preparando foto…')
    try { const compressed = await compressPhoto(file); setPhoto(compressed); setPhotoName(`${(compressed.size / 1024).toFixed(0)} KB · pronta para envio`) }
    catch (e) { setPhoto(null); setPhotoName(''); setError(e instanceof Error ? e.message : 'Não foi possível abrir a foto.') }
    finally { setPreparing(false) }
  }
  async function identifyPrices() {
    if (!photo || locked || analysisRequest.current) return
    if (!selectedStationId) return setError('Escolha um posto antes de identificar os preços.')
    const controller = new AbortController()
    analysisRequest.current = controller
    const timeout = window.setTimeout(() => controller.abort(), 25000)
    setAnalyzing(true); setError(''); setAnalysisStatus('Identificando os combustíveis e preços…')
    try {
      const response = await fetch(`/api/analyze-price-photo?station=${encodeURIComponent(selectedStationId)}`, {
        method: 'POST', headers: { 'Content-Type': photo.type }, body: photo, signal: controller.signal,
      })
      const data = await response.json()
      if (!response.ok) {
        setAnalysisStatus(typeof data.error === 'string' ? data.error : 'Não foi possível ler a foto. Digite os preços abaixo.')
        return
      }
      const found = validateIdentifiedPrices(data)
      setValues((previous) => {
        const next = { ...previous }
        for (const item of found) if (!next[item.fuel_type].trim()) next[item.fuel_type] = item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 3 })
        return next
      })
      setAnalysisStatus(found.length ? 'Leitura concluída. Preenchemos os campos vazios; confira cada combustível e preço antes de salvar.' : 'Nenhum preço foi identificado com segurança. Digite os valores abaixo ou tente outra foto.')
    } catch {
      setAnalysisStatus(controller.signal.aborted ? 'A leitura demorou demais. Tente novamente ou digite os preços.' : 'Não foi possível ler a foto. Verifique a conexão ou digite os preços.')
    } finally {
      window.clearTimeout(timeout); analysisRequest.current = null; setAnalyzing(false)
    }
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError('')
    if (locked) return
    if (!selectedStationId) return setError('Escolha um posto.')
    const entered = fuelOptions.map(({ value }) => ({ key: value, raw: values[value].trim(), price: parsePrice(values[value]) })).filter(({ raw }) => raw)
    if (!entered.length) return setError('Informe ao menos um preço.')
    if (entered.some(({ price }) => price === null)) return setError('Use preços entre R$ 1,00 e R$ 20,00, com 2 ou 3 casas decimais.')
    setBusy(true)
    let uploadedPath: string | null = null
    try {
      const db = browserClient()
      const { data: { user }, error: authError } = await db.auth.getUser()
      if (authError || !user) throw new ReportError('Sua sessão expirou. Entre novamente.')
      if (photo) {
        const now = new Date()
        const extension = photo.type === 'image/webp' ? 'webp' : 'jpg'
        uploadedPath = `price-reports/${user.id}/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${crypto.randomUUID()}.${extension}`
        const { error: uploadError } = await db.storage.from('station-photos').upload(uploadedPath, photo, { contentType: photo.type, upsert: false })
        if (uploadError) throw new ReportError('A foto não foi enviada. Tente novamente ou remova a foto.')
      }
      const { error: insertError } = await db.from('price_reports').insert(entered.map(({ key, price }) => ({ station_id: selectedStationId, user_id: user.id, fuel_type: key, price: price!, photo_path: uploadedPath, latitude: location?.latitude ?? null, longitude: location?.longitude ?? null, location_accuracy: location?.accuracy ?? null })))
      if (insertError) { if (uploadedPath) await db.storage.from('station-photos').remove([uploadedPath]); throw new ReportError('Não foi possível salvar o preço. Tente novamente.') }
      router.push(`/stations/${selectedStationId}`); router.refresh()
    } catch (e) { setError(e instanceof ReportError ? e.message : 'Não foi possível salvar. Verifique a conexão e tente novamente.'); setBusy(false) }
  }
  return <main className="shell page report-page">
    <header className="simple-header"><Link href="/home" aria-label="Voltar"><ArrowLeft /></Link><span>Novo preço</span><span /></header>
    <div className="form-intro"><p className="eyebrow">AJUDE O GRUPO</p><h1>Atualizar preço</h1><p>Leva só alguns segundos.</p></div>
    {nearest && nearest.distance < 0.3 && <button disabled={locked} type="button" className="suggestion" onClick={() => setStationId(nearest.station.id)}>Você está no <strong>{nearest.station.name}</strong>? <span>Selecionar</span></button>}
    {loadError && <p className="form-error" role="alert">Não foi possível carregar os postos. Verifique a conexão e atualize a página.</p>}
    <form onSubmit={submit} className="form-stack">
      <label htmlFor="station">Posto</label><select id="station" required disabled={locked} value={selectedStationId} onChange={(e) => setStationId(e.target.value)}><option value="">Selecione um posto</option>{stations.map((s) => <option value={s.id} key={s.id}>{s.name}</option>)}</select>
      <button className="inline-action" type="button" disabled={busy} onClick={locate}><LocateFixed size={18} />{locationStatus}</button>
      <div className="form-divider" /><div className="form-label-row"><strong>Foto da placa</strong><span>opcional</span></div>
      <div className="photo-actions">
        <button className="photo-picker" disabled={locked} type="button" onClick={() => cameraInput.current?.click()}><Camera size={21} />Tirar foto</button>
        <button className="photo-picker" disabled={locked} type="button" onClick={() => galleryInput.current?.click()}>Galeria</button>
      </div>
      <input hidden ref={cameraInput} type="file" accept="image/*" capture="environment" onChange={(e) => { void choosePhoto(e.target.files?.[0]); e.target.value = '' }} />
      <input hidden ref={galleryInput} type="file" accept="image/*" onChange={(e) => { void choosePhoto(e.target.files?.[0]); e.target.value = '' }} />
      {photoName && <div className="photo-summary"><span role="status">{photoName}</span>{photo && <button type="button" disabled={locked} className="inline-action" onClick={() => { setPhoto(null); setPhotoName(''); setAnalysisStatus('') }}>Remover</button>}</div>}
      {photo && <>
        <p className="hint photo-notice" id="photo-notice">Ao identificar preços, esta foto será enviada a um serviço externo do Google. Revise o resultado antes de salvar.</p>
        <button type="button" className="secondary-button" disabled={locked || !selectedStationId} aria-describedby="photo-notice" onClick={identifyPrices}><Sparkles size={17} />{analyzing ? 'Identificando…' : 'Identificar preços'}</button>
        {!selectedStationId && <p className="hint">Selecione o posto para identificar os preços.</p>}
      </>}
      {analysisStatus && <p className="hint" role="status">{analysisStatus}</p>}
      <div className="form-divider" /><div className="form-label-row"><strong>Preços por litro</strong><span>Preencha os que souber</span></div>
      {fuelOptions.map(({ value, label }) => <div className="price-field" key={value}><label htmlFor={value}>{label}</label><div><span>R$</span><input id={value} disabled={busy} inputMode="decimal" autoComplete="off" placeholder="0,00" value={values[value]} onChange={(e) => setValues((previous) => ({ ...previous, [value]: e.target.value }))} /></div></div>)}
      <p className="hint">Confira os valores antes de salvar.{photo ? ' A leitura da foto pode errar.' : ''}</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary-button submit-button" disabled={locked || stations.length === 0} type="submit">{busy ? 'Salvando…' : 'Confirmar e salvar preços'}</button>
    </form>
  </main>
}
