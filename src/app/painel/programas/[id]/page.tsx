import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { addAssignmentActivity, deleteAssignmentActivity } from "@/app/programas/actions";
import { fmtDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AssignmentMonitor({ params }: { params: { id: string } }) {
  const me = await getCurrentUser();
  if (!me) redirect("/entrar");
  if (!me.roles.includes("professional") && !me.roles.includes("admin")) redirect("/painel");

  const supabase = createClient();
  const { data: assignment } = await supabase.from("program_assignments").select("*")
    .eq("id", params.id).eq("professional_id", me.user.id).maybeSingle();
  if (!assignment) notFound();

  const [{ data: patient }, { data: acts }, { data: progress }] = await Promise.all([
    supabase.from("patients").select("full_name").eq("id", assignment.patient_id).maybeSingle(),
    supabase.from("assignment_activities").select("*").eq("assignment_id", params.id).order("position", { ascending: true }),
    supabase.from("assignment_progress").select("*").eq("assignment_id", params.id),
  ]);
  const progByActivity = new Map((progress ?? []).map((p) => [p.assignment_activity_id, p]));
  const doneCount = (progress ?? []).filter((p) => p.done).length;

  return (
    <main className="page">
      <div className="wrap article">
        <p className="eyebrow"><Link href="/painel/programas" style={{ color: "inherit" }}>← Programas</Link></p>
        <h1 style={{ fontFamily: "var(--font-display)" }}>{assignment.title}</h1>
        <div className="meta-line">Paciente: {patient?.full_name ?? "—"} · {doneCount}/{(acts ?? []).length} concluídas
          {!assignment.patient_user_id && <> · <span className="pill">paciente sem conta (não acompanha online)</span></>}
        </div>

        <section style={{ marginTop: "1.6rem" }}>
          <p className="eyebrow">Atividades (ajuste como quiser)</p>
          {(acts ?? []).map((a) => {
            const pr = progByActivity.get(a.id);
            return (
              <div className="card" key={a.id} style={{ marginBottom: ".8em" }}>
                <div className="row-between">
                  <strong>{a.position}. {a.title}</strong>
                  <form action={deleteAssignmentActivity.bind(null, a.id, params.id)}>
                    <button className="btn btn--quiet" type="submit">Remover</button>
                  </form>
                </div>
                {a.instructions && <div className="sub" style={{ marginTop: ".2em" }}>{a.instructions}</div>}
                <div className="meta-line" style={{ marginTop: ".5em" }}>
                  {pr?.done ? `✓ concluída ${pr.done_at ? "em " + fmtDateTime(pr.done_at) : ""}` : "pendente"}
                </div>
                {pr?.patient_note && <div className="note-item" style={{ marginTop: ".4em" }}><div className="when">anotação do paciente</div>{pr.patient_note}</div>}
              </div>
            );
          })}
          <form action={addAssignmentActivity.bind(null, params.id)} className="card" style={{ marginTop: "1rem" }}>
            <div className="field"><label>Nova atividade</label>
              <input className="input" name="title" placeholder="Título" required /></div>
            <div className="field" style={{ marginBottom: ".6em" }}><label>Instruções</label>
              <textarea className="input" name="instructions" rows={2} placeholder="Orientações para o paciente" /></div>
            <button className="btn btn--primary" type="submit">Adicionar atividade</button>
          </form>
        </section>
      </div>
    </main>
  );
}
