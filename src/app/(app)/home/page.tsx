import { HomeSummary } from '@/components/home-summary'
import { homeData } from '@/lib/data'
import { serverClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export default async function HomePage() {
  const db = await serverClient()
  const { data: auth } = await db.auth.getClaims()
  let data
  try { data = await homeData(auth!.claims.sub) }
  catch { return <main className="shell page"><h1>Não foi possível carregar os postos</h1><p className="mt-4 text-neutral-600">Verifique a conexão e tente atualizar a página.</p></main> }
  return <HomeSummary {...data} />
}
