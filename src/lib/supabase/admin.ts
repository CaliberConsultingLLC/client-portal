import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client for privileged server-side operations.
 * NEVER expose this client to the browser.
 * Use only in API routes, webhooks, and server-side scripts.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
