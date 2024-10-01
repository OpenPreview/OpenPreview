import type { Database } from '@openpreview/supabase'
import { createBrowserClient } from '@supabase/ssr'

export function useSupabaseBrowser() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
