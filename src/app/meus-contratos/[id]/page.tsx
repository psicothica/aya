import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { acceptContract } from "@/app/painel/contratos/actions";
import { fmtDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MeuContratoDetail({ params }: { params: { id: string } }) {
  const me = await getCurrentUser();
  if (!me) redirect("/entrar?next=/meus-contratos");

  const supabase = createClient();
  const { data: assignment } = await supabase.from("contract_assignments")
    .select("id, title, body, status, sent_at")
    .eq("id", params.id).eq("patient_user_id", me.user.id).maybeSingle();
  if (!assignment) notFound();

  const { data: acceptance } = assignment.status === "accepted"
    ? await supabase.from("contract_acceptances").select("accepted_at").eq("assignment_id", assignment.id).maybeSingle()
    : { data: null };

  return (
    <main className="page">
      <div className="wrap article">
        <p className="eyebrow"><Link href="/meus-contratos" style={{ color: "inherit" }}>← Meus contratos</Link></p>
        <h1>{assignment.title}</h1>
        <p className="count-note" style={{ marginTop: ".6rem" }}>Enviado em {fmtDateTime(assignment.sent_at)}</p>

        <div className="body">{assignment.body}</div>

        {assignment.status === "accepted" ? (
          <p className="disclaimer" style={{ marginTop: "1.6rem" }}>
            Você aceitou este contrato{acceptance?.accepted_at ? ` em ${fmtDateTime(acceptance.accepted_at)}` : ""}.
          </p>
        ) : (
          <form action={acceptContract.bind(null, assignment.id)} style={{ marginTop: "1.6rem" }}>
            <button className="btn btn--primary" type="submit">Li e concordo</button>
          </form>
        )}
      </div>
    </main>
  );
}
