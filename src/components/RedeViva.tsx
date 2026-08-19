"use client";

import { useEffect, useRef } from "react";

type Node = {
  id: number; x: number; y: number; vx: number; vy: number; r: number;
  phase: number; born: number; parent: Node | null; gen: number; root: number;
  children: number; malva: boolean; death: number; dying?: boolean; _a?: number;
};
type Edge = { a: Node; b: Node; born: number; cross: boolean };

/**
 * Assinatura da marca: o símbolo da árvore em movimento.
 * Céu no crepúsculo + rede que cresce (crescimento dendrítico) e se une,
 * desenhada em blend aditivo para as luzes cintilarem. Respeita
 * prefers-reduced-motion (cai para um quadro estático).
 */
export default function RedeViva() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const CHAMP = "232,219,225";
    const MALVA = "150,74,90";

    let W = 0, H = 0, DPR = 1, bg: HTMLCanvasElement | null = null, raf = 0;
    let nodes: Node[] = [];
    let edges: Edge[] = [];
    const conn = new Set<string>();
    let idSeq = 0, rootSeq = 0, lastGrow = 0, lastCross = 0;
    const CAP = 112;

    const key = (a: Node, b: Node) => (a.id < b.id ? a.id + "|" + b.id : b.id + "|" + a.id);

    function buildBg() {
      bg = document.createElement("canvas");
      bg.width = Math.max(1, W * DPR); bg.height = Math.max(1, H * DPR);
      const b = bg.getContext("2d"); if (!b) return;
      b.setTransform(DPR, 0, 0, DPR, 0, 0);
      const lin = b.createLinearGradient(0, 0, 0, H);
      lin.addColorStop(0.0, "#180b12"); lin.addColorStop(0.42, "#381826");
      lin.addColorStop(0.68, "#6d3040"); lin.addColorStop(0.83, "#48202e");
      lin.addColorStop(1.0, "#1e0f18");
      b.fillStyle = lin; b.fillRect(0, 0, W, H);
      const hg = b.createRadialGradient(W * 0.5, H * 0.72, 0, W * 0.5, H * 0.72, Math.max(W, H) * 0.62);
      hg.addColorStop(0, "rgba(210,138,146,0.42)"); hg.addColorStop(0.42, "rgba(115,52,66,0.22)");
      hg.addColorStop(1, "rgba(30,15,24,0)");
      b.fillStyle = hg; b.fillRect(0, 0, W, H);
      const cg = b.createRadialGradient(W * 0.2, H * 0.1, 0, W * 0.2, H * 0.1, Math.max(W, H) * 0.55);
      cg.addColorStop(0, "rgba(23,40,21,0.30)"); cg.addColorStop(1, "rgba(30,15,24,0)");
      b.fillStyle = cg; b.fillRect(0, 0, W, H);
      const v = b.createRadialGradient(W / 2, H * 0.52, Math.min(W, H) * 0.36, W / 2, H * 0.52, Math.max(W, H) * 0.82);
      v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(12,5,12,0.42)");
      b.fillStyle = v; b.fillRect(0, 0, W, H);
    }

    function resize() {
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      canvas!.width = W * DPR; canvas!.height = H * DPR;
      canvas!.style.width = W + "px"; canvas!.style.height = H + "px";
      ctx!.setTransform(DPR, 0, 0, DPR, 0, 0);
      buildBg();
      if (reduce) { seedStatic(); drawStatic(); }
    }

    function makeRoot(now: number): Node {
      const n: Node = {
        id: ++idSeq, x: 20 + Math.random() * (W - 40), y: 20 + Math.random() * (H - 40),
        vx: (Math.random() - 0.5) * 0.05, vy: (Math.random() - 0.5) * 0.05,
        r: 1.7 + Math.random() * 1.3, phase: Math.random() * Math.PI * 2, born: now,
        parent: null, gen: 0, root: ++rootSeq, children: 0, malva: Math.random() < 0.3, death: 1,
      };
      nodes.push(n); return n;
    }

    function growStep(now: number) {
      const cands: Node[] = [];
      for (const n of nodes) {
        const max = n.gen === 0 ? 3 : 2;
        if (n.death >= 1 && n.gen < 5 && n.children < max) cands.push(n);
      }
      if (cands.length === 0 || nodes.length < 3) { makeRoot(now); return; }
      const p = cands[(Math.random() * cands.length) | 0];
      const ang = p.parent
        ? Math.atan2(p.y - p.parent.y, p.x - p.parent.x) + (Math.random() - 0.5) * 1.3
        : Math.random() * Math.PI * 2;
      const len = 40 + Math.random() * 48;
      const nx = Math.max(10, Math.min(W - 10, p.x + Math.cos(ang) * len));
      const ny = Math.max(10, Math.min(H - 10, p.y + Math.sin(ang) * len));
      const c: Node = {
        id: ++idSeq, x: nx, y: ny, vx: p.vx * 0.92, vy: p.vy * 0.92,
        r: Math.max(0.9, p.r * 0.87), phase: Math.random() * Math.PI * 2, born: now,
        parent: p, gen: p.gen + 1, root: p.root, children: 0, malva: Math.random() < 0.3, death: 1,
      };
      nodes.push(c); p.children++;
      edges.push({ a: p, b: c, born: now, cross: false }); conn.add(key(p, c));
    }

    function crossLink(now: number) {
      if (nodes.length < 8) return;
      const n = nodes[(Math.random() * nodes.length) | 0];
      let best: Node | null = null, bd = 1e9;
      for (const m of nodes) {
        if (m === n || m.root === n.root) continue;
        const dx = m.x - n.x, dy = m.y - n.y, d = dx * dx + dy * dy;
        if (d < bd) { bd = d; best = m; }
      }
      if (best && bd < 150 * 150 && !conn.has(key(n, best))) {
        edges.push({ a: n, b: best, born: now, cross: true }); conn.add(key(n, best));
      }
    }

    function cullOldestRoot() {
      let minRoot = Infinity;
      for (const n of nodes) if (n.root < minRoot) minRoot = n.root;
      for (const n of nodes) if (n.root === minRoot) n.dying = true;
    }

    function nodeAlpha(n: Node, now: number) {
      const grow = Math.min(1, (now - n.born) / 1500);
      if (n.dying) n.death -= 0.014;
      return Math.max(0, Math.min(grow, n.death));
    }

    function frame(now: number) {
      if (now - lastGrow > 95) { if (nodes.length < CAP) growStep(now); else cullOldestRoot(); lastGrow = now; }
      if (now - lastCross > 850) { crossLink(now); lastCross = now; }

      ctx!.globalCompositeOperation = "source-over";
      ctx!.clearRect(0, 0, W, H);
      if (bg) ctx!.drawImage(bg, 0, 0, W, H);
      ctx!.globalCompositeOperation = "lighter";

      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 8 || n.x > W - 8) n.vx *= -1;
        if (n.y < 8 || n.y > H - 8) n.vy *= -1;
        n._a = nodeAlpha(n, now);
      }

      ctx!.lineWidth = 1.2;
      for (const ed of edges) {
        const a = ed.a, b = ed.b;
        const t = Math.min(1, (now - ed.born) / 850);
        const alpha = Math.min(a._a!, b._a!) * (ed.cross ? 0.5 : 0.9) * t;
        if (alpha <= 0.002) continue;
        const ex = ed.cross ? b.x : a.x + (b.x - a.x) * t;
        const ey = ed.cross ? b.y : a.y + (b.y - a.y) * t;
        ctx!.strokeStyle = "rgba(" + (ed.cross ? MALVA : CHAMP) + "," + alpha.toFixed(3) + ")";
        ctx!.beginPath(); ctx!.moveTo(a.x, a.y); ctx!.lineTo(ex, ey); ctx!.stroke();
      }

      for (const nd of nodes) {
        if (nd._a! <= 0.002) continue;
        const tw = 0.55 + 0.45 * Math.sin(now * 0.002 + nd.phase);
        const rad = nd.r * (1 + tw * 0.5);
        const col = nd.malva ? MALVA : CHAMP;
        const glow = ctx!.createRadialGradient(nd.x, nd.y, 0, nd.x, nd.y, rad * 4);
        glow.addColorStop(0, "rgba(" + col + "," + (0.9 * nd._a! * tw).toFixed(3) + ")");
        glow.addColorStop(0.4, "rgba(" + col + "," + (0.22 * nd._a! * tw).toFixed(3) + ")");
        glow.addColorStop(1, "rgba(" + col + ",0)");
        ctx!.fillStyle = glow; ctx!.beginPath(); ctx!.arc(nd.x, nd.y, rad * 4, 0, 6.283); ctx!.fill();
        ctx!.fillStyle = "rgba(" + col + "," + (0.95 * nd._a!).toFixed(3) + ")";
        ctx!.beginPath(); ctx!.arc(nd.x, nd.y, rad, 0, 6.283); ctx!.fill();
      }

      let changed = false;
      for (let d = nodes.length - 1; d >= 0; d--) {
        if (nodes[d].dying && nodes[d].death <= 0) { nodes.splice(d, 1); changed = true; }
      }
      if (changed) {
        const alive = new Set(nodes);
        edges = edges.filter((x) => alive.has(x.a) && alive.has(x.b));
        conn.clear();
        for (const e of edges) conn.add(key(e.a, e.b));
        if (nodes.length < CAP * 0.55) makeRoot(now);
      }
      raf = requestAnimationFrame(frame);
    }

    function seedStatic() {
      nodes = []; edges = []; conn.clear(); idSeq = 0; rootSeq = 0;
      for (let r = 0; r < 3; r++) makeRoot(0);
      for (let s = 0; s < 44; s++) growStep(0);
      for (let c = 0; c < 6; c++) crossLink(0);
    }
    function drawStatic() {
      ctx!.globalCompositeOperation = "source-over";
      ctx!.clearRect(0, 0, W, H); if (bg) ctx!.drawImage(bg, 0, 0, W, H);
      ctx!.globalCompositeOperation = "lighter"; ctx!.lineWidth = 1.2;
      for (const ed of edges) {
        ctx!.strokeStyle = "rgba(" + (ed.cross ? MALVA : CHAMP) + "," + (ed.cross ? 0.4 : 0.7) + ")";
        ctx!.beginPath(); ctx!.moveTo(ed.a.x, ed.a.y); ctx!.lineTo(ed.b.x, ed.b.y); ctx!.stroke();
      }
      for (const n of nodes) {
        const col = n.malva ? MALVA : CHAMP;
        const glow = ctx!.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 4);
        glow.addColorStop(0, "rgba(" + col + ",0.8)"); glow.addColorStop(1, "rgba(" + col + ",0)");
        ctx!.fillStyle = glow; ctx!.beginPath(); ctx!.arc(n.x, n.y, n.r * 4, 0, 6.283); ctx!.fill();
        ctx!.fillStyle = "rgba(" + col + ",0.9)"; ctx!.beginPath(); ctx!.arc(n.x, n.y, n.r, 0, 6.283); ctx!.fill();
      }
    }

    window.addEventListener("resize", resize, { passive: true });
    resize();
    if (reduce) {
      seedStatic(); drawStatic();
    } else {
      for (let i = 0; i < 4; i++) makeRoot(0);
      for (let s = 0; s < 34; s++) growStep(0);
      for (let c = 0; c < 5; c++) crossLink(0);
      lastGrow = 0; lastCross = 0;
      raf = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className="rede-viva" />;
}
