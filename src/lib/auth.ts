import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

type Role = Database["public"]["Enums"]["app_role"];

// Usuário atual + papéis (RBAC). Fonte da verdade dos papéis é a tabela user_roles.
export async function getCurrentUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  const roles = (roleRows ?? []).map((r) => r.role) as Role[];
  return { user, roles };
}
