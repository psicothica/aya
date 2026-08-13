import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { addClinicalNote, addFamilyNode, addFamilyRelation, deleteFamilyNode } from "@/app/painel/actions";
import DocumentUpload from "@/components/DocumentUpload";
import FamilyTree from "@/components/FamilyTree";
import { fmtDateTime, fmtDate, APPT_STATUS_LABEL } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PatientDetail({ params }: { params: { id: string } }) {
  const me = await getCurrentUser();
  if (!me) redirect("/entrar");
  if (!me.roles.includes("professional") && !me.roles.includes("admin")) redirect("/painel");

  const supabase = createClient();
  const { data: patient } = await supabase.from("patients").select("*")
    .eq("id", params.id).eq("professional_id", me.user.id).maybeSingle();
  if (!patient) notFound();

  const [{ data: notes }, { data: appts }, { data: docs }] = await Promise.all([
    supabase.from("clinical_notes").select("*").eq("patient_id", params.id).order("created_at", { ascending: false }),
    supabase.from("appointments").select("*").eq("patient_id", params.id).order("starts_at", { ascending: false }),
    supabase.from("documents").select("*").eq("patient_id", params.id).order("created_at", { ascending: false }),
  ]);

  // URLs assinadas para os documentos (bucket privado).
  const signed = new Map<string, string>();
  for (const d of docs ?? []) {
    const { data } = await supabase.storage.from("patient-documents").createSignedUrl(d.storage_path, 120);
    if (data?.signedUrl) signed.set(d.id, data.signedUrl);
  }

  // Árvore relacional familiar (nós do paciente + relações entre eles).
  const { data: fnodes } = await supabase.from("family_tree_nodes")
    .select("id, label, meta").eq("patient_id", params.id).order("created_at", { ascending: true });
  const nodeIds = (fnodes ?? []).map((x) => x.id);
  let frels: { from_node_id: string; to_node_id: string; relation_label: string | null }[] = [];
  if (nodeIds.length) {
    const { data } = await supabase.from("family_relations")
      .select("from_node_id, to_node_id, relation_label").in("from_node_id", nodeIds);
    frels = data ?? [];
  }

  return (
    <main className="page">
      <div className="wrap article">
        <p className="eyebrow"><Link href="/painel/pacientes" style={{ color: "inherit" }}>← Pacientes</Link></p>
        <h1 style={{ fontFamily: "var(--font-display)" }}>{patient.full_name}</h1>
        <div className="meta-line">{patient.phone ?? ""}{patient.email ? ` · ${patient.email}` : ""} <span className="dot" /> desde {fmtDate(patient.created_at)}</div>

        {/* Evoluções */}
        <section style={{ marginTop: "2rem" }}>
          <p className="eyebrow">Evoluções (sigilosas)</p>
          <form action={addClinicalNote.bind(null, patient.id)} className="card" style={{ marginBottom: "1.2rem" }}>
            <div className="field" style={{ marginBottom: ".6em" }}>
              <label>Nova evolução</label>
              <textarea className="input" name="content" rows={4} placeholder="Registre a evolução desta sessão…" required />
            </div>
            <button className="btn btn--primary" type="submit">Salvar evolução</button>
          </form>
          {(!notes || notes.length === 0) ? (
            <p className="count-note">Sem evoluções registradas.</p>
          ) : notes.map((n) => (
            <div className="note-item" key={n.id}>
              <div className="when">{fmtDateTime(n.created_at)}</div>
              <div style={{ whiteSpace: "pre-wrap" }}>{n.content}</div>
            </div>
          ))}
        </section>

        {/* Sessões */}
        <section style={{ marginTop: "2rem" }}>
          <p className="eyebrow">Sessões</p>
          {(!appts || appts.length === 0) ? <p className="count-note">Sem sessões.</p> : appts.map((a) => (
            <div className="list-row" key={a.id}>
              <span className="meta-line">{fmtDateTime(a.starts_at)}</span>
              <span className="pill">{APPT_STATUS_LABEL[a.status] ?? a.status}</span>
            </div>
          ))}
        </section>

        {/* Árvore relacional familiar */}
        <section style={{ marginTop: "2rem" }}>
          <p className="eyebrow">Árvore relacional familiar</p>
          {(fnodes && fnodes.length > 0) && (
            <div style={{ marginBottom: "1rem" }}>
              <FamilyTree nodes={fnodes} relations={frels} />
            </div>
          )}
          <div className="grid">
            <form action={addFamilyNode.bind(null, patient.id)} className="card">
              <div className="field"><label>Familiar</label>
                <input className="input" name="label" placeholder="Nome" required /></div>
              <div className="field"><label>Parentesco</label>
                <input className="input" name="relation" placeholder="Ex.: mãe, irmão" /></div>
              <button className="btn btn--primary" type="submit">Adicionar familiar</button>
            </form>
            {fnodes && fnodes.length >= 2 && (
              <form action={addFamilyRelation.bind(null, patient.id)} className="card">
                <div className="field"><label>De</label>
                  <select className="input" name="from_node_id" required defaultValue="">
                    <option value="" disabled>Familiar…</option>
                    {fnodes.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
                  </select></div>
                <div className="field"><label>Para</label>
                  <select className="input" name="to_node_id" required defaultValue="">
                    <option value="" disabled>Familiar…</option>
                    {fnodes.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
                  </select></div>
                <div className="field"><label>Relação</label>
                  <input className="input" name="relation_label" placeholder="Ex.: casados, distante" /></div>
                <button className="btn btn--ghost" type="submit">Ligar</button>
              </form>
            )}
          </div>
          {fnodes && fnodes.length > 0 && (
            <div style={{ marginTop: "1rem" }}>
              {fnodes.map((x) => (
                <div className="list-row" key={x.id}>
                  <span className="meta-line">{x.label}{(x.meta as Record<string, unknown>)?.relation ? ` · ${String((x.meta as Record<string, unknown>).relation)}` : ""}</span>
                  <form action={deleteFamilyNode.bind(null, x.id, patient.id)}>
                    <button className="btn btn--quiet" type="submit">Remover</button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Documentos */}
        <section style={{ marginTop: "2rem" }}>
          <p className="eyebrow">Documentos</p>
          <p className="count-note">Laudos, anamneses, termos e recibos. Armazenados de forma privada; o link abre por tempo limitado.</p>
          <DocumentUpload patientId={patient.id} />
          <div style={{ marginTop: "1rem" }}>
            {(!docs || docs.length === 0) ? <p className="count-note">Nenhum documento.</p> : docs.map((d) => (
              <div className="list-row" key={d.id}>
                <span className="meta-line">{d.title ?? d.storage_path}</span>
                {signed.get(d.id)
                  ? <a className="btn btn--ghost" href={signed.get(d.id)} target="_blank" rel="noopener noreferrer" style={{ padding: ".4em .9em" }}>Abrir</a>
                  : <span className="pill">indisponível</span>}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
