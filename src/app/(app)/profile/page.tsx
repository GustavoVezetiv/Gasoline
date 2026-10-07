import { serverClient } from '@/lib/supabase/server'
import { ProfileForm } from '@/components/profile-form'
import type { Profile } from '@/lib/types'
export const dynamic = 'force-dynamic'
export default async function ProfilePage() {
  const db = await serverClient()
  const { data: auth } = await db.auth.getClaims()
  const { data } = await db.from('profiles').select('id,name,vehicle_consumption_km_l,default_fill_liters').eq('id', auth!.claims.sub).maybeSingle()
  return <ProfileForm profile={data as Profile | null} userId={auth!.claims.sub} />
}
