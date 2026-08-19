import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import PainelNav from "@/components/PainelNav";
import { APPT_STATUS_LABEL } from "@/lib/format";

export const dynamic = "force-dynamic";

const BRL = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default async function RelatoriosPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/entrar?next=/painel/relatorios");
  if (!me.roles.includes("professional") && !me.roles.includes("admin")) redirect("/painel");

  const supabase = createClient();
  const [{ data: tx }, { data: appts }, { count: patientCount }] = await Promise.all([
    supabase.from("financial_transactions").select("kind, amount, status, category, occurred_on").eq("professional_id", me.user.id),
    supabase.from("appointments").select("status, starts_at").eq("professional_id", me.user.id),
    supabase.from("patients").select("id", { count: "exact", head: true }).eq("professional_id", me.user.id),
  ]);

  const txs = tx ?? [];
  const income = txs.filter((t) => t.kind === "income");
  const recebido = income.filter((t) => t.status === "paid").reduce((s, t) => s + Number(t.amount), 0);
  const aReceber = income.filter((t) => t.status !== "paid").reduce((s, t) => s + Number(t.amount), 0);
  const despesas = txs.filter((t) => t.kind === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const liquido = recebido - despesas;

  // Faturamento (recebido) dos últimos 6 meses.
  const now = new Date();
  const months: { label: string; total: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("pt-BR", { month: "short" });
    const total = income.filter((t) => t.status === "paid" && (t.occurred_on ?? "").startsWith(key))
      .reduce((s, t) => s + Number(t.amount), 0);
    months.push({ label, total });
  }
  const maxMonth = Math.max(1, ...months.map((m) => m.total));

  // Despesas por categoria.
  const byCat = new Map<string, number>();
  txs.filter((t) => t.kind === "expense").forEach((t) => {
    const c = t.category || "Sem categoria";
    byCat.set(c, (byCat.get(c) ?? 0) + Number(t.amount));
  });

  // Sessões por status.
  const statusCount = new Map<string, number>();
  (appts ?? []).forEach((a) => statusCount.set(a.status, (statusCount.get(a.status) ?? 0) + 1));

  return (
    <main className="page">
      <div className="wrap">
        <p className="eyebrow">Painel</p>
        <h1 style={{ fontFamily: "var(--font-display)" }}>Relatórios</h1>
        <PainelNav />

        <div className="grid" style={{ margin: "1.4rem 0 2.2rem" }}>
          <div className="card"><div className="kicker">Recebido</div><h3>{BRL(recebido)}</h3></div>
          <div className="card"><div className="kicker">A receber</div><h3>{BRL(aReceber)}</h3></div>
          <div className="card"><div className="kicker">Despesas</div><h3>{BRL(despesas)}</h3></div>
          <div className="card"><div className="kicker">Lucro líquido</div><h3 style={{ color: liquido >= 0 ? "var(--champagne)" : "#f0b3bd" }}>{BRL(liquido)}</h3></div>
          <div className="card"><div className="kicker">Pacientes</div><h3>{patientCount ?? 0}</h3></div>
        </div>

        <section style={{ marginBottom: "2.4rem" }}>
          <p className="eyebrow">Faturamento — últimos 6 meses</p>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 14, height: 180, padding: "1rem 0" }}>
            {months.map((m) => (
              <div key={m.label} style={{ flex: 1, textAlign: "center" }}>
                <div title={BRL(m.total)} style={{
                  height: `${Math.round((m.total / maxMonth) * 140)}px`, minHeight: 2,
                  background: "linear-gradient(180deg,var(--malva),var(--bordo))",
                  borderRadius: "6px 6px 0 0", border: "1px solid var(--malva)",
                }} />
                <div className="meta-line" style={{ justifyContent: "center", marginTop: ".4em" }}>{m.label}</div>
              </div>
            ))}
          </div>
        </section>

        <div className="grid">
          <section className="card">
            <p className="eyebrow" style={{ marginBottom: ".8em" }}>Despesas por categoria</p>
            {byCat.size === 0 ? <p className="count-note">Nenhuma despesa registrada.</p> :
              Array.from(byCat.entries()).map(([c, v]) => (
                <div className="row-between" key={c} style={{ padding: ".3em 0" }}>
                  <span className="meta-line">{c}</span><span>{BRL(v)}</span>
                </div>
              ))}
          </section>
          <section className="card">
            <p className="eyebrow" style={{ marginBottom: ".8em" }}>Sessões por status</p>
            {statusCount.size === 0 ? <p className="count-note">Sem sessões ainda.</p> :
              Array.from(statusCount.entries()).map(([s, v]) => (
                <div className="row-between" key={s} style={{ padding: ".3em 0" }}>
                  <span className="meta-line">{APPT_STATUS_LABEL[s] ?? s}</span><span>{v}</span>
                </div>
              ))}
          </section>
        </div>
      </div>
    </main>
  );
}
