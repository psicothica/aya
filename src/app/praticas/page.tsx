import { getActivities } from "@/lib/queries";
import { modalityLabel } from "@/lib/labels";

export const dynamic = "force-dynamic";

function when(iso: string | null): string {
  if (!iso) return "Data a confirmar";
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default async function PraticasPage() {
  const activities = await getActivities();
  return (
    <main className="page">
      <div className="wrap">
        <div className="page-head">
          <p className="eyebrow">Práticas em grupo</p>
          <h1>Encontros, rodas e oficinas</h1>
          <p className="lead">Experiências coletivas conduzidas por profissionais parceiros da AyA.</p>
        </div>

        {activities.length === 0 ? (
          <div className="empty">Nenhuma prática agendada no momento.</div>
        ) : (
          <div className="grid">
            {activities.map((a) => (
              <article className="card" key={a.id}>
                <div className="kicker">{when(a.starts_at)}</div>
                <h3>{a.title}</h3>
                {a.description && <p className="sub">{a.description}</p>}
                <div className="chips">
                  <span className="chip-tag">{modalityLabel(a.modality)}</span>
                  {a.capacity != null && <span className="chip-tag on">{a.capacity} vagas</span>}
                  <span className="chip-tag">{a.price ? `R$ ${a.price}` : "Gratuito"}</span>
                </div>
                <a className="btn btn--primary" href="/entrar" style={{ width: "100%", justifyContent: "center" }}>Reservar vaga</a>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
