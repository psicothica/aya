import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

type Modality = Database["public"]["Enums"]["attendance_modality"];
type Profession = Database["public"]["Enums"]["profession_type"];

export type DirectoryFilters = {
  q?: string;
  profession?: Profession;
  modality?: Modality;
  uf?: string;
  maxPrice?: number;
};

// Sanitiza texto para uso no operador .or() do PostgREST (vírgula/parênteses quebram a sintaxe).
function clean(s: string): string {
  return s.replace(/[,()%]/g, " ").trim();
}

export async function getApprovedProfessionals(f: DirectoryFilters = {}) {
  const supabase = createClient();
  let query = supabase
    .from("professional_profiles")
    .select("user_id, display_name, profession, headline, approach, specialties, modalities, city, uf, price_min, price_max, avatar_url")
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (f.profession) query = query.eq("profession", f.profession);
  if (f.modality) query = query.contains("modalities", [f.modality]);
  if (f.uf) query = query.eq("uf", f.uf.toUpperCase());
  if (typeof f.maxPrice === "number" && !Number.isNaN(f.maxPrice)) {
    query = query.lte("price_min", f.maxPrice);
  }
  if (f.q) {
    const q = clean(f.q);
    if (q) query = query.or(`display_name.ilike.%${q}%,headline.ilike.%${q}%,approach.ilike.%${q}%`);
  }

  const { data, error } = await query;
  if (error) return [];
  return data ?? [];
}

export async function getProfessionalById(id: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("professional_profiles")
    .select("*")
    .eq("user_id", id)
    .eq("status", "approved")
    .maybeSingle();
  return data;
}

export async function getPublishedPosts(category?: string) {
  const supabase = createClient();
  let query = supabase
    .from("posts")
    .select("id, author_id, title, body, category, tags, media, published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false });
  if (category) query = query.eq("category", category);
  const { data } = await query;
  return data ?? [];
}

export async function getFeedCategories(): Promise<string[]> {
  const supabase = createClient();
  const { data } = await supabase.from("posts").select("category").eq("status", "published");
  const set = new Set<string>();
  (data ?? []).forEach((r) => { if (r.category) set.add(r.category); });
  return Array.from(set).sort();
}

export async function getPostById(id: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("posts")
    .select("*")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();
  return data;
}

export async function getActivities() {
  const supabase = createClient();
  const { data } = await supabase
    .from("activities")
    .select("*")
    .neq("status", "cancelled")
    .order("starts_at", { ascending: true });
  return data ?? [];
}

export async function getApps() {
  const supabase = createClient();
  const { data } = await supabase
    .from("apps")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: true });
  return data ?? [];
}

// Nome público do autor de um post (via professional_profiles, que é legível).
export async function getAuthorNames(ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (ids.length === 0) return map;
  const supabase = createClient();
  const { data } = await supabase
    .from("professional_profiles")
    .select("user_id, display_name")
    .in("user_id", Array.from(new Set(ids)));
  (data ?? []).forEach((r) => { if (r.display_name) map.set(r.user_id, r.display_name); });
  return map;
}
