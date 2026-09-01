import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

export default async function SiteHeader() {
  const me = await getCurrentUser();
  const isAuthor = me ? me.roles.includes("professional") || me.roles.includes("admin") : false;
  const isAdmin = me ? me.roles.includes("admin") : false;

  return (
    <header className="site-header">
      <div className="bar">
        <Link className="brand" href="/">AyA</Link>
        <nav>
          <Link href="/profissionais">Descobrir</Link>
          <Link href="/praticas">Práticas</Link>
          <Link href="/apps">Apps</Link>
          <Link href="/feed">Feed</Link>
          <Link href="/programas">Programas</Link>
          <Link href="/cursos">Cursos</Link>
          {me && <Link href="/meus-programas">Meus programas</Link>}
          {me && <Link href="/meus-formularios">Meus formulários</Link>}
          {me && <Link href="/meus-contratos">Meus contratos</Link>}
          {isAuthor && <Link href="/feed/novo">Publicar</Link>}
          {isAdmin && <Link href="/admin/moderacao">Moderação</Link>}
        </nav>
        <div className="right">
          {me ? (
            <Link className="btn btn--ghost" href="/painel" style={{ padding: ".5em 1em" }}>Painel</Link>
          ) : (
            <>
              <Link className="btn btn--quiet" href="/entrar">Entrar</Link>
              <Link className="btn btn--primary" href="/cadastro" style={{ padding: ".5em 1.1em" }}>Criar conta</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
