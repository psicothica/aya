import Link from "next/link";
import { notFound } from "next/navigation";
import { getPostById, getAuthorNames } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import PostInteractions from "@/components/PostInteractions";
import CommentSection from "@/components/CommentSection";

export const dynamic = "force-dynamic";

export default async function PostPage({ params }: { params: { id: string } }) {
  const post = await getPostById(params.id);
  if (!post) notFound();

  const supabase = createClient();
  const [{ data: interactions }, names, me] = await Promise.all([
    supabase.from("interactions").select("id, user_id, kind, comment_body, created_at").eq("post_id", params.id),
    getAuthorNames([post.author_id]),
    getCurrentUser(),
  ]);

  const rows = interactions ?? [];
  const likes = rows.filter((r) => r.kind === "like").length;
  const comments = rows
    .filter((r) => r.kind === "comment")
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((r) => ({ id: r.id, comment_body: r.comment_body, created_at: r.created_at }));

  const myId = me?.user.id;
  const liked = !!myId && rows.some((r) => r.kind === "like" && r.user_id === myId);
  const saved = !!myId && rows.some((r) => r.kind === "save" && r.user_id === myId);

  return (
    <main className="page">
      <article className="wrap article">
        <p className="eyebrow"><Link href="/feed" style={{ color: "inherit" }}>← Voltar ao feed</Link></p>
        <div className="post-meta" style={{ marginTop: "1rem" }}>
          <span>{post.category ?? "Saúde"}</span>
          {names.get(post.author_id) && <><span className="dot" /> por {names.get(post.author_id)}</>}
          {post.published_at && <><span className="dot" /> {new Date(post.published_at).toLocaleDateString("pt-BR")}</>}
        </div>
        <h1>{post.title}</h1>
        <div className="chips">{post.tags.map((t) => <span className="chip-tag" key={t}>#{t}</span>)}</div>

        {Array.isArray(post.media) && post.media.map((m, i) => {
          const url = m && typeof m === "object" && "url" in m ? String((m as { url: unknown }).url) : null;
          if (!url) return null;
          // eslint-disable-next-line @next/next/no-img-element
          return <img key={i} src={url} alt="" style={{ width: "100%", borderRadius: "14px", margin: "1rem 0", border: "1px solid var(--line)" }} />;
        })}

        {post.body && <div className="body">{post.body}</div>}

        <PostInteractions postId={post.id} initialLikes={likes} initialLiked={liked} initialSaved={saved} isAuthed={!!me} />

        <p className="disclaimer">Conteúdo informativo — não substitui avaliação profissional. Se precisar de ajuda, procure um profissional de saúde.</p>

        <CommentSection postId={post.id} initialComments={comments} isAuthed={!!me} />
      </article>
    </main>
  );
}
