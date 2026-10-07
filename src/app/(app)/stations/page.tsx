import { HomeList } from '@/components/home-list'
import { homeData } from '@/lib/data'
import { serverClient } from '@/lib/supabase/server'
export const dynamic = 'force-dynamic'
export default async function StationsPage() {
  const db = await serverClient()
  const { data: auth } = await db.auth.getClaims()
  let data
  try { data = await homeData(auth!.claims.sub) }
  catch { return <main className="shell page"><h1>Não foi possível carregar os postos</h1><p className="mt-4">Tente novamente em instantes.</p></main> }
  return <HomeList {...data} title="Todos os postos" showIntro={false} />
}
