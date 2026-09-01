import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

// GET — lista os pacotes ativos do profissional autenticado.
export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supabase = createClient();
  const { data, error } = await supabase
    .from("service_packages")
    .select("*")
    .eq("professional_id", me.user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

// POST — cria um novo pacote de serviço.
export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) return NextResponse.json({ error: "title é obrigatório" }, { status: 400 });

  const numOrNull = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  const supabase = createClient();
  const { data, error } = await supabase
    .from("service_packages")
    .insert({
      professional_id: me.user.id,
      title,
      description: typeof body.description === "string" ? body.description.trim() || null : null,
      session_count: numOrNull(body.sessionCount),
      price_total: numOrNull(body.priceTotal),
      price_per_item: numOrNull(body.pricePerItem),
      valid_days: numOrNull(body.validDays),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
