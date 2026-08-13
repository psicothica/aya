import { createClient as createSb } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// SERVIDOR APENAS. Ignora a RLS — use somente em rotinas de sistema confiáveis
// (cron de lembretes, confirmação por link assinado). Nunca importe no cliente.
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY ausente.");
  return createSb<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
