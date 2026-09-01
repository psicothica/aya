import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ensureProfessionalProfile, signOut } from "@/app/actions";
import PainelNav from "@/components/PainelNav";
import { SessionQuickOpen } from "@/components/SessionQuickOpen";
import { fmtDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Painel() {
  await ensureProfessionalProfile();
  const me = await getCurrentUser();
  if (!me) redirect("/entrar");

  const supabase = createClient();
  const { data: prof } = await supabase
    .from("professional_profiles").select("status").eq("user_id", me.user.id).maybeSingle();
  const approved = me.roles.includes("professional") && prof?.status === "approved";
  const name = (me.user.user_metadata?.full_name as string) || me.user.email || "por aqui";

  return (
    <main className="page">
      <div className="wrap">
        <div className="row-between" style={{ marginBottom: "1rem" }}>
          <div>
            <p className="eyebrow">Painel</p>
            <h1 style={{ margin: 0, fontFamily: "var(--font-display)" }}>Olá, {name}</h1>
          </div>
          <form action={signOut}><button className="btn btn--ghost" type="submit">Sair</button></form>
        </div>

        {approved ? <ApprovedHome proId={me.user.id} /> : prof ? <PendingCard /> : <ClientHome clientId={me.user.id} />}
      </div>
    </main>
  );
}

async function ApprovedHome({ proId }: { proId: string }) {
  const supabase = createClient();
  const nowIso = new Date().toISOString();
  const [reqs, appts, patients, upcoming, patientNames] = await Promise.all([
    supabase.from("booking_requests").select("id", { count: "exact", head: true }).eq("professional_id", proId).eq("status", "requested"),
    supabase.from("appointments").select("id", { count: "exact", head: true }).eq("professional_id", proId).gte("starts_at", nowIso).eq("status", "scheduled"),
    supabase.from("patients").select("id", { count: "exact", head: true }).eq("professional_id", proId),
    supabase.from("appointments").select("id, patient_id, starts_at, status")
      .eq("professional_id", proId).gte("starts_at", nowIso).eq("status", "scheduled")
      .order("starts_at", { ascending: true }).limit(20),
    supabase.from("patients").select("id, full_name").eq("professional_id", proId),
  ]);
  const nameById = new Map((patientNames.data ?? []).map((p) => [p.id, p.full_name]));
  const quickSessions = (upcoming.data ?? []).map((a) => ({
    id: a.id, patient_id: a.patient_id, starts_at: a.starts_at, status: a.status,
    patient_name: nameById.get(a.patient_id) ?? "Paciente",
  }));

  return (
    <>
      <PainelNav />
      <div className="stat-row">
        <div className="stat"><div className="n">{reqs.count ?? 0}</div><div className="l">Solicitações novas</div></div>
        <div className="stat"><div className="n">{appts.count ?? 0}</div><div className="l">Sessões futuras</div></div>
        <div className="stat"><div className="n">{patients.count ?? 0}</div><div className="l">Pacientes</div></div>
      </div>

      {quickSessions.length > 0 && (
        <div className="card" style={{ marginBottom: "1.6rem" }}>
          <div className="kicker">Acesso rápido</div>
          <h3>Abrir uma sessão futura</h3>
          <p className="sub" style={{ marginBottom: "1rem" }}>Selecione uma sessão agendada para ir direto ao prontuário do paciente.</p>
          <SessionQuickOpen sessions={quickSessions} />
        </div>
      )}

      <div className="grid">
        <article className="card"><div className="kicker">Agenda</div><h3>Sessões e solicitações</h3><p className="sub">Confirme pedidos e acompanhe seus atendimentos.</p><Link className="btn btn--ghost" href="/painel/agenda" style={{ padding: ".5em 1em" }}>Abrir agenda</Link></article>
        <article className="card"><div className="kicker">Pacientes</div><h3>Prontuários e documentos</h3><p className="sub">Evoluções sigilosas, só suas.</p><Link className="btn btn--ghost" href="/painel/pacientes" style={{ padding: ".5em 1em" }}>Ver pacientes</Link></article>
        <article className="card"><div className="kicker">Financeiro</div><h3>Receitas e pendências</h3><p className="sub">Lance cobranças e acompanhe o pago/pendente.</p><Link className="btn btn--ghost" href="/painel/financeiro" style={{ padding: ".5em 1em" }}>Abrir financeiro</Link></article>
      </div>
    </>
  );
}

function PendingCard() {
  return (
    <div className="card">
      <div className="kicker">Perfil profissional</div>
      <h3>Recebemos seu cadastro</h3>
      <p className="sub">Seu perfil está em análise pela equipe AyA. Assim que aprovado, ele fica público no diretório e você passa a ter acesso à gestão da prática.</p>
      <div className="chips"><span className="chip-tag on">Aguardando aprovação</span></div>
    </div>
  );
}

async function ClientHome({ clientId }: { clientId: string }) {
  const supabase = createClient();
  const { data: reqs } = await supabase.from("booking_requests")
    .select("id, professional_id, requested_at, status, created_at")
    .eq("client_id", clientId).order("created_at", { ascending: false });

  const labels: Record<string, string> = { requested: "Aguardando confirmação", accepted: "Confirmada", declined: "Recusada", cancelled: "Cancelada" };

  return (
    <>
      <div className="card" style={{ marginBottom: "1.4rem" }}>
        <div className="kicker">Cliente</div>
        <h3>Bem-vindo ao ecossistema</h3>
        <p className="sub">Descubra profissionais e práticas, acesse os apps e acompanhe o feed.</p>
        <div className="iactions" style={{ margin: ".6em 0 0" }}>
          <Link className="btn btn--primary" href="/profissionais">Encontrar cuidado</Link>
          <Link className="btn btn--ghost" href="/feed">Ir ao feed</Link>
        </div>
      </div>

      {reqs && reqs.length > 0 && (
        <section>
          <p className="eyebrow">Minhas solicitações de agendamento</p>
          {reqs.map((r) => (
            <div className="list-row" key={r.id}>
              <span className="meta-line">{fmtDateTime(r.requested_at)}</span>
              <span className={"pill" + (r.status === "accepted" ? " ok" : r.status === "declined" ? " warn" : "")}>{labels[r.status]}</span>
            </div>
          ))}
        </section>
      )}
    </>
  );
}
