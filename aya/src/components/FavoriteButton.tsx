"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/database.types";

type Target = Database["public"]["Enums"]["favorite_target"];

export default function FavoriteButton({
  targetType, targetId, initialSaved, isAuthed,
}: { targetType: Target; targetId: string; initialSaved: boolean; isAuthed: boolean }) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (!isAuthed) { router.push("/entrar?next=" + encodeURIComponent(location.pathname)); return; }
    setBusy(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setBusy(false); router.push("/entrar"); return; }
    if (saved) {
      await supabase.from("favorites").delete()
        .eq("user_id", user.id).eq("target_type", targetType).eq("target_id", targetId);
      setSaved(false);
    } else {
      await supabase.from("favorites").insert({ user_id: user.id, target_type: targetType, target_id: targetId });
      setSaved(true);
    }
    setBusy(false);
  }

  return (
    <button className={"btn btn--ghost" + (saved ? " on" : "")} onClick={toggle} disabled={busy}
      style={saved ? { borderColor: "var(--malva)", background: "rgba(115,52,66,.24)" } : undefined}>
      {saved ? "★ Salvo" : "☆ Salvar"}
    </button>
  );
}
