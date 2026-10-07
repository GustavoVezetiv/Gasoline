'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Brand } from './brand'
import { browserClient } from '@/lib/supabase/browser'

export function AuthForm({ configured }: { configured: boolean }) {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'forgot' | 'reset'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setMessage(''); setBusy(true)
    const db = browserClient()
    if (mode === 'forgot') {
      const { error } = await db.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/callback?next=/reset-password` })
      setMessage(error ? 'Não foi possível enviar o link. Tente novamente.' : 'Se o e-mail estiver autorizado, você receberá um link para redefinir a senha.')
      setBusy(false); return
    }
    const { error } = await db.auth.signInWithPassword({ email, password })
    if (error) { setMessage('E-mail ou senha inválidos.'); setBusy(false); return }
    router.push('/home'); router.refresh()
  }
  return <main className="auth-page"><div className="auth-content"><Brand /><div className="auth-heading"><p className="eyebrow">ACESSO PRIVADO</p><h1>Seu próximo abastecimento começa aqui.</h1><p>Preços compartilhados por quem você conhece.</p></div>
    {!configured ? <p className="form-error">Configure o Supabase em <code>.env.local</code> para entrar.</p> : <form onSubmit={submit} className="auth-form"><label htmlFor="email">E-mail</label><input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@exemplo.com" />{mode === 'login' && <><label htmlFor="password">Senha</label><input id="password" type="password" autoComplete="current-password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Sua senha" /></>}<button className="primary-button" disabled={busy} type="submit">{busy ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Enviar link'}</button>{message && <p role="status" className="hint">{message}</p>}<button className="text-button" type="button" onClick={() => { setMessage(''); setMode(mode === 'login' ? 'forgot' : 'login') }}>{mode === 'login' ? 'Esqueci minha senha' : 'Voltar ao login'}</button></form>}
    <p className="auth-foot">Acesso exclusivo para integrantes convidados.</p></div></main>
}
