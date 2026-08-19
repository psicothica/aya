import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ProgramasPage() {
  const supabase = createClient();
  const { data: programs } = await supabase.from("programs")
    .select("id, title, description, category, is_paid, price")
    .eq("status", "published").order("created_at", { ascending: false });

  return (
    <main className="page">
      <div className="wrap">
        <div className="page-head">
          <p className="eyebrow">Programas terapêuticos</p>
          <h1>Programas para atribuir a pacientes</h1>
          <p className="lead">Protocolos com atividades, prontos para o profissional adquirir, ajustar e acompanhar — e o paciente registrar o progresso e anotações.</p>
        </div>
        {(!programs || programs.length === 0) ? (
          <div className="empty">Nenhum programa disponível ainda.</div>
        ) : (
          <div className="grid">
            {programs.map((p) => (
              <article className="card" key={p.id}>
                <div className="kicker">{p.category ?? "Programa"}</div>
                <h3>{p.title}</h3>
                {p.description && <p className="sub">{p.description}</p>}
                <div className="row-between" style={{ marginTop: ".8em" }}>
                  <span className="chip-tag on">{p.is_paid ? `R$ ${p.price}` : "Gratuito"}</span>
                  <Link className="btn btn--ghost" href={`/programas/${p.id}`} style={{ padding: ".5em 1em" }}>Ver programa</Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
