"use client";

import { useState } from "react";

export interface SessionOption {
  id: string;
  patient_name?: string | null;
  starts_at: string;
  status: string;
}

const STATUS_COLOR: Record<string, string> = {
  completed: "#7fbf8f",
  cancelled: "#ff8a8a",
  no_show: "#ff8a8a",
};

export function SessionSelector<T extends SessionOption>({
  sessions,
  selected,
  onSelect,
}: {
  sessions: T[];
  selected: T | null;
  onSelect: (session: T) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: "relative", display: "inline-block", minWidth: 260 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="input"
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selected?.patient_name || "Selecione uma sessão"}
        </span>
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s", flexShrink: 0, marginLeft: 8 }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          className="card"
          style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 50, maxHeight: 320, overflowY: "auto", padding: 0 }}
        >
          {sessions.length === 0 ? (
            <div className="count-note" style={{ padding: "1em", marginBottom: 0 }}>Nenhuma sessão</div>
          ) : (
            sessions.map((session) => (
              <button
                key={session.id}
                type="button"
                onClick={() => { onSelect(session); setOpen(false); }}
                style={{
                  display: "block", width: "100%", textAlign: "left", padding: ".8em 1em",
                  background: "transparent", border: "none", borderBottom: "1px solid var(--line)", cursor: "pointer",
                }}
              >
                <div style={{ fontWeight: 600 }}>{session.patient_name || "Paciente"}</div>
                <div className="meta-line">
                  {new Date(session.starts_at).toLocaleString("pt-BR", {
                    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                  })}
                </div>
                <div style={{ fontSize: ".8rem", marginTop: ".2em", color: STATUS_COLOR[session.status] ?? "var(--aya-champagne)" }}>
                  {session.status}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
