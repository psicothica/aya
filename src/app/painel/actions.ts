"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { pickChannel, whenText, dispatch } from "@/lib/notifications/send";
import { confirmUrl } from "@/lib/notifications/tokens";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Enfileira e tenta enviar (best-effort) a confirmação de uma sessão.
// Nunca lança — uma falha de e-mail jamais quebra a criação da sessão.
async function queueConfirmation(
  supabase: SupabaseClient<Database>,
  professionalId: string,
  appointmentId: string,
  patientId: string,
  startsAtISO: string,
) {
  try {
    const [{ data: patient }, { data: prof }] = await Promise.all([
      supabase.from("patients").select("full_name, email, phone").eq("id", patientId).maybeSingle(),
      supabase.from("professional_profiles").select("display_name").eq("user_id", professionalId).maybeSingle(),
    ]);
    const pick = pickChannel({ email: patient?.email, phone: patient?.phone });
    if (!pick) return;
    const { data: inserted } = await supabase.from("notifications").upsert(
      { professional_id: professionalId, appointment_id: appointmentId, kind: "confirmation",
        channel: pick.channel, recipient: pick.recipient, status: "queued" },
      { onConflict: "appointment_id,kind", ignoreDuplicates: true },
    ).select("id").maybeSingle();
    if (!inserted) return; // já enfileirada antes
    const base = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const ctx = {
      patientName: patient?.full_name || "paciente",
      proName: prof?.display_name || "seu profissional",
      whenText: whenText(startsAtISO),
      confirmUrl: confirmUrl(base, appointmentId),
    };
    const r = await dispatch("confirmation", pick.channel, pick.recipient, ctx);
    await supabase.from("notifications").update({
      status: r.ok ? "sent" : r.skipped ? "skipped" : "failed",
      error: r.error ?? null, sent_at: r.ok ? new Date().toISOString() : null,
    }).eq("id", inserted.id);
  } catch { /* silencioso por design */ }
}

async function requirePro() {
  const me = await getCurrentUser();
  if (!me) throw new Error("Não autenticado.");
  if (!me.roles.includes("professional") && !me.roles.includes("admin")) {
    throw new Error("Acesso restrito a profissionais.");
  }
  return me;
}

// Aceita uma solicitação: cria (ou reaproveita) o paciente e a sessão na agenda.
export async function acceptBooking(requestId: string) {
  const me = await requirePro();
  const supabase = createClient();

  const { data: req } = await supabase.from("booking_requests")
    .select("*").eq("id", requestId).eq("professional_id", me.user.id).maybeSingle();
  if (!req || req.status !== "requested") return;

  // paciente existente para este cliente?
  let patientId: string | null = null;
  if (req.client_id) {
    const { data: existing } = await supabase.from("patients")
      .select("id").eq("professional_id", me.user.id).eq("client_user_id", req.client_id).maybeSingle();
    patientId = existing?.id ?? null;
  }
  if (!patientId) {
    const { data: created } = await supabase.from("patients")
      .insert({ professional_id: me.user.id, client_user_id: req.client_id, full_name: req.client_name, phone: req.client_contact })
      .select("id").single();
    patientId = created?.id ?? null;
  }

  if (patientId) {
    const start = req.requested_at ? new Date(req.requested_at) : new Date();
    const end = new Date(start.getTime() + 50 * 60 * 1000);
    const { data: prof } = await supabase.from("professional_profiles")
      .select("price_min").eq("user_id", me.user.id).maybeSingle();
    const price = prof?.price_min ?? null;
    const { data: appt } = await supabase.from("appointments").insert({
      professional_id: me.user.id, patient_id: patientId,
      starts_at: start.toISOString(), ends_at: end.toISOString(), status: "scheduled", price,
    }).select("id").single();
    // Cobrança automática (pendente) a partir da sessão.
    if (appt && price && price > 0) {
      await supabase.from("financial_transactions").insert({
        professional_id: me.user.id, appointment_id: appt.id,
        kind: "income", amount: price, status: "pending", category: "Sessão",
      });
    }
    if (appt) await queueConfirmation(supabase, me.user.id, appt.id, patientId, start.toISOString());
  }
  await supabase.from("booking_requests").update({ status: "accepted" }).eq("id", requestId);
  revalidatePath("/painel/agenda");
  revalidatePath("/painel/financeiro");
  revalidatePath("/painel");
}

export async function declineBooking(requestId: string) {
  const me = await requirePro();
  const supabase = createClient();
  await supabase.from("booking_requests").update({ status: "declined" })
    .eq("id", requestId).eq("professional_id", me.user.id);
  revalidatePath("/painel/agenda");
}

export async function setAppointmentStatus(appointmentId: string, formData: FormData) {
  const me = await requirePro();
  const status = String(formData.get("status")) as "scheduled" | "completed" | "cancelled" | "no_show";
  const supabase = createClient();
  await supabase.from("appointments").update({ status })
    .eq("id", appointmentId).eq("professional_id", me.user.id);
  revalidatePath("/painel/agenda");
}

