'use client'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, LogOut } from 'lucide-react'
import { browserClient } from '@/lib/supabase/browser'
import type { Profile } from '@/lib/types'

export function ProfileForm({ profile, userId }: { profile: Profile | null; userId: string }) {
  const router = useRouter()
  const [name, setName] = useState(profile?.name ?? '')
  const [consumption, setConsumption] = useState(profile?.vehicle_consumption_km_l?.toString() ?? '')
  const [liters, setLiters] = useState(profile?.default_fill_liters?.toString() ?? '')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  async function save(event: React.FormEvent) {
    event.preventDefault(); setMessage(''); setBusy(true)
    const c = consumption ? Number(consumption.replace(',', '.')) : null
    const l = liters ? Number(liters.replace(',', '.')) : null
    if (!name.trim() || (c !== null && (!Number.isFinite(c) || c <= 0 || c > 100)) || (l !== null && (!Number.isFinite(l) || l <= 0 || l > 300))) { setMessage('Confira os valores informados.'); setBusy(false); return }
    const { error } = await browserClient().from('profiles').upsert({ id: userId, name: name.trim(), vehicle_consumption_km_l: c, default_fill_liters: l, updated_at: new Date().toISOString() })
    setMessage(error ? 'Não foi possível salvar. Tente novamente.' : 'Perfil salvo. O melhor custo já pode usar seus dados.')
    setBusy(false); if (!error) router.refresh()
  }
  async function logout() { await browserClient().auth.signOut(); router.push('/login'); router.refresh() }
  return <main className="shell page profile-page"><header className="simple-header"><Link href="/home" aria-label="Voltar"><ArrowLeft /></Link><span>Perfil</span><span /></header><div className="form-intro"><p className="eyebrow">SUAS PREFERÊNCIAS</p><h1>Meu perfil</h1><p>Use seus dados para estimar o melhor custo.</p></div>
    <form onSubmit={save} className="form-stack"><label htmlFor="name">Nome</label><input id="name" maxLength={80} required value={name} onChange={(e) => setName(e.target.value)} /><div className="form-divider" /><strong>Meu carro</strong><label htmlFor="consumption">Consumo médio (km/L)</label><input id="consumption" inputMode="decimal" placeholder="Ex.: 10,5" value={consumption} onChange={(e) => setConsumption(e.target.value)} /><label htmlFor="liters">Normalmente abasteço (litros)</label><input id="liters" inputMode="decimal" placeholder="Ex.: 30" value={liters} onChange={(e) => setLiters(e.target.value)} /><p className="hint">Usamos esses números apenas para estimar o custo da ida e volta ao posto.</p><button className="primary-button submit-button" disabled={busy} type="submit">{busy ? 'Salvando…' : 'Salvar perfil'}</button>{message && <p role="status" className="hint">{message}</p>}</form><button type="button" className="logout-button" onClick={logout}><LogOut size={19} /> Sair da conta</button>
  </main>
}
