import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getAuthorNames } from "@/lib/queries";
import { approvePost, rejectPost, archivePost } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function ModeracaoPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/entrar?next=/admin/moderacao");
  if (!me.roles.includes("admin")) {
    return (
      <main className="page"><div className="wrap">
        <div className="empty">Área restrita à administração da AyA.</div>
      </div></main>
    );
  }

  const supabase = createClient();
  const { data: pending } = await supabase
    .from("posts")
    .select("id, author_id, title, body, category, tags, created_at")
    .eq("status", "pending_review")
    .order("created_at", { ascending: true });

  const posts = pending ?? [];
  const names = await getAuthorNames(posts.map((p) => p.author_id));

  // Conteúdo publicado que foi DENUNCIADO (canal de denúncia da política de moderação).
  const { data: reports } = await supabase
    .from("interactions").select("post_id, comment_body").eq("kind", "report");
  const reportCount = new Map<string, number>();
  (reports ?? []).forEach((r) => reportCount.set(r.post_id, (reportCount.get(r.post_id) ?? 0) + 1));
  const reportedIds = Array.from(reportCount.keys());
  let reported: { id: string; author_id: string; title: string; category: string | null }[] = [];
  if (reportedIds.length) {
    const { data } = await supabase
      .from("posts").select("id, author_id, title, category")
      .in("id", reportedIds).eq("status", "published");
    reported = data ?? [];
  }
  const reportedNames = await getAuthorNames(reported.map((p) => p.author_id));

  return (
    <main className="page">
      <div className="wrap article">
        <div className="page-head">
          <p className="eyebrow">Moderação</p>
          <h1>Fila de revisão</h1>
          <p className="lead">Aprove ou recuse os conteúdos antes de irem ao feed. Verifique fundamento, ausência de sensacionalismo e de promessas de cura.</p>
        </div>

        {posts.length === 0 ? (
          <div className="empty">Nada na fila. Tudo em dia.</div>
        ) : (
          <div className="feed-list">
            {posts.map((post) => (
              <article className="post-card" key={post.id}>
                <div className="post-meta">
                  <span className="pending-badge">Em revisão</span>
                  <span>{post.category ?? "Geral"}</span>
                  {names.get(post.author_id) && <><span className="dot" /> por {names.get(post.author_id)}</>}
                </div>
                <h3>{post.title}</h3>
                {post.body && <p className="post-excerpt">{post.body.slice(0, 300)}{post.body.length > 300 ? "…" : ""}</p>}
                <div className="iactions">
                  <form action={approvePost.bind(null, post.id)}>
                    <button className="btn btn--primary" type="submit">Aprovar e publicar</button>
                  </form>
                  <form action={rejectPost.bind(null, post.id)}>
                    <button className="btn btn--ghost" type="submit">Recusar</button>
                  </form>
                </div>
              </article>
            ))}
          </div>
        )}

        <section style={{ marginTop: "2.6rem" }}>
          <p className="eyebrow">Conteúdo denunciado</p>
          {reported.length === 0 ? (
            <div className="empty">Nenhuma denúncia.</div>
          ) : (
            <div className="feed-list">
              {reported.map((post) => (
                <article className="post-card" key={post.id}>
                  <div className="post-meta">
                    <span className="pending-badge">{reportCount.get(post.id) ?? 0} denúncia(s)</span>
                    <span>{post.category ?? "Geral"}</span>
                    {reportedNames.get(post.author_id) && <><span className="dot" /> por {reportedNames.get(post.author_id)}</>}
                  </div>
                  <h3>{post.title}</h3>
                  <div className="iactions">
                    <a className="btn btn--ghost" href={`/feed/${post.id}`} target="_blank" rel="noopener noreferrer">Ver no feed</a>
                    <form action={archivePost.bind(null, post.id)}>
                      <button className="btn btn--primary" type="submit">Arquivar (remover do feed)</button>
                    </form>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
