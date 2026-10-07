'use client'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { browserClient } from '@/lib/supabase/browser'
import { Brand } from './brand'

export function ResetPasswordForm() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true)
    const { error } = await browserClient().auth.updateUser({ password })
    if (error) { setMessage('Link expirado ou inválido. Solicite outro no login.'); setBusy(false); return }
    router.push('/home'); router.refresh()
  }
  return <main className="auth-page"><div className="auth-content"><Brand /><div className="auth-heading"><h1>Nova senha</h1><p>Escolha uma senha para continuar.</p></div><form className="auth-form" onSubmit={submit}><label htmlFor="new-password">Senha</label><input id="new-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} /><button className="primary-button" disabled={busy}>Salvar senha</button>{message && <p className="form-error">{message}</p>}</form><Link className="text-button" href="/login">Voltar ao login</Link></div></main>
}
