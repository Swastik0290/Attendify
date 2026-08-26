import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Server-side Supabase client.
 * Use inside Server Components, Route Handlers, and Server Actions.
 * Reads/writes auth cookies automatically via next/headers.
 * Uses the public anon key — subject to Row Level Security.
 *
 * For privileged operations (bypassing RLS), use createAdminClient() below,
 * but ONLY in secure server-side contexts where you explicitly need it.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll can be called from a Server Component where cookies
            // cannot be set. This is safe to ignore if a middleware is
            // refreshing sessions.
          }
        },
      },
    }
  )
}

/**
 * Privileged server-side Supabase client using the service-role key.
 * Bypasses Row Level Security — use only for trusted admin operations.
 * NEVER expose SUPABASE_SERVICE_ROLE_KEY to the browser.
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set. ' +
        'This client must only be used in secure server-side contexts.'
    )
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
    }
  )
}
