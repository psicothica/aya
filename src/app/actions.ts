"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { Database } from "@/lib/database.types";

type Profession = Database["public"]["Enums"]["profession_type"];

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/entrar");
}

/**
 * Na primeira visita autenticada, se o cadastro indicou intenção profissional
 * e ainda não há perfil, cria professional_profiles como 'pending'. O papel
 * 'professional' e a aprovação ficam a cargo do admin (Seção 3.1 / RLS).
 */
export async function ensureProfessionalProfile() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  if (user.user_metadata?.intended_role !== "professional") return;

  const { data: existing } = await supabase
    .from("professional_profiles")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing) return;

  const profession = (user.user_metadata?.profession as Profession) ?? "psychologist";
  const displayName = (user.user_metadata?.full_name as string) ?? null;
  await supabase
    .from("professional_profiles")
    .insert({ user_id: user.id, profession, display_name: displayName, status: "pending" });
}

// --- Moderação do feed (somente admin; a RLS impõe isso) ---
async function requireAdmin() {
  const { getCurrentUser } = await import("@/lib/auth");
  const me = await getCurrentUser();
  if (!me || !me.roles.includes("admin")) throw new Error("Acesso restrito.");
  return me;
}

export async function approvePost(postId: string) {
  const me = await requireAdmin();
  const supabase = createClient();
  await supabase.from("posts").update({
    status: "published", published_at: new Date().toISOString(),
    moderated_by: me.user.id, moderated_at: new Date().toISOString(),
  }).eq("id", postId);
  revalidatePath("/admin/moderacao");
  revalidatePath("/feed");
}

export async function rejectPost(postId: string) {
  const me = await requireAdmin();
  const supabase = createClient();
  await supabase.from("posts").update({
    status: "rejected", moderated_by: me.user.id, moderated_at: new Date().toISOString(),
  }).eq("id", postId);
  revalidatePath("/admin/moderacao");
}

export async function archivePost(postId: string) {
  const me = await requireAdmin();
  const supabase = createClient();
  await supabase.from("posts").update({
    status: "archived", moderated_by: me.user.id, moderated_at: new Date().toISOString(),
  }).eq("id", postId);
  revalidatePath("/admin/moderacao");
  revalidatePath("/feed");
}
