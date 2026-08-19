"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type C = { id: string; comment_body: string | null; created_at: string };

export default function CommentSection({
  postId, initialComments, isAuthed,
}: { postId: string; initialComments: C[]; isAuthed: boolean }) {
  const router = useRouter();
  const [comments, setComments] = useState<C[]>(initialComments);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!isAuthed) { router.push("/entrar?next=" + encodeURIComponent(location.pathname)); return; }
    const body = text.trim();
    if (!body) return;
    setBusy(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setBusy(false); router.push("/entrar"); return; }
    const { data, error } = await supabase.from("interactions")
      .insert({ post_id: postId, user_id: user.id, kind: "comment", comment_body: body })
      .select("id, comment_body, created_at").single();
    if (!error && data) {
      setComments((c) => [...c, data]);
      setText("");
    }
    setBusy(false);
  }

  return (
    <section className="comments">
      <p className="eyebrow">Comentários</p>

      {comments.length === 0 && <p className="count-note">Ainda não há comentários.</p>}
      {comments.map((c) => (
        <div className="comment" key={c.id}>
          <div className="who">Membro da AyA · {new Date(c.created_at).toLocaleDateString("pt-BR")}</div>
          <div>{c.comment_body}</div>
        </div>
      ))}

      <div className="field" style={{ marginTop: "1rem" }}>
        <label htmlFor="c">Escreva um comentário</label>
        <textarea id="c" className="input" rows={3} value={text}
          onChange={(e) => setText(e.target.value)} placeholder={isAuthed ? "Compartilhe com respeito…" : "Entre para comentar"} />
      </div>
      <button className="btn btn--primary" onClick={submit} disabled={busy || !text.trim()}>
        {busy ? "Enviando…" : "Comentar"}
      </button>
    </section>
  );
}
