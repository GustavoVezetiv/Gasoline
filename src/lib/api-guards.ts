import { serverClient } from './supabase/server'

export async function authenticatedRequest(request: Request): Promise<{ userId: string; db: Awaited<ReturnType<typeof serverClient>> } | null> {
  const origin = request.headers.get('origin')
  if (origin && origin !== new URL(request.url).origin) return null
  if (request.headers.get('sec-fetch-site') === 'cross-site') return null
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return null
  const db = await serverClient()
  const { data, error } = await db.auth.getClaims()
  if (error || !data?.claims?.sub || data.claims.is_anonymous) return null
  return { userId: data.claims.sub, db }
}
