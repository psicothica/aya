import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import ProgramActivityCard from "@/components/ProgramActivityCard";

export const dynamic = "force-dynamic";

export default async function MeuProgramaDetail({ params }: { params: { id: string } }) {
  const me = await getCurrentUser();
  if (!me) redirect("/entrar?next=/meus-programas");

  const supabase = createClient();
  const { data: assignment } = await supabase.from("program_assignments")
    .select("id, title").eq("id", params.id).eq("patient_user_id", me.user.id).maybeSingle();
  if (!assignment) notFound();

  const [{ data: acts }, { data: progress }] = await Promise.all([
    supabase.from("assignment_activities").select("id, assignment_id, professional_id, title, instructions, position")
      .eq("assignment_id", params.id).order("position", { ascending: true }),
    supabase.from("assignment_progress").select("assignment_activity_id, done, patient_note").eq("assignment_id", params.id),
  ]);
  const progByActivity = new Map((progress ?? []).map((p) => [p.assignment_activity_id, p]));

  return (
    <main className="page">
      <div className="wrap article">
        <p className="eyebrow"><Link href="/meus-programas" style={{ color: "inherit" }}>← Meus programas</Link></p>
        <h1>{assignment.title}</h1>
        <p className="count-note" style={{ marginBottom: "1.4rem" }}>Marque cada atividade ao concluir e registre suas anotações — seu profissional acompanha.</p>
        {(acts ?? []).map((a) => {
          const pr = progByActivity.get(a.id);
          return (
            <ProgramActivityCard
              key={a.id}
              activity={{ id: a.id, assignment_id: a.assignment_id, professional_id: a.professional_id, title: a.title, instructions: a.instructions }}
              initialDone={!!pr?.done}
              initialNote={pr?.patient_note ?? ""}
              patientUserId={me.user.id}
            />
          );
        })}
      </div>
    </main>
  );
}
