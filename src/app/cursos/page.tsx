import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const AUDIENCE: Record<string, string> = { student: "Estudantes", professional: "Profissionais", public: "Público", all: "Todos" };

export default async function CursosPage() {
  const supabase = createClient();
  const { data: courses } = await supabase.from("courses")
    .select("id, title, description, audience, is_paid, price")
    .eq("status", "published").order("created_at", { ascending: false });

  return (
    <main className="page">
      <div className="wrap">
        <div className="page-head">
          <p className="eyebrow">Cursos e módulos</p>
          <h1>Aprender na AyA</h1>
          <p className="lead">Cursos para estudantes, profissionais e público interessado — gratuitos e pagos.</p>
        </div>
        {(!courses || courses.length === 0) ? (
          <div className="empty">Nenhum curso publicado ainda.</div>
        ) : (
          <div className="grid">
            {courses.map((c) => (
              <article className="card" key={c.id}>
                <div className="kicker">{AUDIENCE[c.audience] ?? "Todos"}</div>
                <h3>{c.title}</h3>
                {c.description && <p className="sub">{c.description}</p>}
                <div className="row-between" style={{ marginTop: ".8em" }}>
                  <span className="chip-tag on">{c.is_paid ? `R$ ${c.price}` : "Gratuito"}</span>
                  <Link className="btn btn--ghost" href={`/cursos/${c.id}`} style={{ padding: ".5em 1em" }}>Ver curso</Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
