import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { enrollCourse } from "@/app/cursos/actions";

export const dynamic = "force-dynamic";

export default async function CursoDetail({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: course } = await supabase.from("courses").select("*")
    .eq("id", params.id).eq("status", "published").maybeSingle();
  if (!course) notFound();

  const [{ data: modules }, me] = await Promise.all([
    supabase.from("course_modules").select("id, title, position").eq("course_id", params.id).order("position", { ascending: true }),
    getCurrentUser(),
  ]);
  const { data: lessons } = await supabase.from("course_lessons")
    .select("id, module_id, title, position").eq("course_id", params.id).order("position", { ascending: true });
  const lessonsByModule = new Map<string, { title: string }[]>();
  (lessons ?? []).forEach((l) => {
    const arr = lessonsByModule.get(l.module_id) ?? [];
    arr.push({ title: l.title });
    lessonsByModule.set(l.module_id, arr);
  });

  let enrolled = false;
  if (me) {
    const { data: e } = await supabase.from("course_enrollments").select("id")
      .eq("user_id", me.user.id).eq("course_id", params.id).maybeSingle();
    enrolled = !!e;
  }

  return (
    <main className="page">
      <div className="wrap article">
        <p className="eyebrow"><Link href="/cursos" style={{ color: "inherit" }}>← Cursos</Link></p>
        <h1>{course.title}</h1>
        <div className="chips"><span className="chip-tag on">{course.is_paid ? `R$ ${course.price}` : "Gratuito"}</span></div>
        {course.description && <p className="lead" style={{ marginTop: "1rem" }}>{course.description}</p>}

        <section style={{ marginTop: "1.6rem" }}>
          <p className="eyebrow">Conteúdo</p>
          {(modules ?? []).map((m) => (
            <div className="card" key={m.id} style={{ marginBottom: ".7em" }}>
              <strong>{m.position}. {m.title}</strong>
              <ul style={{ margin: ".4em 0 0", paddingLeft: "1.1em", color: "var(--ink-soft)" }}>
                {(lessonsByModule.get(m.id) ?? []).map((l, i) => <li key={i}>{l.title}</li>)}
              </ul>
            </div>
          ))}
        </section>

        <div className="iactions">
          {enrolled ? (
            <Link className="btn btn--primary" href={`/cursos/${params.id}/aprender`}>Continuar curso</Link>
          ) : (
            <form action={enrollCourse.bind(null, course.id)}>
              <button className="btn btn--primary" type="submit">{course.is_paid ? `Inscrever-se · R$ ${course.price}` : "Inscrever-se (gratuito)"}</button>
            </form>
          )}
        </div>
        {course.is_paid && !enrolled && <p className="count-note">A cobrança de cursos pagos entra na Fase 4; por ora a inscrição é registrada e o conteúdo liberado.</p>}
      </div>
    </main>
  );
}
