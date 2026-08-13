import { sendEmail, emailConfigured, type SendResult } from "./email";
import { sendWhatsApp, whatsappConfigured } from "./whatsapp";
import { confirmationEmail, reminderEmail } from "./templates";

export type Channel = "email" | "whatsapp";
export type Kind = "confirmation" | "reminder";
export type DispatchCtx = { patientName: string; proName: string; whenText: string; confirmUrl: string };

// Preferência: WhatsApp (se configurado e há telefone) > e-mail. Se nada estiver
// configurado ainda, cai para 'email' quando há e-mail (fica registrado como skipped).
export function pickChannel(o: { email?: string | null; phone?: string | null }): { channel: Channel; recipient: string } | null {
  if (whatsappConfigured() && o.phone) return { channel: "whatsapp", recipient: o.phone };
  if (o.email) return { channel: "email", recipient: o.email };
  if (whatsappConfigured() && o.phone) return { channel: "whatsapp", recipient: o.phone };
  return null;
}

export function whenText(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit",
  });
}

export async function dispatch(kind: Kind, channel: string, recipient: string, ctx: DispatchCtx): Promise<SendResult> {
  if (channel === "email") {
    const msg = kind === "confirmation" ? confirmationEmail(ctx) : reminderEmail(ctx);
    if (!emailConfigured()) return { ok: false, skipped: true, error: "e-mail não configurado" };
    return sendEmail({ to: recipient, ...msg });
  }
  if (channel === "whatsapp") {
    const template = kind === "confirmation"
      ? (process.env.WA_TEMPLATE_CONFIRM || "confirmacao_sessao")
      : (process.env.WA_TEMPLATE_REMINDER || "lembrete_sessao");
    return sendWhatsApp({ to: recipient, template, params: [ctx.patientName, ctx.proName, ctx.whenText, ctx.confirmUrl] });
  }
  return { ok: false, skipped: true, error: `canal ${channel} não suportado` };
}
