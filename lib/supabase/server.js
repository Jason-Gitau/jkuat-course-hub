import { createServerClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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
