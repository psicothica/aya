import Link from "next/link";
import DirectoryFilters from "@/components/DirectoryFilters";
import { getApprovedProfessionals, type DirectoryFilters as F } from "@/lib/queries";
import { professionLabel, modalityLabel } from "@/lib/labels";
import type { Database } from "@/lib/database.types";

export const dynamic = "force-dynamic";

type Search = { [k: string]: string | string[] | undefined };
type Profession = Database["public"]["Enums"]["profession_type"];
type Modality = Database["public"]["Enums"]["attendance_modality"];

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function priceLabel(min: number | null, max: number | null): string {
  if (min == null && max == null) return "Sob consulta";
  if (min != null && max != null) return `R$ ${min}–${max}`;
  return `a partir de R$ ${min ?? max}`;
}

export default async function ProfissionaisPage({ searchParams }: { searchParams: Search }) {
  const filters: F = {
    q: one(searchParams.q),
    profession: one(searchParams.profession) as Profession | undefined,
    modality: one(searchParams.modality) as Modality | undefined,
    uf: one(searchParams.uf),
    maxPrice: one(searchParams.maxPrice) ? Number(one(searchParams.maxPrice)) : undefined,
  };
  const pros = await getApprovedProfessionals(filters);

  return (
    <main className="page">
      <div className="wrap">
        <div className="page-head">
          <p className="eyebrow">Descobrir</p>
          <h1>Encontre cuidado</h1>
          <p className="lead">Profissionais parceiros da AyA. Filtre por área, modalidade e faixa de preço.</p>
        </div>

        <DirectoryFilters />

        <p className="count-note">{pros.length} profissional{pros.length === 1 ? "" : "is"} encontrado{pros.length === 1 ? "" : "s"}.</p>

        {pros.length === 0 ? (
          <div className="empty">Nenhum profissional corresponde a esses filtros ainda.</div>
        ) : (
          <div className="prof-grid">
            {pros.map((p) => (
              <article className="card" key={p.user_id}>
                <div className="prof-head" style={{ marginBottom: ".2em" }}>
                  <div className="avatar">{(p.display_name ?? "AyA").slice(0, 2).toUpperCase()}</div>
                  <div>
                    <h3 style={{ margin: 0 }}>{p.display_name ?? "Profissional"}</h3>
                    <div className="sub">{professionLabel(p.profession)}{p.approach ? ` · ${p.approach}` : ""}</div>
                  </div>
                </div>
                {p.headline && <p className="sub" style={{ marginTop: ".4em" }}>{p.headline}</p>}
                <div className="chips">
                  {p.modalities.map((m) => <span className="chip-tag" key={m}>{modalityLabel(m)}</span>)}
                  {p.specialties.slice(0, 2).map((s) => <span className="chip-tag" key={s}>{s}</span>)}
                </div>
                <div className="row-between">
                  <span className="meta-line">{[p.city, p.uf].filter(Boolean).join("-")} <span className="dot" /> {priceLabel(p.price_min, p.price_max)}</span>
                  <Link className="btn btn--ghost" href={`/profissionais/${p.user_id}`} style={{ padding: ".5em 1em" }}>Ver perfil</Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
