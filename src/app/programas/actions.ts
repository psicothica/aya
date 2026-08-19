"use server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function requirePro() {
  const me = await getCurrentUser();
  if (!me || (!me.roles.includes("professional") && !me.roles.includes("admin"))) throw new Error("Restrito a profissionais.");
  return me;
}

export async function acquireProgram(programId: string) {
  const me = await requirePro();
  const supabase = createClient();
  await supabase.from("program_licenses").upsert(
    { professional_id: me.user.id, program_id: programId, paid: false },
    { onConflict: "professional_id,program_id", ignoreDuplicates: true },
  );
  revalidatePath(`/programas/${programId}`);
  revalidatePath("/painel/programas");
}

export async function assignProgram(formData: FormData) {
  const me = await requirePro();
  const programId = String(formData.get("program_id") ?? "");
  const patientId = String(formData.get("patient_id") ?? "");
  if (!programId || !patientId) return;
  const supabase = createClient();

  const { data: lic } = await supabase.from("program_licenses").select("id")
    .eq("professional_id", me.user.id).eq("program_id", programId).maybeSingle();
  if (!lic) return;
  const { data: patient } = await supabase.from("patients").select("id, client_user_id")
    .eq("id", patientId).eq("professional_id", me.user.id).maybeSingle();
  if (!patient) return;
  const { data: prog } = await supabase.from("programs").select("title").eq("id", programId).maybeSingle();

  const { data: assignment } = await supabase.from("program_assignments").insert({
    professional_id: me.user.id, patient_id: patient.id, patient_user_id: patient.client_user_id,
    program_id: programId, title: prog?.title ?? "Programa",
  }).select("id").single();
  if (!assignment) return;

  const { data: acts } = await supabase.from("program_activities")
    .select("position, title, instructions").eq("program_id", programId).order("position", { ascending: true });
  if (acts && acts.length) {
    await supabase.from("assignment_activities").insert(acts.map((a) => ({
      assignment_id: assignment.id, professional_id: me.user.id, patient_user_id: patient.client_user_id,
      position: a.position, title: a.title, instructions: a.instructions,
    })));
  }
  revalidatePath("/painel/programas");
  redirect(`/painel/programas/${assignment.id}`);
}

export async function addAssignmentActivity(assignmentId: string, formData: FormData) {
  const me = await requirePro();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const supabase = createClient();
  const { data: a } = await supabase.from("program_assignments").select("patient_user_id")
    .eq("id", assignmentId).eq("professional_id", me.user.id).maybeSingle();
  if (!a) return;
  await supabase.from("assignment_activities").insert({
    assignment_id: assignmentId, professional_id: me.user.id, patient_user_id: a.patient_user_id,
    title, instructions: String(formData.get("instructions") ?? "") || null,
  });
  revalidatePath(`/painel/programas/${assignmentId}`);
}

export async function deleteAssignmentActivity(activityId: string, assignmentId: string) {
  const me = await requirePro();
  const supabase = createClient();
  await supabase.from("assignment_activities").delete().eq("id", activityId).eq("professional_id", me.user.id);
  revalidatePath(`/painel/programas/${assignmentId}`);
}
