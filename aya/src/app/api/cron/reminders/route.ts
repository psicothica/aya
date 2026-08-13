import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { pickChannel, whenText, dispatch, type Kind } from "@/lib/notifications/send";
import { confirmUrl } from "@/lib/notifications/tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // sem segredo definido: liberado (dev)
  const header = req.headers.get("authorization");
  const q = new URL(req.url).searchParams.get("secret");
  return header === `Bearer ${secret}` || q === secret;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let sb;
  try { sb = createAdminClient(); }
  catch { return NextResponse.json({ error: "service role ausente" }, { status: 500 }); }

  const base = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  const nowISO = new Date().toISOString();
  const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  // 1) Enfileira lembretes para sessões agendadas nas próximas ~24h (sem lembrete ainda).
  const { data: appts } = await sb.from("appointments")
    .select("id, professional_id, patient_id, starts_at, status")
    .gte("starts_at", nowISO).lte("starts_at", in24h).eq("status", "scheduled");

  let createdReminders = 0;
  for (const a of appts ?? []) {
    const { data: existing } = await sb.from("notifications")
      .select("id").eq("appointment_id", a.id).eq("kind", "reminder").maybeSingle();
    if (existing) continue;
    const { data: patient } = await sb.from("patients").select("email, phone").eq("id", a.patient_id).maybeSingle();
    const pick = pickChannel({ email: patient?.email, phone: patient?.phone });
    if (!pick) continue;
    await sb.from("notifications").insert({
      professional_id: a.professional_id, appointment_id: a.id, kind: "reminder",
      channel: pick.channel, recipient: pick.recipient, status: "queued", scheduled_for: a.starts_at,
    });
    createdReminders++;
  }

  // 2) Envia tudo que está 'queued' (confirmações + lembretes).
  const { data: queued } = await sb.from("notifications").select("*").eq("status", "queued").limit(100);
  let sent = 0, failed = 0, skipped = 0;
  for (const n of queued ?? []) {
    if (!n.appointment_id || !n.recipient) {
      await sb.from("notifications").update({ status: "failed", error: "dados incompletos" }).eq("id", n.id); failed++; continue;
    }
    const { data: appt } = await sb.from("appointments")
      .select("starts_at, patient_id, professional_id").eq("id", n.appointment_id).maybeSingle();
    if (!appt) { await sb.from("notifications").update({ status: "failed", error: "sessão não encontrada" }).eq("id", n.id); failed++; continue; }
    const [{ data: patient }, { data: prof }] = await Promise.all([
      sb.from("patients").select("full_name").eq("id", appt.patient_id).maybeSingle(),
      sb.from("professional_profiles").select("display_name").eq("user_id", appt.professional_id).maybeSingle(),
    ]);
    const ctx = {
      patientName: patient?.full_name || "paciente",
      proName: prof?.display_name || "seu profissional",
      whenText: whenText(appt.starts_at),
      confirmUrl: confirmUrl(base, n.appointment_id),
    };
    const r = await dispatch(n.kind as Kind, n.channel, n.recipient, ctx);
    await sb.from("notifications").update({
      status: r.ok ? "sent" : r.skipped ? "skipped" : "failed",
      error: r.error ?? null, sent_at: r.ok ? new Date().toISOString() : null,
    }).eq("id", n.id);
    if (r.ok) sent++; else if (r.skipped) skipped++; else failed++;
  }

  return NextResponse.json({ createdReminders, sent, failed, skipped });
}
