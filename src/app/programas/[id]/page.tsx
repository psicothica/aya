import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { acquireProgram } from "@/app/programas/actions";

export const dynamic = "force-dynamic";

export default async function ProgramaDetail({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: prog } = await supabase.from("programs").select("*")
    .eq("id", params.id).eq("status", "published").maybeSingle();
  if (!prog) notFound();

  const [{ data: acts }, me] = await Promise.all([
    supabase.from("program_activities").select("*").eq("program_id", params.id).order("position", { ascending: true }),
    getCurrentUser(),
  ]);
  const isPro = me ? (me.roles.includes("professional") || me.roles.includes("admin")) : false;
  let licensed = false;
  if (isPro && me) {
    const { data: lic } = await supabase.from("program_licenses").select("id")
      .eq("professional_id", me.user.id).eq("program_id", params.id).maybeSingle();
    licensed = !!lic;
  }

  return (
    <main className="page">
      <div className="wrap article">
        <p className="eyebrow"><Link href="/programas" style={{ color: "inherit" }}>← Programas</Link></p>
        <h1>{prog.title}</h1>
        <div className="chips">
          <span className="chip-tag">{prog.category ?? "Programa"}</span>
          <span className="chip-tag on">{prog.is_paid ? `R$ ${prog.price}` : "Gratuito"}</span>
        </div>
        {prog.description && <p className="lead" style={{ marginTop: "1rem" }}>{prog.description}</p>}

        <section style={{ marginTop: "1.6rem" }}>
          <p className="eyebrow">Atividades do programa</p>
          {(acts ?? []).map((a) => (
            <div className="card" key={a.id} style={{ marginBottom: ".7em" }}>
              <strong>{a.position}. {a.title}</strong>
              {a.instructions && <div className="sub" style={{ marginTop: ".2em" }}>{a.instructions}</div>}
            </div>
          ))}
        </section>

        <div className="iactions">
          {isPro ? (
            licensed
              ? <Link className="btn btn--primary" href="/painel/programas">Atribuir a um paciente</Link>
              : <form action={acquireProgram.bind(null, prog.id)}>
                  <button className="btn btn--primary" type="submit">{prog.is_paid ? `Adquirir · R$ ${prog.price}` : "Adquirir (gratuito)"}</button>
                </form>
          ) : (
            <Link className="btn btn--ghost" href="/entrar">Entre como profissional para adquirir</Link>
          )}
        </div>
        {isPro && prog.is_paid && !licensed && (
          <p className="count-note">A cobrança de programas pagos entra na Fase 4; por ora a licença é registrada.</p>
        )}
      </div>
    </main>
  );
}
