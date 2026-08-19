import type { SendResult } from "./email";

export function whatsappConfigured(): boolean {
  return !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID);
}

// Envia uma mensagem de MODELO aprovado (Meta Cloud API). Para ativar:
//  1) tenha WhatsApp Business API (Meta ou provedor: Twilio, Z-API, Zenvia);
//  2) crie os templates aprovados (ex.: "confirmacao_sessao", "lembrete_sessao")
//     com 4 variáveis: {{1}} paciente, {{2}} profissional, {{3}} data/hora, {{4}} link;
//  3) defina WHATSAPP_TOKEN e WHATSAPP_PHONE_ID nas variáveis de ambiente.
export async function sendWhatsApp({ to, template, params }: {
  to: string; template: string; params: string[];
}): Promise<SendResult> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) return { ok: false, skipped: true, error: "WhatsApp não configurado" };
  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: template,
          language: { code: "pt_BR" },
          components: [{ type: "body", parameters: params.map((t) => ({ type: "text", text: t })) }],
        },
      }),
    });
    if (!res.ok) return { ok: false, error: `WhatsApp ${res.status}: ${await res.text()}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
