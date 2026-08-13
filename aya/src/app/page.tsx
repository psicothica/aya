import Link from "next/link";

export default function Home() {
  return (
    <main>
      <header className="hero">
        <div className="wrap hero-inner">
          <p className="eyebrow">Clínica Integrada · Patos-PB e região</p>
          <div className="logo-disc">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/ayalogo.png" alt="AyA — árvore da vida em aquarela: raízes, copa e frutos sobre a lua" />
          </div>
          <div className="mark-name">AyA</div>
          <p className="mark-sub">Ecossistema de saúde integrada</p>
          <p className="tagline">Conectar, crescer e transformar</p>
          <p className="statement">
            Cada profissional é um nó da mesma rede viva. Aqui, crescer é crescer junto.
          </p>
          <div className="cta-row">
            <Link className="btn btn--primary" href="/profissionais">
              Encontrar cuidado
            </Link>
            <Link className="btn btn--ghost" href="/cadastro">
              Fazer parte
            </Link>
          </div>
        </div>
      </header>

      <div className="wrap">
        <div className="divider" />
      </div>

      <section className="block">
        <div className="wrap">
          <p className="eyebrow">O ecossistema</p>
          <h2>Três formas de fazer parte</h2>
          <p className="lead">
            O cliente encontra cuidado; o profissional parceiro cuida da própria prática
            sob o guarda-chuva da marca; a AyA cura o conteúdo e as conexões.
          </p>
          <div className="grid">
            <article className="card">
              <div className="kicker">Para clientes</div>
              <h3>Encontre cuidado</h3>
              <p className="sub">Diretório de profissionais, práticas em grupo, apps terapêuticos e um feed em saúde.</p>
              <div className="chips"><span className="chip-tag on">Diretório</span><span className="chip-tag">Feed</span><span className="chip-tag">Apps</span></div>
            </article>
            <article className="card">
              <div className="kicker">Para profissionais</div>
              <h3>Cuide da sua prática</h3>
              <p className="sub">Agenda, prontuário sigiloso, financeiro e um perfil público no diretório.</p>
              <div className="chips"><span className="chip-tag">Agenda</span><span className="chip-tag on">Prontuário</span><span className="chip-tag">Financeiro</span></div>
            </article>
            <article className="card">
              <div className="kicker">A rede</div>
              <h3>Crescer é crescer junto</h3>
              <p className="sub">Colaboração interdisciplinar: o sucesso de cada profissional é o florescimento de todos.</p>
              <div className="chips"><span className="chip-tag">Parceria</span><span className="chip-tag">Colaboração</span></div>
            </article>
          </div>
        </div>
      </section>

      <footer>
        <div className="wrap">
          <span>AyA — Clínica Integrada · Fase 0</span>
          <span className="script" style={{ fontSize: "1.5rem" }}>crescer é crescer junto</span>
        </div>
      </footer>
    </main>
  );
}
