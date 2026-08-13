import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import PainelNav from "@/components/PainelNav";
import { assignProgram } from "@/app/programas/actions";

export const dynamic = "force-dynamic";

export default async function PainelProgramas() {
  const me = await getCurrentUser();
  if (!me) redirect("/entrar?next=/painel/programas");
  if (!me.roles.includes("professional") && !me.roles.includes("admin")) redirect("/painel");

  const supabase = createClient();
  const [{ data: licenses }, { data: patients }, { data: assignments }] = await Promise.all([
    supabase.from("program_licenses").select("program_id").eq("professional_id", me.user.id),
    supabase.from("patients").select("id, full_name").eq("professional_id", me.user.id),
    supabase.from("program_assignments").select("id, title, status, patient_id").eq("professional_id", me.user.id).order("assigned_at", { ascending: false }),
  ]);

  const progIds = (licenses ?? []).map((l) => l.program_id);
  const titleById = new Map<string, string>();
  if (progIds.length) {
    const { data: progs } = await supabase.from("programs").select("id, title").in("id", progIds);
    (progs ?? []).forEach((p) => titleById.set(p.id, p.title));
  }
  const nameById = new Map((patients ?? []).map((p) => [p.id, p.full_name]));

  return (
    <main className="page">
      <div className="wrap">
        <p className="eyebrow">Painel</p>
        <h1 style={{ fontFamily: "var(--font-display)" }}>Programas</h1>
        <PainelNav />

        <section style={{ margin: "1.4rem 0 2.4rem" }}>
          <p className="eyebrow">Licenciados — atribuir a um paciente</p>
          {(!licenses || licenses.length === 0) ? (
            <p className="count-note">Você ainda não adquiriu programas. Veja o <Link href="/programas">catálogo</Link>.</p>
          ) : (!patients || patients.length === 0) ? (
            <p className="count-note">Cadastre um paciente para poder atribuir.</p>
          ) : licenses.map((l) => (
            <form key={l.program_id} action={assignProgram} className="filters">
              <input type="hidden" name="program_id" value={l.program_id} />
              <strong className="grow">{titleById.get(l.program_id) ?? "Programa"}</strong>
              <select name="patient_id" className="input" required defaultValue="">
                <option value="" disabled>Paciente…</option>
                {patients.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
              <button className="btn btn--primary" type="submit">Atribuir</button>
            </form>
          ))}
        </section>

        <section>
          <p className="eyebrow">Atribuições</p>
          {(!assignments || assignments.length === 0) ? (
            <div className="empty">Nenhuma atribuição ainda.</div>
          ) : assignments.map((a) => (
            <div className="list-row" key={a.id}>
              <div>
                <strong>{a.title}</strong>
                <div className="meta-line">{nameById.get(a.patient_id) ?? "Paciente"} · {a.status}</div>
              </div>
              <Link className="btn btn--ghost" href={`/painel/programas/${a.id}`} style={{ padding: ".4em .9em" }}>Acompanhar</Link>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
