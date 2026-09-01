import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supabase = createClient();
  const { data: patient } = await supabase
    .from("patients")
    .select("*")
    .eq("id", params.id)
    .eq("professional_id", me.user.id)
    .single();

  if (!patient) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { error } = await supabase
    .from("patients")
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const admin = createAdminClient();
  await admin.from("audit_deletions").insert({
    professional_id: me.user.id,
    entity_type: "patient",
    entity_id: params.id,
    action: "soft_delete",
    reason: "Excluído pelo profissional",
    old_data: patient,
  });

  return NextResponse.json({ success: true });
}
