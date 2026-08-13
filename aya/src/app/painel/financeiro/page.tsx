import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import PainelNav from "@/components/PainelNav";
import { addTransaction, setTransactionStatus } from "@/app/painel/actions";
import { fmtMoney, fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function FinanceiroPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/entrar?next=/painel/financeiro");
  if (!me.roles.includes("professional") && !me.roles.includes("admin")) redirect("/painel");

  const supabase = createClient();
  const { data: txns } = await supabase.from("financial_transactions").select("*")
    .eq("professional_id", me.user.id).order("occurred_on", { ascending: false });

  const rows = txns ?? [];
  const received = rows.filter((t) => t.kind === "income" && t.status === "paid").reduce((s, t) => s + Number(t.amount), 0);
  const pending = rows.filter((t) => t.kind === "income" && t.status === "pending").reduce((s, t) => s + Number(t.amount), 0);
  const expenses = rows.filter((t) => t.kind === "expense").reduce((s, t) => s + Number(t.amount), 0);

  return (
    <main className="page">
      <div className="wrap">
        <p className="eyebrow">Painel</p>
        <h1 style={{ fontFamily: "var(--font-display)" }}>Financeiro</h1>
        <PainelNav />

        <div className="stat-row">
          <div className="stat"><div className="n">{fmtMoney(received)}</div><div className="l">Recebido</div></div>
          <div className="stat"><div className="n">{fmtMoney(pending)}</div><div className="l">A receber</div></div>
          <div className="stat"><div className="n">{fmtMoney(expenses)}</div><div className="l">Despesas</div></div>
        </div>

        <form action={addTransaction} className="card" style={{ marginBottom: "1.6rem" }}>
          <div className="kicker">Novo lançamento</div>
          <div className="form-inline">
            <div className="field"><label>Tipo</label>
              <select name="kind" className="input" defaultValue="income"><option value="income">Receita</option><option value="expense">Despesa</option></select></div>
            <div className="field"><label>Valor (R$)</label><input className="input" name="amount" type="number" step="0.01" min="0" placeholder="120,00" required /></div>
            <div className="field grow"><label>Categoria</label><input className="input" name="category" placeholder="Sessão, aluguel…" /></div>
            <div className="field"><label>Status</label>
              <select name="status" className="input" defaultValue="pending"><option value="pending">Pendente</option><option value="paid">Pago</option></select></div>
            <button className="btn btn--primary" type="submit">Lançar</button>
          </div>
        </form>

        {rows.length === 0 ? (
          <div className="empty">Nenhum lançamento ainda.</div>
        ) : rows.map((t) => (
          <div className="list-row" key={t.id}>
            <div>
              <span className="money" style={{ color: t.kind === "income" ? "var(--champagne)" : "var(--malva-lt)" }}>
                {t.kind === "income" ? "+" : "−"} {fmtMoney(Number(t.amount))}
              </span>
              <div className="meta-line">{t.category ?? (t.kind === "income" ? "Receita" : "Despesa")} <span className="dot" /> {fmtDate(t.occurred_on)}</div>
            </div>
            <div className="iactions" style={{ margin: 0, alignItems: "center" }}>
              <span className={"pill" + (t.status === "paid" ? " ok" : t.status === "pending" ? " warn" : "")}>{t.status === "paid" ? "Pago" : t.status === "pending" ? "Pendente" : t.status}</span>
              {t.kind === "income" && (
                <form action={setTransactionStatus.bind(null, t.id)} className="iactions" style={{ margin: 0, gap: 6 }}>
                  <input type="hidden" name="status" value={t.status === "paid" ? "pending" : "paid"} />
                  <button className="btn btn--ghost" type="submit" style={{ padding: ".4em .9em" }}>
                    {t.status === "paid" ? "Marcar pendente" : "Marcar pago"}
                  </button>
                </form>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
