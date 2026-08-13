const wrap = (bodyHtml: string) =>
  `<!doctype html><html><body style="margin:0;background:#1e0f18;font-family:Georgia,serif;color:#e8dbe1">` +
  `<div style="max-width:520px;margin:0 auto;padding:28px">` +
  `<div style="font-size:26px;letter-spacing:.14em">AyA</div>` +
  `<div style="color:#d8a6b0;font-style:italic;margin-bottom:18px">conectar, crescer e transformar</div>` +
  `<div style="background:rgba(255,255,255,.04);border:1px solid rgba(232,219,225,.14);border-radius:16px;padding:22px">${bodyHtml}</div>` +
  `<div style="color:rgba(232,219,225,.45);font-size:12px;margin-top:18px">Você recebeu este e-mail porque tem uma sessão agendada na AyA.</div>` +
  `</div></body></html>`;

const btn = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block;background:#733442;color:#e8dbe1;text-decoration:none;padding:12px 20px;border-radius:999px;margin-top:10px">${label}</a>`;

type Ctx = { patientName: string; proName: string; whenText: string; confirmUrl: string };

export function confirmationEmail(o: Ctx) {
  const subject = `Sua sessão com ${o.proName} foi agendada`;
  const html = wrap(
    `<p>Olá, ${o.patientName}.</p><p>Sua sessão com <strong>${o.proName}</strong> está agendada para <strong>${o.whenText}</strong>.</p>` +
    `<p>Pode confirmar sua presença por aqui:</p>${btn(o.confirmUrl, "Confirmar presença")}` +
    `<p style="color:rgba(232,219,225,.6);font-size:13px;margin-top:14px">Precisa remarcar? Responda este e-mail ou fale com ${o.proName}.</p>`
  );
  const text = `Olá, ${o.patientName}. Sua sessão com ${o.proName} está agendada para ${o.whenText}. Confirme: ${o.confirmUrl}`;
  return { subject, html, text };
}

export function reminderEmail(o: Ctx) {
  const subject = `Lembrete: sua sessão com ${o.proName} é ${o.whenText}`;
  const html = wrap(
    `<p>Olá, ${o.patientName}.</p><p>Passando para lembrar da sua sessão com <strong>${o.proName}</strong> em <strong>${o.whenText}</strong>.</p>` +
    `${btn(o.confirmUrl, "Confirmar presença")}` +
    `<p style="color:rgba(232,219,225,.6);font-size:13px;margin-top:14px">Precisa remarcar? Responda este e-mail ou fale com ${o.proName}.</p>`
  );
  const text = `Olá, ${o.patientName}. Lembrete da sua sessão com ${o.proName} em ${o.whenText}. Confirmar: ${o.confirmUrl}`;
  return { subject, html, text };
}