export async function addPatient(formData: FormData) {
  const me = await requirePro();
  const full_name = String(formData.get("full_name") ?? "").trim();
  if (!full_name) return;
  const supabase = createClient();
  await supabase.from("patients").insert({
    professional_id: me.user.id, full_name,
    phone: String(formData.get("phone") ?? "") || null,
    email: String(formData.get("email") ?? "") || null,
  });
  revalidatePath("/painel/pacientes");
}

// Atualiza os campos de perfil do paciente (ficha completa). Todos opcionais.
export async function updatePatientProfile(patientId: string, formData: FormData) {
  const me = await requirePro();
  const supabase = createClient();
  const str = (k: string) => { const v = String(formData.get(k) ?? "").trim(); return v || null; };
  await supabase.from("patients").update({
    full_name: str("full_name") ?? undefined,
    birth_date: str("birth_date"),
    gender: str("gender"),
    phone: str("phone"),
    email: str("email"),
    address: str("address"),
    occupation: str("occupation"),
    marital_status: str("marital_status"),
    emergency_contact_name: str("emergency_contact_name"),
    emergency_contact_phone: str("emergency_contact_phone"),
    notes_summary: str("notes_summary"),
  }).eq("id", patientId).eq("professional_id", me.user.id);
  revalidatePath(`/painel/pacientes/${patientId}`);
}

// Atualiza só o avatar (chamado após o upload no bucket privado 'patient-avatars').
export async function updatePatientAvatar(patientId: string, storagePath: string) {
  const me = await requirePro();
  const supabase = createClient();
  await supabase.from("patients").update({ avatar_url: storagePath })
    .eq("id", patientId).eq("professional_id", me.user.id);
  revalidatePath(`/painel/pacientes/${patientId}`);
  revalidatePath("/painel/pacientes");
}

// Ativa/desativa um paciente (soft delete leve — não some, só sai das
// listagens padrão). Auditado em audit_deletions via service role, já que
// essa tabela não aceita insert direto da sessão do profissional.
export async function togglePatientActive(patientId: string) {
  console.log("📍 [togglePatientActive] iniciando", patientId);
  const me = await requirePro();

  const supabase = createClient();
  const { data: patient, error: fetchError } = await supabase
    .from("patients")
    .select("is_active")
    .eq("id", patientId)
    .eq("professional_id", me.user.id)
    .single();

  if (fetchError || !patient) {
    // Causa mais provável se aparecer em produção: migration 0009 (que adiciona
    // patients.is_active) ainda não foi aplicada no banco Supabase do projeto.
    console.error("❌ [togglePatientActive] paciente não encontrado ou coluna is_active ausente", fetchError);
    throw new Error(fetchError ? `Erro ao buscar paciente: ${fetchError.message}` : "Paciente não encontrado.");
  }

  const newStatus = !patient.is_active;
  console.log(`📍 [togglePatientActive] is_active ${patient.is_active} → ${newStatus}`);

  const { error: updateError } = await supabase
    .from("patients").update({ is_active: newStatus }).eq("id", patientId);
  if (updateError) {
    console.error("❌ [togglePatientActive] erro ao atualizar", updateError);
    throw new Error(`Erro ao atualizar paciente: ${updateError.message}`);
  }

  try {
    const admin = createAdminClient();
    const { error: auditError } = await admin.from("audit_deletions").insert({
      professional_id: me.user.id,
      entity_type: "patient",
      entity_id: patientId,
      action: newStatus ? "restore" : "deactivate",
      reason: newStatus ? "Reativado pelo profissional" : "Desativado pelo profissional",
    });
    if (auditError) console.warn("⚠️ [togglePatientActive] audit falhou (não crítico)", auditError);
  } catch (err) {
    // Causa mais provável: migration 0009 (tabela audit_deletions) ausente, ou
    // SUPABASE_SERVICE_ROLE_KEY não configurada no ambiente. Não bloqueia o toggle.
    console.warn("⚠️ [togglePatientActive] audit falhou (não crítico)", err);
  }

  console.log("✅ [togglePatientActive] sucesso");
  revalidatePath(`/painel/pacientes/${patientId}`);
  revalidatePath("/painel/pacientes");
}

export async function addClinicalNote(patientId: string, formData: FormData) {
  const me = await requirePro();
  const content = String(formData.get("content") ?? "").trim();
  if (!content) return;
  const supabase = createClient();
  await supabase.from("clinical_notes").insert({
    professional_id: me.user.id, patient_id: patientId, content,
  });
  revalidatePath(`/painel/pacientes/${patientId}`);
}

