import { redirect } from 'next/navigation'
import { serverClient } from '@/lib/supabase/server'
import { BottomNav } from '@/components/bottom-nav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return <main className="shell py-20"><h1 className="text-3xl font-bold">Configure o Supabase</h1><p className="mt-4 text-neutral-600">Preencha <code>.env.local</code> com as variáveis de <code>.env.example</code> e reinicie o servidor.</p></main>
  }
  const db = await serverClient()
  const { data } = await db.auth.getClaims()
  const claims = data?.claims
  if (!claims) redirect('/login')
  return <><div className="app-shell">{children}</div><BottomNav /></>
}
