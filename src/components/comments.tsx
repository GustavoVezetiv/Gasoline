'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { browserClient } from '@/lib/supabase/browser'
import type { StationComment } from '@/lib/types'

export function Comments({ stationId, initial }: { stationId: string; initial: StationComment[] }) {
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const [pending, start] = useTransition()
  const router = useRouter()
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const text = comment.trim()
    if (!text || text.length > 1000) return setError('Escreva entre 1 e 1000 caracteres.')
    const db = browserClient()
    const { data: { user } } = await db.auth.getUser()
    if (!user) return setError('Sua sessão expirou. Entre novamente.')
    const { error } = await db.from('station_comments').insert({ station_id: stationId, user_id: user.id, comment: text })
    if (error) return setError('Não foi possível salvar. Tente novamente.')
    setComment(''); setError(''); start(() => router.refresh())
  }
  return <section className="detail-section comments"><div className="section-heading"><h2>Comentários do grupo</h2><span>{initial.length}</span></div><p className="muted small">Experiências pessoais dos integrantes.</p>
    {initial.map((item) => <div className="comment" key={item.id}><div><strong>{item.profiles?.name ?? 'Integrante'}</strong><time>{new Date(item.created_at).toLocaleDateString('pt-BR')}</time></div><p>{item.comment}</p></div>)}
    {initial.length === 0 && <p className="muted">Ainda não há comentários.</p>}
    <form onSubmit={submit} className="comment-form"><label htmlFor="comment">Adicionar comentário</label><textarea id="comment" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} rows={3} placeholder="Como foi sua experiência?" /><button className="primary-button" disabled={pending} type="submit">Publicar comentário</button>{error && <p className="form-error" role="alert">{error}</p>}</form>
  </section>
}
