"use client";

type Node = { id: string; label: string; meta: Record<string, unknown> };
type Relation = { from_node_id: string; to_node_id: string; relation_label: string | null };

export default function FamilyTree({ nodes, relations }: { nodes: Node[]; relations: Relation[] }) {
  const W = 520, H = 360, cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2 - 60;

  // Layout radial simples: paciente no centro, familiares ao redor.
  const pos = new Map<string, { x: number; y: number }>();
  const n = nodes.length;
  nodes.forEach((node, i) => {
    const a = (i / Math.max(1, n)) * Math.PI * 2 - Math.PI / 2;
    pos.set(node.id, { x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R });
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Árvore relacional familiar"
      style={{ maxWidth: 560, border: "1px solid var(--line)", borderRadius: "var(--r-md)", background: "rgba(18,14,10,.4)" }}>
      {/* linhas: paciente(centro) -> cada familiar */}
      {nodes.map((node) => {
        const p = pos.get(node.id)!;
        return <line key={"c" + node.id} x1={cx} y1={cy} x2={p.x} y2={p.y}
          stroke="rgba(232,219,225,.18)" strokeWidth={1} />;
      })}
      {/* relações entre familiares */}
      {relations.map((r, i) => {
        const a = pos.get(r.from_node_id), b = pos.get(r.to_node_id);
        if (!a || !b) return null;
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        return (
          <g key={"r" + i}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="rgba(150,74,90,.55)" strokeWidth={1.4} />
            {r.relation_label && (
              <text x={mx} y={my} fill="var(--ink-faint)" fontSize="9" textAnchor="middle"
                fontFamily="var(--font-caption)">{r.relation_label}</text>
            )}
          </g>
        );
      })}
      {/* nó central: paciente */}
      <circle cx={cx} cy={cy} r={26} fill="rgba(115,52,66,.5)" stroke="var(--malva)" />
      <text x={cx} y={cy + 4} textAnchor="middle" fill="var(--champagne)" fontSize="11"
        fontFamily="var(--font-display)">Paciente</text>
      {/* familiares */}
      {nodes.map((node) => {
        const p = pos.get(node.id)!;
        const rel = (node.meta?.relation as string) || "";
        return (
          <g key={node.id}>
            <circle cx={p.x} cy={p.y} r={22} fill="rgba(18,14,10,.85)" stroke="rgba(232,219,225,.4)" />
            <text x={p.x} y={p.y - 1} textAnchor="middle" fill="var(--champagne)" fontSize="9.5"
              fontFamily="var(--font-body)">{node.label.slice(0, 10)}</text>
            {rel && <text x={p.x} y={p.y + 10} textAnchor="middle" fill="var(--ink-faint)" fontSize="7.5"
              fontFamily="var(--font-caption)">{rel}</text>}
          </g>
        );
      })}
    </svg>
  );
}
