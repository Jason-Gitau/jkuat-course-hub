import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Singleton instance for service role client (bypasses RLS)
 * Reused across requests for better performance
 */
let serviceRoleClient = null;

/**
 * Get or create the service role Supabase client (singleton pattern)
 * Use this for admin operations that bypass Row Level Security
 *
 * Benefits:
 * - Reuses connection pool across requests
 * - Reduces overhead of creating new clients
 * - Better for background jobs and admin operations
 *
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
export function getServiceRoleClient() {
  if (!serviceRoleClient && supabaseUrl && serviceRoleKey) {
    serviceRoleClient = createSupabaseClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return serviceRoleClient;
}

/**
 * Create a user-authenticated Supabase client for server-side requests
 * This must be called per-request because it uses cookies for auth
 *
 * Note: Connection pooling is handled by Supabase's infrastructure (PgBouncer)
 * Enable in Supabase Dashboard: Settings > Database > Connection Pooling
 *
 * @param {import('next/headers').ReadonlyRequestCookies} cookieStore
 * @returns {import('@supabase/ssr').SupabaseClient}
 */
export const createClient = (cookieStore) => {
  const cookiesProxy = {
    getAll() {
      return cookieStore?.getAll?.() ?? []
    },
    setAll(cookiesToSet) {
      // best-effort: if cookieStore supports set, apply; otherwise no-op
      try {
        if (cookieStore?.set) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        }
      } catch (e) {
        // swallow — no response cookies available in this context
      }
    },
  }

  return createServerClient(supabaseUrl, supabaseKey, { cookies: cookiesProxy })
}
