"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LessonComplete({
  lessonId, courseId, userId, initialDone,
}: { lessonId: string; courseId: string; userId: string; initialDone: boolean }) {
  const [done, setDone] = useState(initialDone);
  const [busy, setBusy] = useState(false);
  async function toggle() {
    setBusy(true);
    const supabase = createClient();
    if (done) {
      await supabase.from("lesson_progress").delete().eq("user_id", userId).eq("lesson_id", lessonId);
      setDone(false);
    } else {
      await supabase.from("lesson_progress").upsert(
        { user_id: userId, lesson_id: lessonId, course_id: courseId, completed: true },
        { onConflict: "user_id,lesson_id" });
      setDone(true);
    }
    setBusy(false);
  }
  return (
    <button className={"btn " + (done ? "btn--ghost on" : "btn--primary")} onClick={toggle} disabled={busy}
      style={done ? { borderColor: "var(--malva)", background: "rgba(115,52,66,.24)", padding: ".5em 1em" } : { padding: ".5em 1em" }}>
      {done ? "✓ Concluída" : "Marcar como concluída"}
    </button>
  );
}
