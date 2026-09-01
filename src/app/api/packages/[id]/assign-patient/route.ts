import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

// POST — contrata o pacote params.id para o paciente informado no corpo.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { patientId } = await req.json();
  if (!patientId) return NextResponse.json({ error: "patientId é obrigatório" }, { status: 400 });

  const supabase = createClient();

  const [{ data: patient }, { data: pkg }] = await Promise.all([
    supabase.from("patients").select("id").eq("id", patientId).eq("professional_id", me.user.id).maybeSingle(),
    supabase.from("service_packages").select("id").eq("id", params.id).eq("professional_id", me.user.id).maybeSingle(),
  ]);
  if (!patient) return NextResponse.json({ error: "patient_not_found" }, { status: 404 });
  if (!pkg) return NextResponse.json({ error: "package_not_found" }, { status: 404 });

  const { data, error } = await supabase
    .from("patient_packages")
    .insert({ patient_id: patientId, package_id: params.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
