import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import PainelNav from "@/components/PainelNav";
import { deleteFormTemplate } from "@/app/painel/formularios/actions";

export const dynamic = "force-dynamic";

const RESPONDENT_LABEL: Record<string, string> = { professional: "você preenche", patient: "paciente preenche" };
const STATUS_LABEL: Record<string, string> = { pending: "pendente", completed: "concluído" };

export default async function PainelFormularios() {
  const me = await getCurrentUser();
  if (!me) redirect("/entrar?next=/painel/formularios");
  if (!me.roles.includes("professional") && !me.roles.includes("admin")) redirect("/painel");

  const supabase = createClient();
  const [{ data: templates }, { data: assignments }, { data: patients }] = await Promise.all([
    supabase.from("form_templates").select("id, title, category, default_respondent, author_id")
      .order("created_at", { ascending: false }),
    supabase.from("form_assignments").select("id, title, status, respondent, patient_id, assigned_at")
      .eq("professional_id", me.user.id).order("assigned_at", { ascending: false }),
    supabase.from("patients").select("id, full_name").eq("professional_id", me.user.id),
  ]);
  const nameById = new Map((patients ?? []).map((p) => [p.id, p.full_name]));

  return (
    <main className="page">
      <div className="wrap">
        <p className="eyebrow">Painel</p>
        <h1 style={{ fontFamily: "var(--font-display)" }}>Formulários</h1>
        <PainelNav />

        <section style={{ margin: "1.4rem 0 2.4rem" }}>
          <div className="row-between">
            <p className="eyebrow">Modelos</p>
            <Link className="btn btn--primary" href="/painel/formularios/novo" style={{ padding: ".5em 1.1em" }}>Novo modelo</Link>
          </div>
          {(!templates || templates.length === 0) ? (
            <p className="count-note">Nenhum modelo ainda.</p>
          ) : (
            <div className="grid">
              {templates.map((t) => (
                <article className="card" key={t.id}>
                  <div className="kicker">{t.category || "geral"}{t.author_id === null ? " · sistema" : ""}</div>
                  <h3>{t.title}</h3>
                  <p className="meta-line">Padrão: {RESPONDENT_LABEL[t.default_respondent] ?? t.default_respondent}</p>
                  {t.author_id === me.user.id ? (
                    <div className="row-between" style={{ marginTop: ".6em" }}>
                      <Link className="btn btn--ghost" href={`/painel/formularios/${t.id}`} style={{ padding: ".4em .9em" }}>Editar</Link>
                      <form action={deleteFormTemplate.bind(null, t.id)}>
                        <button className="btn btn--quiet" type="submit">Excluir</button>
                      </form>
                    </div>
                  ) : (
                    <p className="count-note" style={{ marginTop: ".6em" }}>Modelo do sistema — envie a um paciente na ficha dele.</p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        <section>
          <p className="eyebrow">Enviados</p>
          {(!assignments || assignments.length === 0) ? (
            <div className="empty">Nenhum formulário enviado ainda. Envie um pela ficha do paciente.</div>
          ) : assignments.map((a) => (
            <div className="list-row" key={a.id}>
              <div>
                <strong>{a.title}</strong>
                <div className="meta-line">{nameById.get(a.patient_id) ?? "Paciente"} · {RESPONDENT_LABEL[a.respondent] ?? a.respondent} · {STATUS_LABEL[a.status] ?? a.status}</div>
              </div>
              {a.respondent === "professional" && a.status === "pending" && (
                <Link className="btn btn--ghost" href={`/painel/formularios/preencher/${a.id}`} style={{ padding: ".4em .9em" }}>Preencher</Link>
              )}
              <Link className="btn btn--quiet" href={`/painel/pacientes/${a.patient_id}`} style={{ padding: ".4em .9em" }}>Ver na ficha</Link>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
