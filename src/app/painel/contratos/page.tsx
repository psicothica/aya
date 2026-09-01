import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import PainelNav from "@/components/PainelNav";
import { saveContractTemplate, sendContractAssignment, deleteContractAssignment } from "@/app/painel/contratos/actions";
import { fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = { pending: "pendente", accepted: "aceito" };

export default async function PainelContratos() {
  const me = await getCurrentUser();
  if (!me) redirect("/entrar?next=/painel/contratos");
  if (!me.roles.includes("professional") && !me.roles.includes("admin")) redirect("/painel");

  const supabase = createClient();

  // O contrato-base do profissional: o próprio modelo (mais recente), ou — se
  // ele ainda não editou nenhum — o modelo do sistema, só para visualização/base.
  const { data: ownTemplate } = await supabase.from("contract_templates")
    .select("id, title, body").eq("author_id", me.user.id)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  const { data: systemTemplate } = await supabase.from("contract_templates")
    .select("id, title, body").is("author_id", null).maybeSingle();

  const activeTemplate = ownTemplate ?? systemTemplate ?? null;
  const editableId = ownTemplate?.id ?? null;

  const [{ data: patients }, { data: assignments }] = await Promise.all([
    supabase.from("patients").select("id, full_name").eq("professional_id", me.user.id).order("full_name"),
    supabase.from("contract_assignments").select("id, title, status, sent_at, patient_id")
      .eq("professional_id", me.user.id).order("sent_at", { ascending: false }),
  ]);
  const nameById = new Map((patients ?? []).map((p) => [p.id, p.full_name]));

  return (
    <main className="page">
      <div className="wrap">
        <p className="eyebrow">Painel</p>
        <h1 style={{ fontFamily: "var(--font-display)" }}>Contrato terapêutico</h1>
        <PainelNav />

        <section style={{ marginTop: "1.4rem" }}>
          <p className="eyebrow">Seu contrato-base</p>
          <p className="count-note">
            Edite livremente o texto abaixo. É o modelo usado ao enviar um contrato para um paciente
            {!ownTemplate && " — começando a partir do modelo padrão da AyA"}.
          </p>
          <form action={saveContractTemplate.bind(null, editableId)} className="card">
            <div className="field">
              <label>Título</label>
              <input className="input" name="title" defaultValue={activeTemplate?.title ?? "Contrato terapêutico"} required />
            </div>
            <div className="field">
              <label>Corpo do contrato</label>
              <textarea className="input" name="body" rows={20} required
                defaultValue={activeTemplate?.body ?? ""}
                style={{ whiteSpace: "pre-wrap", fontFamily: "var(--font-body)" }} />
            </div>
            <button className="btn btn--primary" type="submit">Salvar contrato-base</button>
          </form>
        </section>

        <section style={{ marginTop: "2.4rem" }}>
          <p className="eyebrow">Enviar a um paciente</p>
          {(!patients || patients.length === 0) ? (
            <p className="count-note">Nenhum paciente cadastrado ainda.</p>
          ) : !activeTemplate ? (
            <p className="count-note">Salve o contrato-base acima antes de enviar.</p>
          ) : (
            <form action={sendContractAssignment} className="form-inline card">
              <div className="field grow">
                <label>Paciente</label>
                <select className="input" name="patient_id" required defaultValue="">
                  <option value="" disabled>Selecione…</option>
                  {patients.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                </select>
              </div>
              <input type="hidden" name="template_id" value={activeTemplate.id} />
              <button className="btn btn--primary" type="submit">Enviar contrato</button>
            </form>
          )}
        </section>

        <section style={{ marginTop: "2.4rem" }}>
          <p className="eyebrow">Enviados</p>
          {(!assignments || assignments.length === 0) ? (
            <div className="empty">Nenhum contrato enviado ainda.</div>
          ) : assignments.map((a) => (
            <div className="list-row" key={a.id}>
              <div>
                <strong>{nameById.get(a.patient_id) ?? "Paciente"}</strong>
                <div className="meta-line">
                  {a.title} · <span className={"pill" + (a.status === "accepted" ? " ok" : "")}>{STATUS_LABEL[a.status] ?? a.status}</span> · enviado em {fmtDate(a.sent_at)}
                </div>
              </div>
              <div style={{ display: "flex", gap: ".5em" }}>
                <Link className="btn btn--quiet" href={`/painel/pacientes/${a.patient_id}`} style={{ padding: ".4em .9em" }}>Ver na ficha</Link>
                <form action={deleteContractAssignment.bind(null, a.id, a.patient_id)}>
                  <button className="btn btn--quiet" type="submit">Remover</button>
                </form>
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
