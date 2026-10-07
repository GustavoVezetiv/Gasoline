'use client'
import { useState } from 'react'
import { ImageIcon } from 'lucide-react'
import { browserClient } from '@/lib/supabase/browser'

export function ReportPhoto({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState('')
  async function openPhoto() {
    const { data, error } = await browserClient().storage.from('station-photos').createSignedUrl(path, 60)
    if (error) setError('Foto indisponível.'); else setUrl(data.signedUrl)
  }
  return <div className="photo-link">{url ? <a href={url} target="_blank" rel="noreferrer">Abrir foto</a> : <button type="button" onClick={openPhoto}><ImageIcon size={15} /> Ver foto</button>}{error && <span>{error}</span>}</div>
}
