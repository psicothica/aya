import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = { pending: "aguardando seu aceite", accepted: "aceito" };

export default async function MeusContratos() {
  const me = await getCurrentUser();
  if (!me) redirect("/entrar?next=/meus-contratos");

  const supabase = createClient();
  const { data: assignments } = await supabase.from("contract_assignments")
    .select("id, title, status, sent_at")
    .eq("patient_user_id", me.user.id).order("sent_at", { ascending: false });

  return (
    <main className="page">
      <div className="wrap">
        <div className="page-head">
          <p className="eyebrow">Meus contratos</p>
          <h1>Contratos terapêuticos</h1>
          <p className="lead">Contratos enviados pelo seu profissional para você ler e aceitar.</p>
        </div>
        {(!assignments || assignments.length === 0) ? (
          <div className="empty">Você ainda não recebeu nenhum contrato.</div>
        ) : (
          <div className="grid">
            {assignments.map((a) => (
              <article className="card" key={a.id}>
                <div className="kicker">Contrato</div>
                <h3>{a.title}</h3>
                <div className="row-between" style={{ marginTop: ".6em" }}>
                  <span className={"chip-tag" + (a.status === "accepted" ? " on" : "")}>{STATUS_LABEL[a.status] ?? a.status}</span>
                  <Link className="btn btn--primary" href={`/meus-contratos/${a.id}`} style={{ padding: ".5em 1em" }}>
                    {a.status === "accepted" ? "Ver contrato" : "Ler e responder"}
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
