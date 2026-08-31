import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import PainelNav from "@/components/PainelNav";
import FormBuilder from "@/components/FormBuilder";

export const dynamic = "force-dynamic";

export default async function EditarFormulario({ params }: { params: { id: string } }) {
  const me = await getCurrentUser();
  if (!me) redirect("/entrar?next=/painel/formularios");
  if (!me.roles.includes("professional") && !me.roles.includes("admin")) redirect("/painel");

  const supabase = createClient();
  const { data: template } = await supabase.from("form_templates").select("*")
    .eq("id", params.id).eq("author_id", me.user.id).maybeSingle();
  if (!template) notFound();

  const { data: questions } = await supabase.from("form_template_questions")
    .select("section, kind, label, help_text, options, required")
    .eq("template_id", params.id).order("position", { ascending: true });

  return (
    <main className="page">
      <div className="wrap">
        <p className="eyebrow"><Link href="/painel/formularios" style={{ color: "inherit" }}>← Formulários</Link></p>
        <h1 style={{ fontFamily: "var(--font-display)" }}>Editar modelo</h1>
        <PainelNav />
        <div style={{ marginTop: "1.4rem" }}>
          <FormBuilder
            templateId={template.id}
            initialTitle={template.title}
            initialDescription={template.description ?? ""}
            initialCategory={template.category ?? ""}
            initialRespondent={template.default_respondent as "professional" | "patient"}
            initialQuestions={(questions ?? []).map((q) => ({
              section: q.section, kind: q.kind as "short_text" | "long_text" | "scale" | "multiple_choice" | "yes_no",
              label: q.label, help_text: q.help_text, options: (q.options as string[] | null), required: q.required,
            }))}
          />
        </div>
      </div>
    </main>
  );
}
