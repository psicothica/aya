import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { addClinicalNote, addFamilyNode, addFamilyRelation, deleteFamilyNode, addSessionRecord, updatePatientProfile, togglePatientActive } from "@/app/painel/actions";
import { sendFormAssignment, deleteFormAssignment } from "@/app/painel/formularios/actions";
import { sendContractAssignment, deleteContractAssignment } from "@/app/painel/contratos/actions";
import DocumentUpload from "@/components/DocumentUpload";
import AvatarUpload from "@/components/AvatarUpload";
import FamilyTree from "@/components/FamilyTree";
import { fmtDateTime, fmtDate, APPT_STATUS_LABEL } from "@/lib/format";
import { DOC_CATEGORY_LABEL } from "@/lib/labels";

const RESPONDENT_LABEL: Record<string, string> = { professional: "você preenche", patient: "paciente preenche" };
const FORM_STATUS_LABEL: Record<string, string> = { pending: "pendente", completed: "concluído" };
const CONTRACT_STATUS_LABEL: Record<string, string> = { pending: "pendente", accepted: "aceito" };

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
  // Documentos agrupados por categoria, na ordem definida em DOC_CATEGORY_LABEL.
  const docsByCategory = new Map<string, typeof docs>();
  for (const cat of Object.keys(DOC_CATEGORY_LABEL)) docsByCategory.set(cat, []);
  for (const d of docs ?? []) {
    const list = docsByCategory.get(d.category) ?? docsByCategory.get("outro")!;
    list.push(d);
  }

  // Avatar (bucket privado 'patient-avatars') — URL assinada, nunca pública.
  let avatarSignedUrl: string | null = null;
  if (patient.avatar_url) {
    const { data } = await supabase.storage.from("patient-avatars").createSignedUrl(patient.avatar_url, 120);
    avatarSignedUrl = data?.signedUrl ?? null;
  }

  // Contrato terapêutico: histórico enviado a este paciente + modelo ativo do profissional.
  const [{ data: contracts }, { data: ownContractTemplate }] = await Promise.all([
    supabase.from("contract_assignments").select("id, title, status, sent_at")
      .eq("patient_id", params.id).order("sent_at", { ascending: false }),
    supabase.from("contract_templates").select("id").eq("author_id", me.user.id)
      .order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  // Registros de sessão (prontuário estruturado, confidencial).
  const { data: sessions } = await supabase.from("session_records")
    .select("*").eq("patient_id", params.id).order("session_date", { ascending: false });

  // Formulários enviados/preenchidos + modelos disponíveis para envio.
  const [{ data: formAssignments }, { data: formTemplates }] = await Promise.all([
    supabase.from("form_assignments").select("id, title, respondent, status")
      .eq("patient_id", params.id).order("assigned_at", { ascending: false }),
    supabase.from("form_templates").select("id, title"),
  ]);

  // Financeiro individual do paciente (transações ligadas às sessões deste paciente).
  const { data: patientAppts } = await supabase.from("appointments").select("id").eq("patient_id", params.id);
  const apptIds = (patientAppts ?? []).map((a) => a.id);
  let patientTx: { amount: number; status: string; kind: string }[] = [];
  if (apptIds.length) {
    const { data } = await supabase.from("financial_transactions")
      .select("amount, status, kind").in("appointment_id", apptIds);
    patientTx = data ?? [];
  }
  const recebidoPac = patientTx.filter((t) => t.kind === "income" && t.status === "paid").reduce((s, t) => s + Number(t.amount), 0);
  const pendentePac = patientTx.filter((t) => t.kind === "income" && t.status !== "paid").reduce((s, t) => s + Number(t.amount), 0);
  const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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
        <div style={{ display: "flex", gap: "1.2rem", alignItems: "center" }}>
          {avatarSignedUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarSignedUrl} alt="" width={72} height={72}
              style={{ borderRadius: "999px", objectFit: "cover", border: "1px solid var(--line-strong)" }} />
          )}
          <div>
            <h1 style={{ fontFamily: "var(--font-display)" }}>{patient.full_name}</h1>
            <div className="meta-line">{patient.phone ?? ""}{patient.email ? ` · ${patient.email}` : ""} <span className="dot" /> desde {fmtDate(patient.created_at)}</div>
          </div>
        </div>

        {/* Status ativo/inativo */}
        <div style={{ marginTop: "1rem" }}>
          <form action={togglePatientActive.bind(null, patient.id)}>
            {patient.is_active ? (
              <button className="btn btn--ghost" type="submit">✓ Ativo — desativar</button>
            ) : (
              <button className="btn btn--ghost" style={{ borderColor: "#ff6b6b", color: "#ff6b6b" }} type="submit">
                ✗ Inativo — reativar
              </button>
            )}
          </form>
        </div>

        {/* Perfil completo — EXIBIÇÃO VISUAL */}
        <section style={{ marginTop: "2rem" }}>
          <p className="eyebrow">Perfil</p>

          {/* CARD DE DADOS PESSOAIS - EXIBIÇÃO */}
          <div className="card" style={{ marginBottom: "1rem" }}>
            <div className="kicker">Dados pessoais</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.2rem", marginTop: "1rem" }}>
              {patient.birth_date && (
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-weak)", marginBottom: "0.3rem" }}>📅 Data de nascimento</div>
                  <div style={{ fontWeight: 500 }}>{new Date(patient.birth_date).toLocaleDateString("pt-BR")}</div>
                </div>
              )}
              {patient.gender && (
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-weak)", marginBottom: "0.3rem" }}>👤 Gênero</div>
                  <div style={{ fontWeight: 500 }}>{patient.gender}</div>
                </div>
              )}
              {patient.marital_status && (
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-weak)", marginBottom: "0.3rem" }}>💍 Estado civil</div>
                  <div style={{ fontWeight: 500 }}>{patient.marital_status}</div>
                </div>
              )}
              {patient.occupation && (
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-weak)", marginBottom: "0.3rem" }}>💼 Ocupação</div>
                  <div style={{ fontWeight: 500 }}>{patient.occupation}</div>
                </div>
              )}
            </div>
          </div>

          {/* CARD DE CONTATO - EXIBIÇÃO */}
          <div className="card" style={{ marginBottom: "1rem" }}>
            <div className="kicker">Contato</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.2rem", marginTop: "1rem" }}>
              {patient.email && (
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-weak)", marginBottom: "0.3rem" }}>📧 E-mail</div>
                  <div style={{ fontWeight: 500, wordBreak: "break-word" }}>{patient.email}</div>
                </div>
              )}
              {patient.phone && (
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-weak)", marginBottom: "0.3rem" }}>📱 Telefone</div>
                  <div style={{ fontWeight: 500 }}>{patient.phone}</div>
                </div>
              )}
            </div>
          </div>

          {/* CARD DE ENDEREÇO - EXIBIÇÃO */}
          {patient.address && (
            <div className="card" style={{ marginBottom: "1rem" }}>
              <div className="kicker">Endereço</div>
              <div style={{ marginTop: "0.5rem", fontWeight: 500, whiteSpace: "pre-wrap" }}>
                📍 {patient.address}
              </div>
            </div>
          )}

          {/* CARD DE CONTATO DE EMERGÊNCIA - EXIBIÇÃO */}
          {(patient.emergency_contact_name || patient.emergency_contact_phone) && (
            <div className="card" style={{ marginBottom: "1rem" }}>
              <div className="kicker">Contato de emergência</div>
              <div style={{ marginTop: "0.5rem" }}>
                {patient.emergency_contact_name && (
                  <div style={{ fontWeight: 500 }}>{patient.emergency_contact_name}</div>
                )}
                {patient.emergency_contact_phone && (
                  <div style={{ fontSize: "0.9rem", color: "var(--text-weak)" }}>{patient.emergency_contact_phone}</div>
                )}
              </div>
            </div>
          )}

          {/* CARD DE FOTO - UPLOAD */}
          <div className="card" style={{ marginBottom: "1rem" }}>
            <div className="kicker">Foto do perfil</div>
            <AvatarUpload patientId={patient.id} />
            <p className="count-note" style={{ marginTop: ".5em" }}>Armazenada em bucket privado; exibida por URL assinada.</p>
          </div>

          {/* SEÇÃO DE EDIÇÃO - COLAPSÁVEL */}
          <details className="card">
            <summary style={{ cursor: "pointer", fontFamily: "var(--font-display)" }}>✏️ Editar dados do perfil</summary>
            <form action={updatePatientProfile.bind(null, patient.id)} style={{ marginTop: "1rem" }}>
              <div className="grid">
                <div className="field"><label>Nome completo</label><input className="input" name="full_name" defaultValue={patient.full_name} required /></div>
                <div className="field"><label>Data de nascimento</label><input className="input" type="date" name="birth_date" defaultValue={patient.birth_date ?? ""} /></div>
                <div className="field"><label>Gênero</label><input className="input" name="gender" defaultValue={patient.gender ?? ""} /></div>
                <div className="field"><label>Estado civil</label><input className="input" name="marital_status" defaultValue={patient.marital_status ?? ""} /></div>
                <div className="field"><label>Telefone</label><input className="input" name="phone" defaultValue={patient.phone ?? ""} /></div>
                <div className="field"><label>E-mail</label><input className="input" type="email" name="email" defaultValue={patient.email ?? ""} /></div>
                <div className="field"><label>Profissão / ocupação</label><input className="input" name="occupation" defaultValue={patient.occupation ?? ""} /></div>
                <div className="field"><label>Contato de emergência — nome</label><input className="input" name="emergency_contact_name" defaultValue={patient.emergency_contact_name ?? ""} /></div>
                <div className="field"><label>Contato de emergência — telefone</label><input className="input" name="emergency_contact_phone" defaultValue={patient.emergency_contact_phone ?? ""} /></div>
              </div>
              <div className="field"><label>Endereço</label><input className="input" name="address" defaultValue={patient.address ?? ""} /></div>
              <div className="field"><label>Observações administrativas</label><textarea className="input" name="notes_summary" rows={3} defaultValue={patient.notes_summary ?? ""} /></div>
              <button className="btn btn--primary" type="submit">Salvar perfil</button>
            </form>
          </details>
        </section>

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

        {/* Financeiro do paciente */}
        <section style={{ marginTop: "2rem" }}>
          <p className="eyebrow">Financeiro do paciente</p>
          <div className="grid">
            <div className="card"><div className="kicker">Recebido</div><h3>{brl(recebidoPac)}</h3></div>
            <div className="card"><div className="kicker">Pendente</div><h3>{brl(pendentePac)}</h3></div>
          </div>
        </section>

        {/* Registros de sessão (prontuário estruturado) */}
        <section style={{ marginTop: "2rem" }}>
          <p className="eyebrow">Registros de sessão (sigilosos)</p>
          <p className="count-note">Acompanhamento por domínios. Confidencial — só você acessa.</p>

          {(sessions ?? []).map((s) => {
            const elevated = s.risk_level && ["moderado", "alto", "grave"].includes(s.risk_level);
            return (
              <div className="card" key={s.id} style={{ marginBottom: ".9em" }}>
                <div className="row-between">
                  <strong>{fmtDate(s.session_date)}</strong>
                  <span className="meta-line">
                    {s.mood_scale != null && `humor ${s.mood_scale}/10`}
                    {s.risk_level && <> · <span className={"pill" + (elevated ? " pill--alert" : "")}>risco: {s.risk_level}</span></>}
                  </span>
                </div>
                {elevated && (
                  <p className="disclaimer" style={{ color: "#f0c48a", borderColor: "rgba(240,196,138,.35)" }}>
                    Risco elevado registrado. Considere plano de segurança e rede de apoio. Recurso de crise no Brasil: CVV 188 (24h).
                  </p>
                )}
                <div className="sub" style={{ marginTop: ".4em", display: "grid", gap: ".2em" }}>
                  {s.mood_notes && <div><b>Humor:</b> {s.mood_notes}</div>}
                  {s.risk_notes && <div><b>Risco:</b> {s.risk_notes}</div>}
                  {s.medication_notes && <div><b>Medicação:</b> {s.medication_notes}</div>}
                  {s.sleep_notes && <div><b>Sono:</b> {s.sleep_notes}</div>}
                  {s.eating_notes && <div><b>Alimentação:</b> {s.eating_notes}</div>}
                  {s.physical_notes && <div><b>Saúde física:</b> {s.physical_notes}</div>}
                  {s.mobility_notes && <div><b>Mobilidade:</b> {s.mobility_notes}</div>}
                  {s.social_notes && <div><b>Saúde social:</b> {s.social_notes}</div>}
                  {s.general_notes && <div><b>Geral:</b> {s.general_notes}</div>}
                </div>
              </div>
            );
          })}

          <details className="card" style={{ marginTop: "1rem" }}>
            <summary style={{ cursor: "pointer", fontFamily: "var(--font-display)" }}>Novo registro de sessão</summary>
            <form action={addSessionRecord.bind(null, patient.id)} style={{ marginTop: "1rem" }}>
              <div className="grid">
                <div className="field"><label>Data</label><input className="input" type="date" name="session_date" /></div>
                <div className="field"><label>Humor (0–10)</label><input className="input" type="number" min="0" max="10" name="mood_scale" /></div>
              </div>
              <div className="field"><label>Humor — observações</label><textarea className="input" name="mood_notes" rows={2} /></div>

              <div className="field"><label>Risco de autolesão/suicídio</label>
                <select className="input" name="risk_level" defaultValue="">
                  <option value="">— não avaliado —</option>
                  <option value="nenhum">nenhum</option>
                  <option value="baixo">baixo</option>
                  <option value="moderado">moderado</option>
                  <option value="alto">alto</option>
                  <option value="grave">grave</option>
                </select>
              </div>
              <div className="field"><label>Risco — observações do profissional</label><textarea className="input" name="risk_notes" rows={2} placeholder="Avaliação clínica, plano de segurança acordado, rede de apoio." /></div>

              <div className="field"><label>Monitoramento medicamentoso</label><textarea className="input" name="medication_notes" rows={2} /></div>
              <div className="field"><label>Sono</label><textarea className="input" name="sleep_notes" rows={2} /></div>
              <div className="field"><label>Alimentação (observação clínica)</label><textarea className="input" name="eating_notes" rows={2} /></div>
              <div className="field"><label>Saúde física</label><textarea className="input" name="physical_notes" rows={2} /></div>
              <div className="field"><label>Mobilidade</label><textarea className="input" name="mobility_notes" rows={2} /></div>
              <div className="field"><label>Saúde social</label><textarea className="input" name="social_notes" rows={2} /></div>
              <div className="field"><label>Observações gerais</label><textarea className="input" name="general_notes" rows={2} /></div>

              <button className="btn btn--primary" type="submit">Salvar registro</button>
            </form>
          </details>
        </section>

        {/* Contrato terapêutico */}
        <section style={{ marginTop: "2rem" }}>
          <p className="eyebrow">Contrato</p>
          {(!contracts || contracts.length === 0) ? (
            <p className="count-note">Nenhum contrato enviado ainda.</p>
          ) : contracts.map((c) => (
            <div className="list-row" key={c.id}>
              <div>
                <strong>{c.title}</strong>
                <div className="meta-line">
                  <span className={"pill" + (c.status === "accepted" ? " ok" : "")}>{CONTRACT_STATUS_LABEL[c.status] ?? c.status}</span> · enviado em {fmtDate(c.sent_at)}
                </div>
              </div>
              <form action={deleteContractAssignment.bind(null, c.id, patient.id)}>
                <button className="btn btn--quiet" type="submit">Remover</button>
              </form>
            </div>
          ))}
          {ownContractTemplate ? (
            <form action={sendContractAssignment} style={{ marginTop: "1rem" }}>
              <input type="hidden" name="patient_id" value={patient.id} />
              <input type="hidden" name="template_id" value={ownContractTemplate.id} />
              <button className="btn btn--ghost" type="submit">Enviar contrato</button>
            </form>
          ) : (
            <p className="count-note" style={{ marginTop: ".6em" }}>
              Configure seu contrato-base em <Link href="/painel/contratos">Contratos</Link> antes de enviar.
            </p>
          )}
        </section>

        {/* Formulários */}
        <section style={{ marginTop: "2rem" }}>
          <p className="eyebrow">Formulários</p>
          <p className="count-note">Questionários customizados — preenchidos por você ou enviados para o paciente responder.</p>

          {(formAssignments ?? []).map((a) => (
            <div className="list-row" key={a.id}>
              <div>
                <strong>{a.title}</strong>
                <div className="meta-line">{RESPONDENT_LABEL[a.respondent] ?? a.respondent} · {FORM_STATUS_LABEL[a.status] ?? a.status}</div>
              </div>
              <div style={{ display: "flex", gap: ".5em" }}>
                {a.respondent === "professional" && (
                  <Link className="btn btn--ghost" href={`/painel/formularios/preencher/${a.id}`} style={{ padding: ".4em .9em" }}>
                    {a.status === "completed" ? "Ver/editar" : "Preencher"}
                  </Link>
                )}
                {a.respondent === "patient" && a.status !== "completed" && (
                  <span className="pill">aguardando o paciente</span>
                )}
                <form action={deleteFormAssignment.bind(null, a.id, patient.id)}>
                  <button className="btn btn--quiet" type="submit">Remover</button>
                </form>
              </div>
            </div>
          ))}

          <details className="card" style={{ marginTop: "1rem" }}>
            <summary style={{ cursor: "pointer", fontFamily: "var(--font-display)" }}>Enviar formulário</summary>
            {(!formTemplates || formTemplates.length === 0) ? (
              <p className="count-note" style={{ marginTop: ".8em" }}>
                Nenhum modelo disponível ainda. Crie um em <Link href="/painel/formularios">Formulários</Link>.
              </p>
            ) : (
              <form action={sendFormAssignment.bind(null, patient.id)} style={{ marginTop: "1rem" }}>
                <div className="grid">
                  <div className="field"><label>Modelo</label>
                    <select className="input" name="template_id" required defaultValue="">
                      <option value="" disabled>Selecione…</option>
                      {formTemplates.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                    </select>
                  </div>
                  <div className="field"><label>Quem preenche</label>
                    <select className="input" name="respondent" required defaultValue="professional">
                      <option value="professional">Eu (profissional)</option>
                      <option value="patient" disabled={!patient.client_user_id}>
                        O paciente{!patient.client_user_id ? " — sem conta vinculada" : ""}
                      </option>
                    </select>
                  </div>
                </div>
                {!patient.client_user_id && (
                  <p className="count-note">
                    Este paciente não tem conta vinculada — só é possível enviar formulários que você mesmo preenche.
                  </p>
                )}
                <button className="btn btn--primary" type="submit">Enviar</button>
              </form>
            )}
          </details>
        </section>

        {/* Documentos */}
        <section style={{ marginTop: "2rem" }}>
          <p className="eyebrow">Documentos</p>
          <p className="count-note">Laudos, anamneses, termos e recibos. Armazenados de forma privada; o link abre por tempo limitado.</p>
          <DocumentUpload patientId={patient.id} />
          <div style={{ marginTop: "1rem" }}>
            {(!docs || docs.length === 0) ? <p className="count-note">Nenhum documento.</p> : (
              Object.entries(DOC_CATEGORY_LABEL).map(([cat, label]) => {
                const items = docsByCategory.get(cat);
                if (!items || items.length === 0) return null;
                return (
                  <div key={cat} style={{ marginBottom: "1.2em" }}>
                    <p className="kicker" style={{ marginBottom: ".4em" }}>{label}</p>
                    {items.map((d) => (
                      <div className="list-row" key={d.id}>
                        <span className="meta-line">{d.title ?? d.storage_path}{d.description ? ` · ${d.description}` : ""}</span>
                        {signed.get(d.id)
                          ? <a className="btn btn--ghost" href={signed.get(d.id)} target="_blank" rel="noopener noreferrer" style={{ padding: ".4em .9em" }}>Abrir</a>
                          : <span className="pill">indisponível</span>}
                      </div>
                    ))}
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
