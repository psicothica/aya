import Link from "next/link";

export default function PainelNav() {
  return (
    <nav className="painel-nav">
      <Link href="/painel">Visão geral</Link>
      <Link href="/painel/agenda">Agenda</Link>
      <Link href="/painel/pacientes">Pacientes</Link>
      <Link href="/painel/financeiro">Financeiro</Link>
      <Link href="/painel/programas">Programas</Link>
      <Link href="/painel/formularios">Formulários</Link>
      <Link href="/painel/relatorios">Relatórios</Link>
    </nav>
  );
}
