"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function BookingRequestForm({
  professionalId, priceLabel, isAuthed,
}: { professionalId: string; priceLabel: string; isAuthed: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [when, setWhen] = useState("");
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  function start() {
    if (!isAuthed) { router.push("/entrar?next=" + encodeURIComponent(location.pathname)); return; }
    setOpen(true);
  }

  async function submit() {
    setError(null);
    if (!name.trim()) { setError("Informe seu nome."); return; }
    setState("busy");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setState("idle"); router.push("/entrar"); return; }
    const { error } = await supabase.from("booking_requests").insert({
      client_id: user.id, professional_id: professionalId,
      client_name: name.trim(), client_contact: contact.trim() || null,
      requested_at: when ? new Date(when).toISOString() : null,
      note: note.trim() || null,
    });
    if (error) { setState("idle"); setError("Não foi possível enviar a solicitação."); return; }
    setState("done");
  }

  if (state === "done") {
    return (
      <div className="card" style={{ marginTop: "1rem" }}>
        <h3 style={{ marginTop: 0 }}>Solicitação enviada</h3>
        <p className="sub">O profissional vai confirmar o horário. Acompanhe em <a href="/painel">Meu painel</a>.</p>
      </div>
    );
  }

  if (!open) {
    return (
      <button className="btn btn--primary" onClick={start}>
        Solicitar agendamento · {priceLabel}
      </button>
    );
  }

  return (
    <div className="card" style={{ marginTop: "1rem", maxWidth: 480 }}>
      <h3 style={{ marginTop: 0 }}>Solicitar agendamento</h3>
      <div className="field"><label>Seu nome</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Como quer ser chamado(a)" /></div>
      <div className="field"><label>Contato (telefone/WhatsApp)</label>
        <input className="input" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="(00) 00000-0000" /></div>
      <div className="field"><label>Horário desejado</label>
        <input className="input" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} /></div>
      <div className="field"><label>Observação (opcional)</label>
        <textarea className="input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Conte brevemente o que procura" /></div>
      {error && <p className="error">{error}</p>}
      <div className="iactions" style={{ margin: 0 }}>
        <button className="btn btn--primary" onClick={submit} disabled={state === "busy"}>
          {state === "busy" ? "Enviando…" : "Enviar solicitação"}
        </button>
        <button className="btn btn--quiet" onClick={() => setOpen(false)}>Cancelar</button>
      </div>
    </div>
  );
}
