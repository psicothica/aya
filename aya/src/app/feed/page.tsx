import Link from "next/link";
import { getPublishedPosts, getFeedCategories, getAuthorNames } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Search = { [k: string]: string | string[] | undefined };

function firstImage(media: unknown): string | null {
  if (!Array.isArray(media)) return null;
  for (const m of media) {
    if (m && typeof m === "object" && "url" in m) return String((m as { url: unknown }).url);
  }
  return null;
}

export default async function FeedPage({ searchParams }: { searchParams: Search }) {
  const cat = Array.isArray(searchParams.cat) ? searchParams.cat[0] : searchParams.cat;
  const [posts, categories] = await Promise.all([getPublishedPosts(cat), getFeedCategories()]);
  const names = await getAuthorNames(posts.map((p) => p.author_id));

  // Contagens de curtidas e comentários (anon pode ler interações de posts publicados).
  const likeCount = new Map<string, number>();
  const commentCount = new Map<string, number>();
  const ids = posts.map((p) => p.id);
  if (ids.length) {
    const supabase = createClient();
    const { data: ix } = await supabase.from("interactions").select("post_id, kind").in("post_id", ids);
    (ix ?? []).forEach((r) => {
      if (r.kind === "like") likeCount.set(r.post_id, (likeCount.get(r.post_id) ?? 0) + 1);
      if (r.kind === "comment") commentCount.set(r.post_id, (commentCount.get(r.post_id) ?? 0) + 1);
    });
  }

  return (
    <main className="page">
      <div className="wrap">
        <div className="page-head">
          <p className="eyebrow">Feed em saúde</p>
          <h1>Conteúdo para cuidar de você</h1>
          <p className="lead">Textos educativos da AyA e dos profissionais parceiros. Informativo — não substitui avaliação profissional.</p>
        </div>

        <div className="chips" style={{ marginBottom: "1.6rem" }}>
          <Link className={"chip-tag" + (!cat ? " on" : "")} href="/feed">Tudo</Link>
          {categories.map((c) => (
            <Link key={c} className={"chip-tag" + (cat === c ? " on" : "")} href={`/feed?cat=${encodeURIComponent(c)}`}>{c}</Link>
          ))}
        </div>

        {posts.length === 0 ? (
          <div className="empty">Nenhuma publicação por aqui ainda.</div>
        ) : (
          <div className="feed-list">
            {posts.map((post) => {
              const img = firstImage(post.media);
              return (
                <article className="post-card" key={post.id}>
                  <div className="post-meta">
                    <span>{post.category ?? "Saúde"}</span>
                    {names.get(post.author_id) && <><span className="dot" /> por {names.get(post.author_id)}</>}
                    {post.published_at && <><span className="dot" /> {new Date(post.published_at).toLocaleDateString("pt-BR")}</>}
                  </div>
                  <Link className="title" href={`/feed/${post.id}`}><h3>{post.title}</h3></Link>
                  {img && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt="" style={{ width: "100%", borderRadius: "12px", margin: ".6em 0", border: "1px solid var(--line)" }} />
                  )}
                  {post.body && <p className="post-excerpt">{post.body.slice(0, 180)}{post.body.length > 180 ? "…" : ""}</p>}
                  <div className="post-meta" style={{ marginTop: ".7em" }}>
                    <span>♥ {likeCount.get(post.id) ?? 0}</span>
                    <span className="dot" /> <span>💬 {commentCount.get(post.id) ?? 0}</span>
                  </div>
                  <div className="chips" style={{ marginTop: ".4em" }}>
                    {post.tags.slice(0, 4).map((t) => <span className="chip-tag" key={t}>#{t}</span>)}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
