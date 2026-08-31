import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = { pending: "pendente", completed: "concluído" };

export default async function MeusFormularios() {
  const me = await getCurrentUser();
  if (!me) redirect("/entrar?next=/meus-formularios");

  const supabase = createClient();
  const { data: assignments } = await supabase.from("form_assignments")
    .select("id, title, status, assigned_at")
    .eq("patient_user_id", me.user.id).eq("respondent", "patient")
    .order("assigned_at", { ascending: false });

  return (
    <main className="page">
      <div className="wrap">
        <div className="page-head">
          <p className="eyebrow">Meus formulários</p>
          <h1>Questionários enviados a você</h1>
          <p className="lead">Formulários que seu profissional pediu para você preencher.</p>
        </div>
        {(!assignments || assignments.length === 0) ? (
          <div className="empty">Você ainda não recebeu formulários.</div>
        ) : (
          <div className="grid">
            {assignments.map((a) => (
              <article className="card" key={a.id}>
                <div className="kicker">Formulário</div>
                <h3>{a.title}</h3>
                <div className="row-between" style={{ marginTop: ".6em" }}>
                  <span className="chip-tag">{STATUS_LABEL[a.status] ?? a.status}</span>
                  <Link className="btn btn--primary" href={`/meus-formularios/${a.id}`} style={{ padding: ".5em 1em" }}>
                    {a.status === "completed" ? "Ver respostas" : "Responder"}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
