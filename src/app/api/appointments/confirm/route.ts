import { NextRequest } from "next/server";
import { verifyConfirm } from "@/lib/notifications/tokens";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function page(title: string, message: string, ok = true) {
  const color = ok ? "#e8dbe1" : "#f0b3bd";
  const html =
    `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">` +
    `<title>${title} — AyA</title></head>` +
    `<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;` +
    `background:linear-gradient(180deg,#180b12,#6d3040,#1e0f18);font-family:Georgia,serif;color:#e8dbe1">` +
    `<div style="max-width:460px;padding:36px;text-align:center">` +
    `<div style="font-size:30px;letter-spacing:.16em">AyA</div>` +
    `<div style="color:#d8a6b0;font-style:italic;margin-bottom:22px">conectar, crescer e transformar</div>` +
    `<h1 style="font-size:22px;color:${color}">${title}</h1>` +
    `<p style="color:rgba(232,219,225,.8)">${message}</p></div></body></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const a = sp.get("a") || "";
  const exp = Number(sp.get("exp"));
  const sig = sp.get("sig") || "";

  if (!a || !sig || !verifyConfirm(a, exp, sig)) {
    return page("Link inválido", "Este link de confirmação é inválido ou expirou. Fale com seu profissional.", false);
  }
  try {
    const sb = createAdminClient();
    await sb.from("appointments").update({ patient_confirmed_at: new Date().toISOString() }).eq("id", a);
    return page("Presença confirmada", "Obrigado! Sua presença foi confirmada. Até breve.");
  } catch {
    return page("Ops", "Não foi possível confirmar agora. Tente novamente mais tarde.", false);
  }
}
