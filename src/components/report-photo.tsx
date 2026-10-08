'use client'
import { useEffect, useState } from 'react'
import { ImageIcon } from 'lucide-react'
import { browserClient } from '@/lib/supabase/browser'

export function ReportPhoto({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (!url) return
    const timer = window.setTimeout(() => setUrl(null), 55000)
    return () => window.clearTimeout(timer)
  }, [url])
  async function openPhoto() {
    setBusy(true); setError('')
    try {
      const { data, error } = await browserClient().storage.from('station-photos').createSignedUrl(path, 60)
      if (error || !data?.signedUrl) setError('Foto indisponível. Tente novamente.'); else setUrl(data.signedUrl)
    } catch { setError('Não foi possível abrir a foto. Verifique a conexão.') }
    finally { setBusy(false) }
  }
  return <div className="photo-link">{url ? <a href={url} target="_blank" rel="noreferrer">Abrir foto</a> : <button type="button" disabled={busy} onClick={openPhoto}><ImageIcon size={15} />{busy ? 'Carregando foto…' : 'Ver foto'}</button>}{error && <span role="status">{error}</span>}</div>
}
