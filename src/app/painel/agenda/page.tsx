import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import PainelNav from "@/components/PainelNav";
import { fmtDateTime, APPT_STATUS_LABEL } from "@/lib/format";
import { acceptBooking, declineBooking, setAppointmentStatus, createAppointment } from "@/app/painel/actions";

export const dynamic = "force-dynamic";

export default async function AgendaPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/entrar?next=/painel/agenda");
  if (!me.roles.includes("professional") && !me.roles.includes("admin")) redirect("/painel");

  const supabase = createClient();
  const [{ data: requests }, { data: patients }, { data: appts }] = await Promise.all([
    supabase.from("booking_requests").select("*").eq("professional_id", me.user.id).eq("status", "requested").order("created_at", { ascending: true }),
    supabase.from("patients").select("id, full_name").eq("professional_id", me.user.id),
    supabase.from("appointments").select("*").eq("professional_id", me.user.id).order("starts_at", { ascending: true }),
  ]);
  const nameById = new Map((patients ?? []).map((p) => [p.id, p.full_name]));

  return (
    <main className="page">
      <div className="wrap">
        <p className="eyebrow">Painel</p>
        <h1 style={{ fontFamily: "var(--font-display)" }}>Agenda</h1>
        <PainelNav />

        <section style={{ marginBottom: "2.4rem" }}>
          <p className="eyebrow">Solicitações de agendamento</p>
          {(!requests || requests.length === 0) ? (
            <div className="empty">Nenhuma solicitação pendente.</div>
          ) : requests.map((r) => (
            <div className="list-row" key={r.id}>
              <div>
                <strong>{r.client_name}</strong>
                <div className="meta-line">{fmtDateTime(r.requested_at)}{r.client_contact ? ` · ${r.client_contact}` : ""}</div>
                {r.note && <div className="post-excerpt" style={{ marginTop: ".3em" }}>{r.note}</div>}
              </div>
              <div className="iactions" style={{ margin: 0 }}>
                <form action={acceptBooking.bind(null, r.id)}><button className="btn btn--primary" type="submit">Aceitar</button></form>
                <form action={declineBooking.bind(null, r.id)}><button className="btn btn--quiet" type="submit">Recusar</button></form>
              </div>
            </div>
          ))}
        </section>

        <section style={{ marginBottom: "2.4rem" }}>
          <p className="eyebrow">Nova sessão</p>
          {(!patients || patients.length === 0) ? (
            <p className="count-note">Cadastre um paciente para agendar uma sessão.</p>
          ) : (
            <form action={createAppointment} className="filters">
              <select name="patient_id" className="input" required defaultValue="">
                <option value="" disabled>Paciente…</option>
                {patients.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
              <input name="starts_at" type="datetime-local" className="input" required />
              <input name="price" type="number" step="0.01" min="0" className="input" placeholder="Valor (R$)" style={{ maxWidth: 150 }} />
              <button className="btn btn--primary" type="submit">Agendar</button>
            </form>
          )}
        </section>

        <section>
          <p className="eyebrow">Sessões</p>
          {(!appts || appts.length === 0) ? (
            <div className="empty">Sem sessões ainda. Elas aparecem quando você aceita uma solicitação.</div>
          ) : appts.map((a) => (
            <div className="list-row" key={a.id}>
              <div>
                <strong>{nameById.get(a.patient_id) ?? "Paciente"}</strong>
                <div className="meta-line">{fmtDateTime(a.starts_at)}{a.patient_confirmed_at ? " · ✓ confirmada pelo paciente" : ""}</div>
              </div>
              <div className="iactions" style={{ margin: 0, alignItems: "center" }}>
                <span className="pill">{APPT_STATUS_LABEL[a.status] ?? a.status}</span>
                <form action={setAppointmentStatus.bind(null, a.id)} className="iactions" style={{ margin: 0, gap: 6 }}>
                  <select name="status" defaultValue={a.status} className="input" style={{ padding: ".4em .6em" }}>
                    <option value="scheduled">Agendada</option>
                    <option value="completed">Realizada</option>
                    <option value="cancelled">Cancelada</option>
                    <option value="no_show">Faltou</option>
                  </select>
                  <button className="btn btn--ghost" type="submit" style={{ padding: ".45em .9em" }}>Salvar</button>
                </form>
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
