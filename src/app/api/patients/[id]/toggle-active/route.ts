import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supabase = createClient();
  const { data: patient } = await supabase
    .from("patients")
    .select("is_active")
    .eq("id", params.id)
    .eq("professional_id", me.user.id)
    .single();

  if (!patient) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const newStatus = !patient.is_active;
  const { error } = await supabase
    .from("patients")
    .update({ is_active: newStatus })
    .eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const admin = createAdminClient();
  await admin.from("audit_deletions").insert({
    professional_id: me.user.id,
    entity_type: "patient",
    entity_id: params.id,
    action: newStatus ? "restore" : "deactivate",
    reason: newStatus ? "Reativado pelo profissional" : "Desativado pelo profissional",
  });

  return NextResponse.json({ success: true, is_active: newStatus });
}
