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

const numOrNull = (v: FormDataEntryValue | null) => {
  if (v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

// Cria um novo pacote de serviço (ex.: "10 sessões de TCC — R$ 1200").
export async function createPackage(formData: FormData) {
  const me = await requirePro();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const supabase = createClient();
  await supabase.from("service_packages").insert({
    professional_id: me.user.id,
    title,
    description: String(formData.get("description") ?? "").trim() || null,
    session_count: numOrNull(formData.get("session_count")),
    price_total: numOrNull(formData.get("price_total")),
    price_per_item: numOrNull(formData.get("price_per_item")),
    valid_days: numOrNull(formData.get("valid_days")),
  });
  revalidatePath("/painel/pacotes");
}

// Contrata um pacote para um paciente do próprio profissional. expires_at é
// calculado automaticamente por trigger a partir de service_packages.valid_days.
export async function assignPackageToPatient(packageId: string, formData: FormData) {
  const me = await requirePro();
  const patientId = String(formData.get("patient_id") ?? "");
  if (!patientId) return;

  const supabase = createClient();
  const [{ data: patient }, { data: pkg }] = await Promise.all([
    supabase.from("patients").select("id").eq("id", patientId).eq("professional_id", me.user.id).maybeSingle(),
    supabase.from("service_packages").select("id").eq("id", packageId).eq("professional_id", me.user.id).maybeSingle(),
  ]);
  if (!patient) throw new Error("Paciente não encontrado.");
  if (!pkg) throw new Error("Pacote não encontrado.");

  await supabase.from("patient_packages").insert({ patient_id: patientId, package_id: packageId });
  revalidatePath("/painel/pacotes");
}
