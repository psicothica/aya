import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import PainelNav from "@/components/PainelNav";
import FormAnswerFields, { type AnswerQuestion, type AnswerValue } from "@/components/FormAnswerFields";
import { saveFormResponses } from "@/app/painel/formularios/actions";

export const dynamic = "force-dynamic";

export default async function PreencherFormulario({ params }: { params: { assignmentId: string } }) {
  const me = await getCurrentUser();
  if (!me) redirect("/entrar?next=/painel/formularios");
  if (!me.roles.includes("professional") && !me.roles.includes("admin")) redirect("/painel");

  const supabase = createClient();
  const { data: assignment } = await supabase.from("form_assignments")
    .select("id, title, description, respondent, status, patient_id")
    .eq("id", params.assignmentId).eq("professional_id", me.user.id).eq("respondent", "professional").maybeSingle();
  if (!assignment) notFound();

  const [{ data: questions }, { data: responses }] = await Promise.all([
    supabase.from("form_assignment_questions").select("id, section, kind, label, help_text, options, required")
      .eq("assignment_id", params.assignmentId).order("position", { ascending: true }),
    supabase.from("form_responses").select("assignment_question_id, value_text, value_number, value_bool")
      .eq("assignment_id", params.assignmentId),
  ]);
  const answers = new Map<string, AnswerValue>((responses ?? []).map((r) => [r.assignment_question_id, r]));

  return (
    <main className="page">
      <div className="wrap article">
        <p className="eyebrow"><Link href={`/painel/pacientes/${assignment.patient_id}`} style={{ color: "inherit" }}>← Ficha do paciente</Link></p>
        <h1 style={{ fontFamily: "var(--font-display)" }}>{assignment.title}</h1>
        <PainelNav />
        {assignment.description && <p className="count-note" style={{ marginTop: "1rem" }}>{assignment.description}</p>}

        <form action={saveFormResponses.bind(null, assignment.id)} style={{ marginTop: "1.4rem" }}>
          <FormAnswerFields questions={(questions ?? []) as AnswerQuestion[]} answers={answers} />
          <button className="btn btn--primary" type="submit" style={{ marginTop: "1rem" }}>
            {assignment.status === "completed" ? "Salvar alterações" : "Concluir"}
          </button>
        </form>
      </div>
    </main>
  );
}
