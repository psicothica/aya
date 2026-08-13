import Link from "next/link";
import { notFound } from "next/navigation";
import { getProfessionalById } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { professionLabel, modalityLabel } from "@/lib/labels";
import FavoriteButton from "@/components/FavoriteButton";
import BookingRequestForm from "@/components/BookingRequestForm";

export const dynamic = "force-dynamic";

export default async function ProfilePage({ params }: { params: { id: string } }) {
  const pro = await getProfessionalById(params.id);
  if (!pro) notFound();

  const supabase = createClient();
  const [{ data: posts }, me] = await Promise.all([
    supabase.from("posts").select("id, title, body, published_at, category")
      .eq("author_id", params.id).eq("status", "published").order("published_at", { ascending: false }),
    getCurrentUser(),
  ]);

  let saved = false;
  if (me) {
    const { data: fav } = await supabase.from("favorites").select("target_id")
      .eq("user_id", me.user.id).eq("target_type", "professional").eq("target_id", params.id).maybeSingle();
    saved = !!fav;
  }

  const price = pro.price_min != null || pro.price_max != null
    ? (pro.price_min != null && pro.price_max != null ? `R$ ${pro.price_min}–${pro.price_max}` : `a partir de R$ ${pro.price_min ?? pro.price_max}`)
    : "Sob consulta";

  return (
    <main className="page">
      <div className="wrap article">
        <p className="eyebrow"><Link href="/profissionais" style={{ color: "inherit" }}>← Voltar ao diretório</Link></p>

        <div className="prof-head" style={{ margin: "1rem 0" }}>
          <div className="avatar" style={{ width: 72, height: 72, fontSize: "1.4rem" }}>
            {(pro.display_name ?? "AyA").slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: "2rem" }}>{pro.display_name ?? "Profissional"}</h1>
            <div className="sub">{professionLabel(pro.profession)}{pro.approach ? ` · ${pro.approach}` : ""}</div>
            <div className="meta-line" style={{ marginTop: ".3em" }}>
              {[pro.city, pro.uf].filter(Boolean).join("-")}
              {pro.council && <><span className="dot" /> {pro.council} {pro.registration_number}</>}
            </div>
          </div>
        </div>

        <div className="chips">
          {pro.modalities.map((m) => <span className="chip-tag on" key={m}>{modalityLabel(m)}</span>)}
          {pro.specialties.map((s) => <span className="chip-tag" key={s}>{s}</span>)}
        </div>

        {pro.bio && <p className="lead" style={{ marginTop: "1rem" }}>{pro.bio}</p>}

        <div className="iactions" style={{ flexWrap: "wrap" }}>
          <BookingRequestForm professionalId={pro.user_id} priceLabel={price} isAuthed={!!me} />
          <FavoriteButton targetType="professional" targetId={pro.user_id} initialSaved={saved} isAuthed={!!me} />
        </div>
        <p className="count-note">Você solicita um horário; o profissional confirma. O pagamento é combinado diretamente (pagamento online chega na Fase 4).</p>

        {posts && posts.length > 0 && (
          <section style={{ marginTop: "2.4rem" }}>
            <p className="eyebrow">Publicações</p>
            <div className="feed-list">
              {posts.map((post) => (
                <article className="post-card" key={post.id}>
                  <div className="post-meta">{post.category ?? "Saúde"}</div>
                  <Link className="title" href={`/feed/${post.id}`}><h3>{post.title}</h3></Link>
                  {post.body && <p className="post-excerpt">{post.body.slice(0, 160)}{post.body.length > 160 ? "…" : ""}</p>}
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
