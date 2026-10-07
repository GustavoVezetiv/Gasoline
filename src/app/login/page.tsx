import { redirect } from 'next/navigation'
import { serverClient } from '@/lib/supabase/server'
import { AuthForm } from '@/components/auth-form'

export default async function LoginPage() {
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
  if (configured) { const db = await serverClient(); const { data } = await db.auth.getClaims(); if (data?.claims) redirect('/home') }
  return <AuthForm configured={configured} />
}
