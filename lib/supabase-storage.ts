import { createClient } from "@supabase/supabase-js";

function getSupabaseUrl() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return process.env.NEXT_PUBLIC_SUPABASE_URL;
  }

  const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
  const match = directUrl?.match(/postgres\.([a-z0-9]+):/i);

  if (!match) {
    return null;
  }

  return `https://${match[1]}.supabase.co`;
}

export function getStorageBucket() {
  return process.env.SUPABASE_STORAGE_BUCKET || "product-images";
}

export function createSupabaseStorageClient() {
  const url = getSupabaseUrl();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return null;
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
