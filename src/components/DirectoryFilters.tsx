"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { PROFESSION_LABELS, MODALITY_LABELS } from "@/lib/labels";

export default function DirectoryFilters() {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");

  function apply(next: Record<string, string>) {
    const params = new URLSearchParams(sp.toString());
    Object.entries(next).forEach(([k, v]) => {
      if (v) params.set(k, v);
      else params.delete(k);
    });
    router.push(`/profissionais?${params.toString()}`);
  }

  return (
    <div className="filters" role="search">
      <div className="search grow">
        <span className="ic" aria-hidden="true">⌕</span>
        <input
          type="text"
          placeholder="Buscar por nome, tema ou abordagem…"
          aria-label="Buscar profissionais"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") apply({ q }); }}
        />
      </div>

      <select className="input" aria-label="Área"
        defaultValue={sp.get("profession") ?? ""}
        onChange={(e) => apply({ profession: e.target.value })}>
        <option value="">Todas as áreas</option>
        {Object.entries(PROFESSION_LABELS).map(([v, label]) => (
          <option key={v} value={v}>{label}</option>
        ))}
      </select>

      <select className="input" aria-label="Modalidade"
        defaultValue={sp.get("modality") ?? ""}
        onChange={(e) => apply({ modality: e.target.value })}>
        <option value="">Qualquer modalidade</option>
        {Object.entries(MODALITY_LABELS).map(([v, label]) => (
          <option key={v} value={v}>{label}</option>
        ))}
      </select>

      <select className="input" aria-label="Preço máximo"
        defaultValue={sp.get("maxPrice") ?? ""}
        onChange={(e) => apply({ maxPrice: e.target.value })}>
        <option value="">Qualquer preço</option>
        <option value="100">Até R$ 100</option>
        <option value="150">Até R$ 150</option>
        <option value="200">Até R$ 200</option>
      </select>

      {sp.toString() && (
        <button className="btn btn--quiet" onClick={() => router.push("/profissionais")}>Limpar</button>
      )}
    </div>
  );
}
