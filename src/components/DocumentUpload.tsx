"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DocumentUpload({ patientId }: { patientId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true); setError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setBusy(false); router.push("/entrar"); return; }

    // Caminho: {professional_id}/{patient_id}/{timestamp-arquivo} — a RLS do bucket
    // exige que a primeira pasta seja o id do profissional (auth.uid()).
    const safe = file.name.replace(/[^\w.\-]+/g, "_");
    const path = `${user.id}/${patientId}/${Date.now()}-${safe}`;

    const up = await supabase.storage.from("patient-documents").upload(path, file, { upsert: false });
    if (up.error) { setBusy(false); setError("Falha no upload. Verifique se o bucket 'patient-documents' existe."); return; }

    const { error: metaErr } = await supabase.from("documents").insert({
      professional_id: user.id, patient_id: patientId, storage_path: path, title: file.name,
    });
    if (metaErr) setError("Arquivo enviado, mas não foi possível registrar o documento.");
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  return (
    <div style={{ marginTop: ".8em" }}>
      <input ref={inputRef} type="file" onChange={onFile} disabled={busy}
        style={{ fontFamily: "var(--font-body)", color: "var(--ink-soft)" }} />
      {busy && <span className="count-note"> enviando…</span>}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
