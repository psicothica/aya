"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { updatePatientAvatar } from "@/app/painel/actions";

export default function AvatarUpload({ patientId }: { patientId: string }) {
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

    // Caminho fixo por paciente (upsert): {professional_id}/{patient_id}/avatar — a
    // RLS do bucket exige que a primeira pasta seja o id do profissional (auth.uid()).
    const ext = (file.name.split(".").pop() || "jpg").replace(/[^\w]+/g, "").toLowerCase();
    const path = `${user.id}/${patientId}/avatar.${ext || "jpg"}`;

    const up = await supabase.storage.from("patient-avatars").upload(path, file, { upsert: true });
    if (up.error) { setBusy(false); setError("Falha no upload. Verifique se o bucket 'patient-avatars' existe."); return; }

    await updatePatientAvatar(patientId, path);
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*" onChange={onFile} disabled={busy}
        style={{ fontFamily: "var(--font-body)", color: "var(--ink-soft)" }} />
      {busy && <span className="count-note"> enviando…</span>}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
