"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function PostInteractions({
  postId, initialLikes, initialLiked, initialSaved, isAuthed,
}: { postId: string; initialLikes: number; initialLiked: boolean; initialSaved: boolean; isAuthed: boolean }) {
  const router = useRouter();
  const [likes, setLikes] = useState(initialLikes);
  const [liked, setLiked] = useState(initialLiked);
  const [saved, setSaved] = useState(initialSaved);
  const [reported, setReported] = useState(false);
  const [busy, setBusy] = useState(false);

  function requireAuth(): boolean {
    if (!isAuthed) { router.push("/entrar?next=" + encodeURIComponent(location.pathname)); return false; }
    return true;
  }

  async function toggle(kind: "like" | "save") {
    if (!requireAuth()) return;
    setBusy(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setBusy(false); router.push("/entrar"); return; }
    const active = kind === "like" ? liked : saved;
    if (active) {
      await supabase.from("interactions").delete().eq("post_id", postId).eq("user_id", user.id).eq("kind", kind);
    } else {
      await supabase.from("interactions").insert({ post_id: postId, user_id: user.id, kind });
    }
    if (kind === "like") { setLiked(!active); setLikes((n) => n + (active ? -1 : 1)); }
    else setSaved(!active);
    setBusy(false);
  }

  async function report() {
    if (!requireAuth()) return;
    const reason = window.prompt("Por que está denunciando este conteúdo? (opcional)") ?? "";
    setBusy(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setBusy(false); router.push("/entrar"); return; }
    await supabase.from("interactions").insert({ post_id: postId, user_id: user.id, kind: "report", comment_body: reason.trim() || null });
    setReported(true);
    setBusy(false);
  }

  return (
    <div className="iactions">
      <button className={liked ? "on" : ""} onClick={() => toggle("like")} disabled={busy}>
        ♥ {likes} {likes === 1 ? "curtida" : "curtidas"}
      </button>
      <button className={saved ? "on" : ""} onClick={() => toggle("save")} disabled={busy}>
        {saved ? "★ Salvo" : "☆ Salvar"}
      </button>
      <button onClick={report} disabled={busy || reported} title="Denunciar conteúdo">
        {reported ? "Denunciado" : "⚑ Denunciar"}
      </button>
    </div>
  );
}
