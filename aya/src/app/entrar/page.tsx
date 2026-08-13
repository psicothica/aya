"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function Entrar() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setLoading(true); setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setError("Não foi possível entrar. Verifique e-mail e senha."); return; }
    const next = new URLSearchParams(window.location.search).get("next") || "/painel";
    router.push(next);
  }

  return (
    <main className="auth-shell">
      <div className="wrap auth-card">
        <p className="eyebrow">Bem-vindo de volta</p>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Entrar</h3>
          <div className="field">
            <label htmlFor="email">E-mail</label>
            <input id="email" className="input" type="email" value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="voce@exemplo.com" />
          </div>
          <div className="field">
            <label htmlFor="senha">Senha</label>
            <input id="senha" className="input" type="password" value={password}
              onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          {error && <p className="error">{error}</p>}
          <button className="btn btn--primary" style={{ width: "100%", justifyContent: "center", marginTop: ".4em" }}
            onClick={onSubmit} disabled={loading}>
            {loading ? "Entrando…" : "Entrar"}
          </button>
          <p className="note">Ainda não faz parte? <Link href="/cadastro">Criar conta</Link>.</p>
        </div>
      </div>
    </main>
  );
}
