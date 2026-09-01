import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import PainelNav from "@/components/PainelNav";
import { createPackage, assignPackageToPatient } from "@/app/painel/pacotes/actions";

export const dynamic = "force-dynamic";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default async function PacotesPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/entrar?next=/painel/pacotes");
  if (!me.roles.includes("professional") && !me.roles.includes("admin")) redirect("/painel");

  const supabase = createClient();
  const [{ data: packages }, { data: activePatients }, { data: allPatients }] = await Promise.all([
    supabase.from("service_packages").select("*")
      .eq("professional_id", me.user.id).eq("status", "active")
      .order("created_at", { ascending: false }),
    supabase.from("patients").select("id, full_name")
      .eq("professional_id", me.user.id).eq("is_active", true)
      .order("full_name", { ascending: true }),
    supabase.from("patients").select("id, full_name").eq("professional_id", me.user.id),
  ]);
  const patients = activePatients ?? [];
  const nameByPatientId = new Map((allPatients ?? []).map((p) => [p.id, p.full_name]));

  const packageIds = (packages ?? []).map((p) => p.id);
  let assignments: { package_id: string; status: string; patient_id: string }[] = [];
  if (packageIds.length) {
    const { data } = await supabase.from("patient_packages")
      .select("package_id, status, patient_id").in("package_id", packageIds);
    assignments = data ?? [];
  }
  const byPackage = new Map<string, typeof assignments>();
  for (const a of assignments) {
    const list = byPackage.get(a.package_id) ?? [];
    list.push(a);
    byPackage.set(a.package_id, list);
  }

  return (
    <main className="page">
      <div className="wrap">
        <p className="eyebrow">Painel</p>
        <h1 style={{ fontFamily: "var(--font-display)" }}>Pacotes de serviços</h1>
        <PainelNav />
        <p className="count-note" style={{ marginTop: "1rem" }}>Crie pacotes de sessões com preço fixo e contrate para seus pacientes.</p>

        <details className="card" style={{ margin: "1.6rem 0" }}>
          <summary style={{ cursor: "pointer", fontFamily: "var(--font-display)" }}>+ Novo pacote</summary>
          <form action={createPackage} style={{ marginTop: "1rem" }}>
            <div className="grid">
              <div className="field"><label>Título do pacote</label>
                <input className="input" name="title" placeholder="Ex: 10 sessões" required /></div>
              <div className="field"><label>Quantidade de sessões</label>
                <input className="input" type="number" name="session_count" min="1" placeholder="Ex: 10" /></div>
              <div className="field"><label>Preço total</label>
                <input className="input" type="number" step="0.01" min="0" name="price_total" placeholder="Ex: 1200.00" /></div>
              <div className="field"><label>Preço por sessão</label>
                <input className="input" type="number" step="0.01" min="0" name="price_per_item" placeholder="Ex: 120.00" /></div>
              <div className="field"><label>Validade (dias)</label>
                <input className="input" type="number" min="1" name="valid_days" placeholder="Ex: 90" /></div>
            </div>
            <div className="field"><label>Descrição</label>
              <textarea className="input" name="description" rows={3} placeholder="Descreva o pacote…" /></div>
            <button className="btn btn--primary" type="submit">Criar pacote</button>
          </form>
        </details>

        {(!packages || packages.length === 0) ? (
          <div className="empty">Nenhum pacote criado ainda.</div>
        ) : (
          <div style={{ display: "grid", gap: "1rem" }}>
            {packages.map((pkg) => (
              <div className="card" key={pkg.id}>
                <div className="row-between">
                  <div>
                    <strong>{pkg.title}</strong>
                    {pkg.description && <p className="sub">{pkg.description}</p>}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    {pkg.price_total != null && (
                      <div style={{ fontSize: "1.2em", fontWeight: "bold" }}>{brl(Number(pkg.price_total))}</div>
                    )}
                    {pkg.session_count != null && <p className="meta-line">{pkg.session_count} sessões</p>}
                    {pkg.valid_days != null && <p className="meta-line">válido por {pkg.valid_days} dias</p>}
                  </div>
                </div>

                {(byPackage.get(pkg.id) ?? []).length > 0 && (
                  <div style={{ marginTop: "1rem" }}>
                    <div className="kicker">Contratado por</div>
                    {(byPackage.get(pkg.id) ?? []).map((a, i) => (
                      <div key={i} className="meta-line">{nameByPatientId.get(a.patient_id) ?? "Paciente"} · {a.status}</div>
                    ))}
                  </div>
                )}

                {patients && patients.length > 0 && (
                  <form action={assignPackageToPatient.bind(null, pkg.id)} className="form-inline" style={{ marginTop: "1rem" }}>
                    <div className="field grow">
                      <label>Atribuir a paciente</label>
                      <select className="input" name="patient_id" required defaultValue="">
                        <option value="" disabled>Paciente…</option>
                        {patients.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                      </select>
                    </div>
                    <button className="btn btn--ghost" type="submit">Atribuir</button>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
