import { getApps } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";
import AppOpenButton from "@/components/AppOpenButton";

export const dynamic = "force-dynamic";

export default async function AppsPage() {
  const [apps, me] = await Promise.all([getApps(), getCurrentUser()]);
  return (
    <main className="page">
      <div className="wrap">
        <div className="page-head">
          <p className="eyebrow">Apps terapêuticos</p>
          <h1>Ferramentas para o dia a dia</h1>
          <p className="lead">Produtos próprios da AyA para apoiar o cuidado entre as sessões.</p>
        </div>

        {apps.length === 0 ? (
          <div className="empty">Os apps chegam em breve.</div>
        ) : (
          <div className="grid">
            {apps.map((app) => (
              <article className="card" key={app.id}>
                <div className="kicker">App da AyA</div>
                <h3>{app.name}</h3>
                {app.description && <p className="sub">{app.description}</p>}
                <div className="row-between" style={{ marginTop: ".8em" }}>
                  <span className="meta-line">{app.access_type === "linked_sso" ? "Acesso por SSO" : "Embutido"}</span>
                  <AppOpenButton appId={app.id} launchUrl={app.launch_url} isAuthed={!!me} />
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
