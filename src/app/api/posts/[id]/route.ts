import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supabase = createClient();
  const { data: post } = await supabase
    .from("posts")
    .select("*")
    .eq("id", params.id)
    .eq("author_id", me.user.id)
    .single();

  if (!post) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { error } = await supabase
    .from("posts")
    .update({ deleted_at: new Date().toISOString(), deletion_reason: "Excluído pelo autor" })
    .eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const admin = createAdminClient();
  await admin.from("audit_deletions").insert({
    professional_id: me.user.id,
    entity_type: "post",
    entity_id: params.id,
    action: "soft_delete",
    reason: "Excluído pelo autor",
    old_data: { title: post.title },
  });

  return NextResponse.json({ success: true });
}