export async function addTransaction(formData: FormData) {
  const me = await requirePro();
  const amount = Number(formData.get("amount"));
  if (Number.isNaN(amount) || amount <= 0) return;
  const kind = String(formData.get("kind")) as "income" | "expense";
  const supabase = createClient();
  await supabase.from("financial_transactions").insert({
    professional_id: me.user.id, kind, amount,
    category: String(formData.get("category") ?? "") || null,
    status: (String(formData.get("status")) as "paid" | "pending") || "pending",
  });
  revalidatePath("/painel/financeiro");
}

export async function setTransactionStatus(txId: string, formData: FormData) {
  const me = await requirePro();
  const status = String(formData.get("status")) as "paid" | "pending";
  const supabase = createClient();
  await supabase.from("financial_transactions").update({ status })
    .eq("id", txId).eq("professional_id", me.user.id);
  revalidatePath("/painel/financeiro");
}

// Cria uma sessão manualmente (paciente existente) + cobrança pendente automática.
export async function createAppointment(formData: FormData) {
  const me = await requirePro();
  const patient_id = String(formData.get("patient_id") ?? "");
  const startsRaw = String(formData.get("starts_at") ?? "");
  if (!patient_id || !startsRaw) return;
  const priceRaw = Number(formData.get("price"));
  const price = Number.isNaN(priceRaw) || priceRaw <= 0 ? null : priceRaw;
  const supabase = createClient();
  const start = new Date(startsRaw);
  const end = new Date(start.getTime() + 50 * 60 * 1000);
  const { data: appt } = await supabase.from("appointments").insert({
    professional_id: me.user.id, patient_id,
    starts_at: start.toISOString(), ends_at: end.toISOString(), status: "scheduled", price,
  }).select("id").single();
  if (appt && price) {
    await supabase.from("financial_transactions").insert({
      professional_id: me.user.id, appointment_id: appt.id,
      kind: "income", amount: price, status: "pending", category: "Sessão",
    });
  }
  if (appt) await queueConfirmation(supabase, me.user.id, appt.id, patient_id, start.toISOString());
  revalidatePath("/painel/agenda");
  revalidatePath("/painel/financeiro");
}

// --- Fase 3: árvore relacional familiar (privada do profissional) ---
export async function addFamilyNode(patientId: string, formData: FormData) {
  const me = await requirePro();
  const label = String(formData.get("label") ?? "").trim();
  if (!label) return;
  const relation = String(formData.get("relation") ?? "").trim();
  const supabase = createClient();
  await supabase.from("family_tree_nodes").insert({
    professional_id: me.user.id, patient_id: patientId, label,
    meta: relation ? { relation } : {},
  });
  revalidatePath(`/painel/pacientes/${patientId}`);
}

export async function addFamilyRelation(patientId: string, formData: FormData) {
  const me = await requirePro();
  const from_node_id = String(formData.get("from_node_id") ?? "");
  const to_node_id = String(formData.get("to_node_id") ?? "");
  if (!from_node_id || !to_node_id || from_node_id === to_node_id) return;
  const supabase = createClient();
  await supabase.from("family_relations").insert({
    professional_id: me.user.id, from_node_id, to_node_id,
    relation_label: String(formData.get("relation_label") ?? "") || null,
  });
  revalidatePath(`/painel/pacientes/${patientId}`);
}

export async function deleteFamilyNode(nodeId: string, patientId: string) {
  const me = await requirePro();
  const supabase = createClient();
  // remove relações que tocam o nó e depois o nó (tudo escopado ao profissional pela RLS)
  await supabase.from("family_relations").delete()
    .eq("professional_id", me.user.id)
    .or(`from_node_id.eq.${nodeId},to_node_id.eq.${nodeId}`);
  await supabase.from("family_tree_nodes").delete().eq("id", nodeId).eq("professional_id", me.user.id);
  revalidatePath(`/painel/pacientes/${patientId}`);
}

// --- Registro de sessão (prontuário estruturado; confidencial) ---
export async function addSessionRecord(patientId: string, formData: FormData) {
  const me = await requirePro();
  const supabase = createClient();
  const str = (k: string) => { const v = String(formData.get(k) ?? "").trim(); return v || null; };
  const moodRaw = Number(formData.get("mood_scale"));
  await supabase.from("session_records").insert({
    professional_id: me.user.id, patient_id: patientId,
    session_date: str("session_date") ?? new Date().toISOString().slice(0, 10),
    mood_scale: Number.isFinite(moodRaw) && String(formData.get("mood_scale")) !== "" ? moodRaw : null,
    mood_notes: str("mood_notes"),
    risk_level: str("risk_level"),
    risk_notes: str("risk_notes"),
    medication_notes: str("medication_notes"),
    sleep_notes: str("sleep_notes"),
    eating_notes: str("eating_notes"),
    physical_notes: str("physical_notes"),
    mobility_notes: str("mobility_notes"),
    social_notes: str("social_notes"),
    general_notes: str("general_notes"),
  });
  revalidatePath(`/painel/pacientes/${patientId}`);
}
