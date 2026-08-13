"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AppOpenButton({
  appId, launchUrl, isAuthed,
}: { appId: string; launchUrl: string | null; isAuthed: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function open() {
    if (!isAuthed) { router.push("/entrar?next=/apps"); return; }
    setBusy(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setBusy(false); router.push("/entrar"); return; }

    // Registra adesão/uso (métrica e continuidade de cuidado).
    const { data: existing } = await supabase.from("app_usage")
      .select("id, usage_count").eq("app_id", appId).eq("client_id", user.id).maybeSingle();
    if (existing) {
      await supabase.from("app_usage").update({
        usage_count: (existing.usage_count ?? 0) + 1, last_used_at: new Date().toISOString(),
      }).eq("id", existing.id);
    } else {
      await supabase.from("app_usage").insert({ app_id: appId, client_id: user.id, usage_count: 1 });
    }

    setBusy(false);
    // PONTO DE INTEGRAÇÃO SSO: quando os apps expuserem login/API, troque este
    // open() por um handoff com token assinado (ex.: /api/apps/${appId}/launch).
    if (launchUrl) window.open(launchUrl, "_blank", "noopener");
  }

  return (
    <button className="btn btn--ghost" onClick={open} disabled={busy} style={{ padding: ".5em 1em" }}>
      {busy ? "Abrindo…" : "Abrir"}
    </button>
  );
}
