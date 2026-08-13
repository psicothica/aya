import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import LessonComplete from "@/components/LessonComplete";

export const dynamic = "force-dynamic";

export default async function Aprender({ params }: { params: { id: string } }) {
  const me = await getCurrentUser();
  if (!me) redirect(`/entrar?next=/cursos/${params.id}/aprender`);

  const supabase = createClient();
  const { data: course } = await supabase.from("courses").select("id, title, is_paid")
    .eq("id", params.id).eq("status", "published").maybeSingle();
  if (!course) notFound();

  const { data: enrollment } = await supabase.from("course_enrollments").select("id")
    .eq("user_id", me.user.id).eq("course_id", params.id).maybeSingle();
  // Curso pago exige inscrição; gratuito pode ler direto.
  if (!enrollment && course.is_paid) redirect(`/cursos/${params.id}`);

  const [{ data: modules }, { data: lessons }, { data: progress }] = await Promise.all([
    supabase.from("course_modules").select("id, title, position").eq("course_id", params.id).order("position", { ascending: true }),
    supabase.from("course_lessons").select("id, module_id, title, content, position").eq("course_id", params.id).order("position", { ascending: true }),
    supabase.from("lesson_progress").select("lesson_id").eq("user_id", me.user.id).eq("course_id", params.id),
  ]);
  const doneSet = new Set((progress ?? []).map((p) => p.lesson_id));
  const lessonsByModule = new Map<string, typeof lessons>();
  (lessons ?? []).forEach((l) => {
    const arr = lessonsByModule.get(l.module_id) ?? [];
    arr!.push(l);
    lessonsByModule.set(l.module_id, arr);
  });

  return (
    <main className="page">
      <div className="wrap article">
        <p className="eyebrow"><Link href={`/cursos/${params.id}`} style={{ color: "inherit" }}>← {course.title}</Link></p>
        <h1>{course.title}</h1>
        <p className="count-note" style={{ marginBottom: "1.4rem" }}>
          {doneSet.size}/{(lessons ?? []).length} aulas concluídas
        </p>

        {(modules ?? []).map((m) => (
          <section key={m.id} style={{ marginBottom: "2rem" }}>
            <p className="eyebrow">{m.position}. {m.title}</p>
            {(lessonsByModule.get(m.id) ?? []).map((l) => (
              <div className="card" key={l.id} style={{ marginBottom: "1rem" }}>
                <h3 style={{ marginTop: 0 }}>{l.title}</h3>
                {l.content && <div className="body" style={{ marginTop: ".4rem" }}>{l.content}</div>}
                <div style={{ marginTop: "1rem" }}>
                  <LessonComplete lessonId={l.id} courseId={params.id} userId={me.user.id} initialDone={doneSet.has(l.id)} />
                </div>
              </div>
            ))}
          </section>
        ))}
      </div>
    </main>
  );
}
