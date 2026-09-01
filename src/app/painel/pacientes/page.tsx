import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import PainelNav from "@/components/PainelNav";
import { addPatient } from "@/app/painel/actions";
import { fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PacientesPage({ searchParams }: { searchParams: { inativos?: string } }) {
  const me = await getCurrentUser();
  if (!me) redirect("/entrar?next=/painel/pacientes");
  if (!me.roles.includes("professional") && !me.roles.includes("admin")) redirect("/painel");

  const showInactive = searchParams?.inativos === "1";
  const supabase = createClient();
  const { data: patients } = await supabase.from("patients")
    .select("id, full_name, phone, avatar_url, created_at, is_active").eq("professional_id", me.user.id)
    .eq("is_active", !showInactive)
    .order("created_at", { ascending: false });

  // Avatares (bucket privado) — URL assinada, nunca pública.
  const avatarSigned = new Map<string, string>();
  for (const p of patients ?? []) {
    if (!p.avatar_url) continue;
    const { data } = await supabase.storage.from("patient-avatars").createSignedUrl(p.avatar_url, 120);
    if (data?.signedUrl) avatarSigned.set(p.id, data.signedUrl);
  }

  return (
    <main className="page">
      <div className="wrap">
        <p className="eyebrow">Painel</p>
        <h1 style={{ fontFamily: "var(--font-display)" }}>Pacientes</h1>
        <PainelNav />

        <form action={addPatient} className="card" style={{ marginBottom: "1.6rem" }}>
          <div className="kicker">Novo paciente</div>
          <div className="form-inline">
            <div className="field grow"><label>Nome</label><input className="input" name="full_name" placeholder="Nome do paciente" required /></div>
            <div className="field"><label>Telefone</label><input className="input" name="phone" placeholder="(00) 00000-0000" /></div>
            <div className="field"><label>E-mail</label><input className="input" name="email" type="email" placeholder="opcional" /></div>
            <button className="btn btn--primary" type="submit">Adicionar</button>
          </div>
        </form>

        <p className="count-note" style={{ marginBottom: "1rem" }}>
          {showInactive ? (
            <Link href="/painel/pacientes">← Ver pacientes ativos</Link>
          ) : (
            <Link href="/painel/pacientes?inativos=1">Ver pacientes inativos</Link>
          )}
        </p>

        {(!patients || patients.length === 0) ? (
          <div className="empty">
            {showInactive ? "Nenhum paciente inativo." : "Nenhum paciente ainda. Eles surgem ao aceitar solicitações ou pelo cadastro acima."}
          </div>
        ) : patients.map((p) => (
          <Link key={p.id} href={`/painel/pacientes/${p.id}`} className="list-row" style={{ textDecoration: "none", color: "inherit" }}>
            <div style={{ display: "flex", alignItems: "center", gap: ".8em" }}>
              {avatarSigned.get(p.id) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarSigned.get(p.id)} alt="" width={36} height={36}
                  style={{ borderRadius: "999px", objectFit: "cover", border: "1px solid var(--line-strong)" }} />
              ) : null}
              <div><strong>{p.full_name}</strong><div className="meta-line">{p.phone ?? ""} <span className="dot" /> desde {fmtDate(p.created_at)}</div></div>
            </div>
            <span className="pill">Abrir prontuário →</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
