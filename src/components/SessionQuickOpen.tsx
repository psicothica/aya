"use client";

import { useState } from "react";
import Link from "next/link";
import { SessionSelector, type SessionOption } from "@/components/SessionSelector";

interface QuickSession extends SessionOption {
  patient_id: string;
}

export function SessionQuickOpen({ sessions }: { sessions: QuickSession[] }) {
  const [selected, setSelected] = useState<QuickSession | null>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: ".8rem", alignItems: "flex-start" }}>
      <SessionSelector sessions={sessions} selected={selected} onSelect={setSelected} />
      {selected && (
        <Link className="btn btn--ghost" href={`/painel/pacientes/${selected.patient_id}`} style={{ padding: ".5em 1em" }}>
          Abrir prontuário
        </Link>
      )}
    </div>
  );
}
