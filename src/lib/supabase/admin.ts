import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/**
 * Admin client - RLS'yi bypass eder, sadece server-side API route'larda kullanılmalı
 * @deprecated Lütfen bunun yerine @/lib/supabase/server'dan createAdminClient kullanın
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY ortam değişkeni tanımlı değil");
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
