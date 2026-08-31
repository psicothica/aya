import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import PainelNav from "@/components/PainelNav";
import FormBuilder from "@/components/FormBuilder";

export const dynamic = "force-dynamic";

export default async function NovoFormulario() {
  const me = await getCurrentUser();
  if (!me) redirect("/entrar?next=/painel/formularios/novo");
  if (!me.roles.includes("professional") && !me.roles.includes("admin")) redirect("/painel");

  return (
    <main className="page">
      <div className="wrap">
        <p className="eyebrow"><Link href="/painel/formularios" style={{ color: "inherit" }}>← Formulários</Link></p>
        <h1 style={{ fontFamily: "var(--font-display)" }}>Novo modelo de formulário</h1>
        <PainelNav />
        <div style={{ marginTop: "1.4rem" }}>
          <FormBuilder templateId={null} />
        </div>
      </div>
    </main>
  );
}
