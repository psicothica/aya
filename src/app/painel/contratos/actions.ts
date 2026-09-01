"use server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function requirePro() {
  const me = await getCurrentUser();
  if (!me || (!me.roles.includes("professional") && !me.roles.includes("admin"))) {
    throw new Error("Restrito a profissionais.");
  }
  return me;
}

// Cria (na primeira vez) ou atualiza o contrato-base do profissional. Um único
// modelo próprio por profissional — se ainda não existir, é criado a partir do
// título/corpo enviados (tipicamente uma cópia do modelo do sistema).
export async function saveContractTemplate(templateId: string | null, formData: FormData) {
  const me = await requirePro();
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!title || !body) return;
  const supabase = createClient();

  if (templateId) {
    await supabase.from("contract_templates")
      .update({ title, body }).eq("id", templateId).eq("author_id", me.user.id);
  } else {
    await supabase.from("contract_templates").insert({ author_id: me.user.id, title, body });
  }
  revalidatePath("/painel/contratos");
}

// Envia (atribui) o contrato-base atual do profissional a um paciente — snapshot
// imutável do texto no momento do envio.
export async function sendContractAssignment(formData: FormData) {
  const me = await requirePro();
  const patientId = String(formData.get("patient_id") ?? "");
  const templateId = String(formData.get("template_id") ?? "");
  if (!patientId || !templateId) return;
  const supabase = createClient();

  const { data: patient } = await supabase.from("patients").select("id, client_user_id")
    .eq("id", patientId).eq("professional_id", me.user.id).maybeSingle();
  if (!patient) return;

  const { data: template } = await supabase.from("contract_templates")
    .select("title, body, version").eq("id", templateId)
    .or(`author_id.eq.${me.user.id},author_id.is.null`).maybeSingle();
  if (!template) return;

  await supabase.from("contract_assignments").insert({
    professional_id: me.user.id, patient_id: patient.id, patient_user_id: patient.client_user_id,
    title: template.title, body: template.body, version: template.version,
  });
  revalidatePath("/painel/contratos");
  revalidatePath(`/painel/pacientes/${patientId}`);
}

export async function deleteContractAssignment(assignmentId: string, patientId: string) {
  const me = await requirePro();
  const supabase = createClient();
  await supabase.from("contract_assignments").delete().eq("id", assignmentId).eq("professional_id", me.user.id);
  revalidatePath("/painel/contratos");
  revalidatePath(`/painel/pacientes/${patientId}`);
}

// Aceite do paciente — "Li e concordo". Insere o registro de aceite (imutável,
// tabela separada — o paciente não tem UPDATE em contract_assignments, então
// não edita o corpo do contrato). Um trigger no banco (SECURITY DEFINER) marca
// a atribuição como aceita a partir deste INSERT — ver migration 0008.
export async function acceptContract(assignmentId: string, formData: FormData) {
  const me = await getCurrentUser();
  if (!me) throw new Error("Não autenticado.");
  const supabase = createClient();

  const { data: assignment } = await supabase.from("contract_assignments")
    .select("id, patient_user_id, status").eq("id", assignmentId).maybeSingle();
  if (!assignment || assignment.patient_user_id !== me.user.id) return;
  if (assignment.status === "accepted") return;

  await supabase.from("contract_acceptances").insert({
    assignment_id: assignmentId, patient_user_id: me.user.id,
    accepted_meta: String(formData.get("user_agent") ?? "") || null,
  });

  revalidatePath("/meus-contratos");
  revalidatePath(`/meus-contratos/${assignmentId}`);
  revalidatePath("/painel/contratos");
}
