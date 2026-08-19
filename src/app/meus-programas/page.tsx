import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MeusProgramas() {
  const me = await getCurrentUser();
  if (!me) redirect("/entrar?next=/meus-programas");

  const supabase = createClient();
  const { data: assignments } = await supabase.from("program_assignments")
    .select("id, title, status").eq("patient_user_id", me.user.id).order("assigned_at", { ascending: false });

  return (
    <main className="page">
      <div className="wrap">
        <div className="page-head">
          <p className="eyebrow">Meus programas</p>
          <h1>Seu acompanhamento</h1>
          <p className="lead">Programas que seu profissional atribuiu a você. Marque o que concluir e registre como foi.</p>
        </div>
        {(!assignments || assignments.length === 0) ? (
          <div className="empty">Você ainda não tem programas atribuídos.</div>
        ) : (
          <div className="grid">
            {assignments.map((a) => (
              <article className="card" key={a.id}>
                <div className="kicker">Programa</div>
                <h3>{a.title}</h3>
                <div className="row-between" style={{ marginTop: ".6em" }}>
                  <span className="chip-tag">{a.status}</span>
                  <Link className="btn btn--primary" href={`/meus-programas/${a.id}`} style={{ padding: ".5em 1em" }}>Abrir</Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
