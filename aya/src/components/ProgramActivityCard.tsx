"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Activity = { id: string; assignment_id: string; professional_id: string; title: string; instructions: string | null };

export default function ProgramActivityCard({
  activity, initialDone, initialNote, patientUserId,
}: { activity: Activity; initialDone: boolean; initialNote: string; patientUserId: string }) {
  const [done, setDone] = useState(initialDone);
  const [note, setNote] = useState(initialNote);
  const [saved, setSaved] = useState<null | "saving" | "ok">(null);

  async function upsert(nextDone: boolean, nextNote: string) {
    const supabase = createClient();
    await supabase.from("assignment_progress").upsert({
      assignment_activity_id: activity.id, assignment_id: activity.assignment_id,
      professional_id: activity.professional_id, patient_user_id: patientUserId,
      done: nextDone, done_at: nextDone ? new Date().toISOString() : null, patient_note: nextNote || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "assignment_activity_id" });
  }

  async function toggle() { const v = !done; setDone(v); await upsert(v, note); }
  async function saveNote() { setSaved("saving"); await upsert(done, note); setSaved("ok"); setTimeout(() => setSaved(null), 1500); }

  return (
    <div className="card" style={{ marginBottom: "1rem" }}>
      <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
        <input type="checkbox" checked={done} onChange={toggle} style={{ marginTop: 5 }} />
        <span>
          <strong style={{ textDecoration: done ? "line-through" : "none" }}>{activity.title}</strong>
          {activity.instructions && <div className="sub" style={{ marginTop: ".2em" }}>{activity.instructions}</div>}
        </span>
      </label>
      <div className="field" style={{ marginTop: ".8em", marginBottom: 0 }}>
        <label>Minhas anotações</label>
        <textarea className="input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} onBlur={saveNote}
          placeholder="Como foi? O que sentiu?" />
        {saved === "ok" && <span className="count-note">anotação salva</span>}
      </div>
    </div>
  );
}
