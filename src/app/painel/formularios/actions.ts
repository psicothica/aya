"use server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type QuestionKind = "short_text" | "long_text" | "scale" | "multiple_choice" | "yes_no";
export type QuestionDraft = {
  section: string | null;
  kind: QuestionKind;
  label: string;
  help_text: string | null;
  options: string[] | null;
  required: boolean;
};

async function requirePro() {
  const me = await getCurrentUser();
  if (!me || (!me.roles.includes("professional") && !me.roles.includes("admin"))) {
    throw new Error("Restrito a profissionais.");
  }
  return me;
}

// Cria ou atualiza um modelo de formulário + suas perguntas (substituídas por inteiro).
export async function saveFormTemplate(templateId: string | null, formData: FormData) {
  const me = await requirePro();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const supabase = createClient();

  let questions: QuestionDraft[] = [];
  try {
    questions = JSON.parse(String(formData.get("questions_json") ?? "[]"));
  } catch {
    questions = [];
  }

  const payload = {
    title,
    description: String(formData.get("description") ?? "").trim() || null,
    category: String(formData.get("category") ?? "").trim() || null,
    default_respondent: (String(formData.get("default_respondent") ?? "professional") as "professional" | "patient"),
  };

  let id = templateId;
  if (id) {
    await supabase.from("form_templates").update(payload).eq("id", id).eq("author_id", me.user.id);
    await supabase.from("form_template_questions").delete().eq("template_id", id).eq("author_id", me.user.id);
  } else {
    const { data } = await supabase.from("form_templates")
      .insert({ ...payload, author_id: me.user.id }).select("id").single();
    id = data?.id ?? null;
  }
  if (!id) return;

  if (questions.length) {
    await supabase.from("form_template_questions").insert(
      questions.filter((q) => q.label?.trim()).map((q, i) => ({
        template_id: id as string,
        author_id: me.user.id,
        section: q.section?.trim() || null,
        position: i,
        kind: q.kind,
        label: q.label.trim(),
        help_text: q.help_text?.trim() || null,
        options: q.options && q.options.length ? q.options : null,
        required: !!q.required,
      })),
    );
  }
  revalidatePath("/painel/formularios");
  redirect("/painel/formularios");
}

export async function deleteFormTemplate(templateId: string) {
  const me = await requirePro();
  const supabase = createClient();
  await supabase.from("form_templates").delete().eq("id", templateId).eq("author_id", me.user.id);
  revalidatePath("/painel/formularios");
}

// Envia (atribui) um modelo a um paciente — copia as perguntas do modelo para a atribuição.
export async function sendFormAssignment(patientId: string, formData: FormData) {
  const me = await requirePro();
  const templateId = String(formData.get("template_id") ?? "");
  const respondent = String(formData.get("respondent") ?? "");
  if (!templateId || (respondent !== "professional" && respondent !== "patient")) return;
  const supabase = createClient();

  const { data: patient } = await supabase.from("patients").select("id, client_user_id")
    .eq("id", patientId).eq("professional_id", me.user.id).maybeSingle();
  if (!patient) return;
  if (respondent === "patient" && !patient.client_user_id) return; // sem conta vinculada: paciente não teria como preencher

  const { data: template } = await supabase.from("form_templates").select("title, description")
    .eq("id", templateId).maybeSingle();
  if (!template) return;

  const { data: assignment } = await supabase.from("form_assignments").insert({
    professional_id: me.user.id, patient_id: patient.id, patient_user_id: patient.client_user_id,
    template_id: templateId, title: template.title, description: template.description, respondent,
  }).select("id").single();
  if (!assignment) return;

  const { data: qs } = await supabase.from("form_template_questions")
    .select("section, position, kind, label, help_text, options, required")
    .eq("template_id", templateId).order("position", { ascending: true });
  if (qs && qs.length) {
    await supabase.from("form_assignment_questions").insert(qs.map((q) => ({
      assignment_id: assignment.id, professional_id: me.user.id, patient_user_id: patient.client_user_id,
      section: q.section, position: q.position, kind: q.kind, label: q.label,
      help_text: q.help_text, options: q.options, required: q.required,
    })));
  }
  revalidatePath(`/painel/pacientes/${patientId}`);
}

export async function deleteFormAssignment(assignmentId: string, patientId: string) {
  const me = await requirePro();
  const supabase = createClient();
  await supabase.from("form_assignments").delete().eq("id", assignmentId).eq("professional_id", me.user.id);
  revalidatePath(`/painel/pacientes/${patientId}`);
}

// Salva as respostas de uma atribuição — chamada tanto pelo profissional quanto pelo paciente,
// dependendo de quem é o `respondent`. Marca a atribuição como concluída ao final.
export async function saveFormResponses(assignmentId: string, formData: FormData) {
  const me = await getCurrentUser();
  if (!me) throw new Error("Não autenticado.");
  const supabase = createClient();

  const { data: assignment } = await supabase.from("form_assignments")
    .select("id, professional_id, patient_id, patient_user_id, respondent")
    .eq("id", assignmentId).maybeSingle();
  if (!assignment) return;

  const isPro = assignment.respondent === "professional" && assignment.professional_id === me.user.id;
  const isPatient = assignment.respondent === "patient" && assignment.patient_user_id === me.user.id;
  if (!isPro && !isPatient) return;

  const { data: questions } = await supabase.from("form_assignment_questions")
    .select("id, kind").eq("assignment_id", assignmentId);
  if (!questions) return;

  for (const q of questions) {
    const raw = formData.get(`answer_${q.id}`);
    if (raw === null) continue;
    const str = String(raw).trim();
    let value_number: number | null = null;
    let value_bool: boolean | null = null;
    let value_text: string | null = null;
    if (q.kind === "scale") {
      const n = Number(str);
      value_number = str !== "" && Number.isFinite(n) ? n : null;
    } else if (q.kind === "yes_no") {
      value_bool = str === "" ? null : str === "true";
    } else {
      value_text = str || null;
    }
    await supabase.from("form_responses").upsert({
      assignment_question_id: q.id, assignment_id: assignmentId,
      professional_id: assignment.professional_id, patient_user_id: assignment.patient_user_id,
      value_number, value_bool, value_text, updated_at: new Date().toISOString(),
    }, { onConflict: "assignment_question_id" });
  }

  await supabase.from("form_assignments")
    .update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", assignmentId);

  revalidatePath(`/painel/pacientes/${assignment.patient_id}`);
  revalidatePath(`/painel/formularios/preencher/${assignmentId}`);
  revalidatePath("/meus-formularios");
  revalidatePath(`/meus-formularios/${assignmentId}`);
}
