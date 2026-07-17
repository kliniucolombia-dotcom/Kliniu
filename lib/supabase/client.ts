"use client";

import { createClient } from "@supabase/supabase-js";

function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const globalForSupabaseBrowser = globalThis as typeof globalThis & {
  supabaseBrowser?: ReturnType<typeof createSupabaseBrowserClient>;
};

export const supabaseBrowser =
  globalForSupabaseBrowser.supabaseBrowser ?? createSupabaseBrowserClient();

if (process.env.NODE_ENV !== "production") {
  globalForSupabaseBrowser.supabaseBrowser = supabaseBrowser;
}
