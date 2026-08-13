"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ComposeForm() {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!title.trim() || !body.trim()) { setError("Título e conteúdo são obrigatórios."); return; }
    setState("busy");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setState("idle"); setError("Sessão expirada. Entre novamente."); return; }

    // Imagem opcional -> bucket público 'post-media' (sob a pasta do autor).
    const media: { type: string; url: string }[] = [];
    if (file) {
      const safe = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `${user.id}/${Date.now()}-${safe}`;
      const up = await supabase.storage.from("post-media").upload(path, file, { upsert: false });
      if (up.error) { setState("idle"); setError("Falha ao enviar a imagem. Verifique se o bucket 'post-media' existe."); return; }
      const { data: pub } = supabase.storage.from("post-media").getPublicUrl(path);
      if (pub?.publicUrl) media.push({ type: "image", url: pub.publicUrl });
    }

    const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
    const { error } = await supabase.from("posts").insert({
      author_id: user.id, title: title.trim(), body: body.trim(),
      category: category.trim() || null, tags: tagList, media, status: "pending_review",
    });
    if (error) { setState("idle"); setError("Não foi possível enviar. Só profissionais aprovados podem publicar."); return; }
    setState("done");
  }

  if (state === "done") {
    return (
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Enviado para moderação</h3>
        <p className="sub">Seu texto (e a imagem, se houver) entrou na fila de revisão da equipe AyA. Assim que aprovado, aparece no feed.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="field">
        <label htmlFor="t">Título</label>
        <input id="t" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Um título claro e sem sensacionalismo" />
      </div>
      <div className="field">
        <label htmlFor="cat">Tema</label>
        <input id="cat" className="input" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ex.: Fisiologia, Comportamento alimentar" />
      </div>
      <div className="field">
        <label htmlFor="tg">Tags (separadas por vírgula)</label>
        <input id="tg" className="input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="ansiedade, respiração" />
      </div>
      <div className="field">
        <label htmlFor="img">Imagem (opcional)</label>
        <input id="img" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          style={{ fontFamily: "var(--font-body)", color: "var(--ink-soft)" }} />
      </div>
      <div className="field">
        <label htmlFor="b">Conteúdo</label>
        <textarea id="b" className="input" rows={10} value={body} onChange={(e) => setBody(e.target.value)}
          placeholder="Escreva conteúdo educativo, com fundamento e sem promessas de cura." />
      </div>
      {error && <p className="error">{error}</p>}
      <button className="btn btn--primary" onClick={submit} disabled={state === "busy"}>
        {state === "busy" ? "Enviando…" : "Enviar para moderação"}
      </button>
      <p className="note">Todo conteúdo (texto e imagem) passa por revisão antes de ser publicado.</p>
    </div>
  );
}
