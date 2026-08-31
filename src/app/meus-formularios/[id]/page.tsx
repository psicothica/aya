import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import FormAnswerFields, { type AnswerQuestion, type AnswerValue } from "@/components/FormAnswerFields";
import { saveFormResponses } from "@/app/painel/formularios/actions";

export const dynamic = "force-dynamic";

export default async function MeuFormularioDetail({ params }: { params: { id: string } }) {
  const me = await getCurrentUser();
  if (!me) redirect("/entrar?next=/meus-formularios");

  const supabase = createClient();
  const { data: assignment } = await supabase.from("form_assignments")
    .select("id, title, description, status")
    .eq("id", params.id).eq("patient_user_id", me.user.id).eq("respondent", "patient").maybeSingle();
  if (!assignment) notFound();

  const [{ data: questions }, { data: responses }] = await Promise.all([
    supabase.from("form_assignment_questions").select("id, section, kind, label, help_text, options, required")
      .eq("assignment_id", params.id).order("position", { ascending: true }),
    supabase.from("form_responses").select("assignment_question_id, value_text, value_number, value_bool")
      .eq("assignment_id", params.id),
  ]);
  const answers = new Map<string, AnswerValue>((responses ?? []).map((r) => [r.assignment_question_id, r]));
  const completed = assignment.status === "completed";

  return (
    <main className="page">
      <div className="wrap article">
        <p className="eyebrow"><Link href="/meus-formularios" style={{ color: "inherit" }}>← Meus formulários</Link></p>
        <h1>{assignment.title}</h1>
        {assignment.description && <p className="count-note" style={{ marginTop: ".6rem" }}>{assignment.description}</p>}

        {completed ? (
          <div style={{ marginTop: "1.4rem" }}>
            <p className="count-note">Você já concluiu este formulário. Suas respostas:</p>
            <FormAnswerFields questions={(questions ?? []) as AnswerQuestion[]} answers={answers} readOnly />
          </div>
        ) : (
          <form action={saveFormResponses.bind(null, assignment.id)} style={{ marginTop: "1.4rem" }}>
            <FormAnswerFields questions={(questions ?? []) as AnswerQuestion[]} answers={answers} />
            <button className="btn btn--primary" type="submit" style={{ marginTop: "1rem" }}>Enviar respostas</button>
          </form>
        )}
      </div>
    </main>
  );
}
