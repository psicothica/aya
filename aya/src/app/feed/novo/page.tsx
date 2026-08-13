import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import ComposeForm from "@/components/ComposeForm";

export const dynamic = "force-dynamic";

export default async function NovoPostPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/entrar?next=/feed/novo");

  const isAdmin = me.roles.includes("admin");
  let canPublish = isAdmin;
  if (!canPublish && me.roles.includes("professional")) {
    const supabase = createClient();
    const { data } = await supabase.from("professional_profiles")
      .select("status").eq("user_id", me.user.id).maybeSingle();
    canPublish = data?.status === "approved";
  }

  return (
    <main className="page">
      <div className="wrap article">
        <div className="page-head">
          <p className="eyebrow">Publicar no feed</p>
          <h1>Nova publicação</h1>
        </div>
        {canPublish ? (
          <ComposeForm />
        ) : (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Publicação disponível para profissionais aprovados</h3>
            <p className="sub">Assim que seu perfil profissional for aprovado pela equipe AyA, você poderá publicar no feed.</p>
          </div>
        )}
      </div>
    </main>
  );
}
