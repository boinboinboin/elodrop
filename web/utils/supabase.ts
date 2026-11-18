// The user accounts' database (Supabase: supabase/migrations), used from the browser only, with the public anon key:
// what a user may read and write is decided by the database's row-level security, not here. The site's pages never
// read an account on the server, so they stay the same cached page for everyone (README: "User accounts").
//
// Without NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY the accounts are off: no sign-in button, and the
// rest of the site as before.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { STORAGE_KEY } from "@/utils/account";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!URL || !KEY) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY");
  // The session is kept in localStorage (supabase-js's default), under STORAGE_KEY
  client ??= createClient(URL, KEY, { auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: STORAGE_KEY } });
  return client;
}
