"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Role = "client" | "professional";

export default function Cadastro() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("client");
  const [fullName, setFullName] = useState("");
  const [profession, setProfession] = useState("psychologist");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setLoading(true); setError(null); setInfo(null);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: {
        data: {
          full_name: fullName,
          intended_role: role,
          ...(role === "professional" ? { profession } : {}),
        },
      },
    });
    setLoading(false);
    if (error) { setError("Não foi possível criar a conta. " + error.message); return; }
    if (!data.session) {
      setInfo("Enviamos um e-mail de confirmação. Confirme para acessar o ecossistema.");
      return;
    }
    router.push("/painel");
  }

  return (
    <main className="auth-shell">
      <div className="wrap auth-card">
        <p className="eyebrow">Fazer parte</p>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Criar conta</h3>

          <div className="seg" role="tablist" aria-label="Tipo de conta">
            <button className={role === "client" ? "on" : ""} onClick={() => setRole("client")}>Sou cliente</button>
            <button className={role === "professional" ? "on" : ""} onClick={() => setRole("professional")}>Sou profissional</button>
          </div>

          <div className="field">
            <label htmlFor="nome">Nome completo</label>
            <input id="nome" className="input" value={fullName}
              onChange={(e) => setFullName(e.target.value)} placeholder="Seu nome" />
          </div>

          {role === "professional" && (
            <div className="field">
              <label htmlFor="prof">Área</label>
              <select id="prof" className="input" value={profession} onChange={(e) => setProfession(e.target.value)}>
                <option value="psychologist">Psicologia</option>
                <option value="psychiatrist">Psiquiatria</option>
                <option value="nutritionist">Nutrição</option>
                <option value="physiotherapist">Fisioterapia</option>
                <option value="occupational_therapist">Terapia Ocupacional</option>
                <option value="speech_therapist">Fonoaudiologia</option>
                <option value="nurse">Enfermagem</option>
                <option value="social_worker">Serviço Social</option>
                <option value="physician">Medicina</option>
                <option value="other">Outra</option>
              </select>
            </div>
          )}

          <div className="field">
            <label htmlFor="email">E-mail</label>
            <input id="email" className="input" type="email" value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="voce@exemplo.com" />
          </div>
          <div className="field">
            <label htmlFor="senha">Senha</label>
            <input id="senha" className="input" type="password" value={password}
              onChange={(e) => setPassword(e.target.value)} placeholder="mínimo 6 caracteres" />
          </div>

          {error && <p className="error">{error}</p>}
          {info && <p className="note">{info}</p>}

          <button className="btn btn--primary" style={{ width: "100%", justifyContent: "center", marginTop: ".4em" }}
            onClick={onSubmit} disabled={loading}>
            {loading ? "Criando…" : "Criar conta"}
          </button>

          {role === "professional" && (
            <p className="note">
              Seu perfil profissional entra para aprovação da equipe AyA antes de ficar público.
              A AyA não valida o registro automaticamente — a verificação é feita na curadoria.
            </p>
          )}
          <p className="note">Já tem conta? <Link href="/entrar">Entrar</Link>.</p>
        </div>
      </div>
    </main>
  );
}
