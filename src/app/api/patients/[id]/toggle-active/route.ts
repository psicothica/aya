import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("📍 [toggle-active] iniciando", params.id);

    const me = await getCurrentUser();
    if (!me) {
      console.log("❌ [toggle-active] user não autenticado");
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const supabase = createClient();
    const { data: patient, error: fetchError } = await supabase
      .from("patients")
      .select("id, is_active, professional_id")
      .eq("id", params.id)
      .single();

    if (fetchError || !patient) {
      // Causa mais provável: migration 0009 (patients.is_active) ainda não
      // aplicada no banco, ou id inexistente.
      console.log("❌ [toggle-active] paciente não encontrado", fetchError);
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    if (patient.professional_id !== me.user.id) {
      console.log("❌ [toggle-active] acesso negado");
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const newStatus = !patient.is_active;
    console.log(`📍 [toggle-active] is_active ${patient.is_active} → ${newStatus}`);

    const { error: updateError } = await supabase
      .from("patients")
      .update({ is_active: newStatus })
      .eq("id", params.id);

    if (updateError) {
      console.log("❌ [toggle-active] erro ao atualizar", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Auditoria via service role — audit_deletions não aceita insert direto da
    // sessão do profissional (RLS só permite select do dono). Se isso falhar
    // (ex.: SUPABASE_SERVICE_ROLE_KEY ausente, ou migration 0009 não aplicada),
    // não derruba a resposta: o toggle em si já aconteceu.
    try {
      const admin = createAdminClient();
      const { error: auditError } = await admin.from("audit_deletions").insert({
        professional_id: me.user.id,
        entity_type: "patient",
        entity_id: params.id,
        action: newStatus ? "restore" : "deactivate",
        reason: newStatus ? "Reativado pelo profissional" : "Desativado pelo profissional",
        old_data: { is_active: patient.is_active },
      });
      if (auditError) console.warn("⚠️ [toggle-active] audit falhou (não crítico)", auditError);
    } catch (err) {
      console.warn("⚠️ [toggle-active] audit falhou (não crítico)", err);
    }

    console.log("✅ [toggle-active] sucesso");
    return NextResponse.json({ success: true, is_active: newStatus });
  } catch (error) {
    console.error("❌ [toggle-active] erro não tratado:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro desconhecido" },
      { status: 500 },
    );
  }
}
