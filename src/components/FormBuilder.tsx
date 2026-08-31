"use client";
import { useRef, useState } from "react";
import { saveFormTemplate, type QuestionDraft, type QuestionKind } from "@/app/painel/formularios/actions";

const KIND_LABELS: Record<QuestionKind, string> = {
  short_text: "Texto curto",
  long_text: "Texto longo",
  scale: "Escala (0–10)",
  multiple_choice: "Múltipla escolha",
  yes_no: "Sim/Não",
};

type EditableQuestion = {
  key: string;
  section: string;
  kind: QuestionKind;
  label: string;
  help_text: string;
  optionsText: string;
  required: boolean;
};

function toEditable(q: QuestionDraft, i: number): EditableQuestion {
  return {
    key: `init-${i}`,
    section: q.section ?? "",
    kind: q.kind,
    label: q.label,
    help_text: q.help_text ?? "",
    optionsText: (q.options ?? []).join("\n"),
    required: q.required,
  };
}

export default function FormBuilder({
  templateId,
  initialTitle = "",
  initialDescription = "",
  initialCategory = "",
  initialRespondent = "professional",
  initialQuestions = [],
}: {
  templateId: string | null;
  initialTitle?: string;
  initialDescription?: string;
  initialCategory?: string;
  initialRespondent?: "professional" | "patient";
  initialQuestions?: QuestionDraft[];
}) {
  const [questions, setQuestions] = useState<EditableQuestion[]>(() => initialQuestions.map(toEditable));
  const counter = useRef(initialQuestions.length);

  function addQuestion() {
    counter.current += 1;
    setQuestions((qs) => [...qs, {
      key: `new-${counter.current}`, section: "", kind: "short_text", label: "", help_text: "", optionsText: "", required: false,
    }]);
  }
  function updateQuestion(key: string, patch: Partial<EditableQuestion>) {
    setQuestions((qs) => qs.map((q) => (q.key === key ? { ...q, ...patch } : q)));
  }
  function removeQuestion(key: string) {
    setQuestions((qs) => qs.filter((q) => q.key !== key));
  }
  function moveQuestion(key: string, dir: -1 | 1) {
    setQuestions((qs) => {
      const i = qs.findIndex((q) => q.key === key);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= qs.length) return qs;
      const next = [...qs];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  const questionsJson = JSON.stringify(questions.map((q): QuestionDraft => ({
    section: q.section.trim() || null,
    kind: q.kind,
    label: q.label,
    help_text: q.help_text.trim() || null,
    options: q.kind === "multiple_choice" ? q.optionsText.split("\n").map((s) => s.trim()).filter(Boolean) : null,
    required: q.required,
  })));

  return (
    <form action={saveFormTemplate.bind(null, templateId)}>
      <input type="hidden" name="questions_json" value={questionsJson} readOnly />
      <div className="grid">
        <div className="field"><label>Título</label>
          <input className="input" name="title" defaultValue={initialTitle} required /></div>
        <div className="field"><label>Categoria</label>
          <input className="input" name="category" defaultValue={initialCategory} placeholder="Ex.: anamnese, avaliação, diário" /></div>
      </div>
      <div className="field"><label>Descrição</label>
        <textarea className="input" name="description" rows={2} defaultValue={initialDescription} /></div>
      <div className="field"><label>Quem responde por padrão</label>
        <select className="input" name="default_respondent" defaultValue={initialRespondent}>
          <option value="professional">Eu (profissional)</option>
          <option value="patient">O paciente</option>
        </select>
        <span className="count-note">Pode ser ajustado a cada envio, na ficha do paciente.</span>
      </div>

      <p className="eyebrow" style={{ marginTop: "1.4rem" }}>Perguntas</p>
      {questions.length === 0 && <p className="count-note">Nenhuma pergunta ainda — adicione abaixo.</p>}
      {questions.map((q, i) => (
        <div className="card" key={q.key} style={{ marginBottom: ".8em" }}>
          <div className="row-between">
            <strong>Pergunta {i + 1}</strong>
            <div style={{ display: "flex", gap: ".4em" }}>
              <button type="button" className="btn btn--quiet" onClick={() => moveQuestion(q.key, -1)} disabled={i === 0}>↑</button>
              <button type="button" className="btn btn--quiet" onClick={() => moveQuestion(q.key, 1)} disabled={i === questions.length - 1}>↓</button>
              <button type="button" className="btn btn--quiet" onClick={() => removeQuestion(q.key)}>Remover</button>
            </div>
          </div>
          <div className="grid">
            <div className="field"><label>Seção</label>
              <input className="input" value={q.section} onChange={(e) => updateQuestion(q.key, { section: e.target.value })} placeholder="Ex.: Dados pessoais" /></div>
            <div className="field"><label>Tipo</label>
              <select className="input" value={q.kind} onChange={(e) => updateQuestion(q.key, { kind: e.target.value as QuestionKind })}>
                {Object.entries(KIND_LABELS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
              </select></div>
          </div>
          <div className="field"><label>Pergunta</label>
            <input className="input" value={q.label} onChange={(e) => updateQuestion(q.key, { label: e.target.value })} required /></div>
          <div className="field"><label>Texto de ajuda (opcional)</label>
            <input className="input" value={q.help_text} onChange={(e) => updateQuestion(q.key, { help_text: e.target.value })} /></div>
          {q.kind === "multiple_choice" && (
            <div className="field"><label>Opções (uma por linha)</label>
              <textarea className="input" rows={3} value={q.optionsText} onChange={(e) => updateQuestion(q.key, { optionsText: e.target.value })} /></div>
          )}
          <label style={{ display: "flex", gap: ".5em", alignItems: "center", marginTop: ".4em" }}>
            <input type="checkbox" checked={q.required} onChange={(e) => updateQuestion(q.key, { required: e.target.checked })} />
            Obrigatória
          </label>
        </div>
      ))}
      <button type="button" className="btn btn--ghost" onClick={addQuestion} style={{ marginBottom: "1.4rem" }}>+ Adicionar pergunta</button>

      <div>
        <button className="btn btn--primary" type="submit">Salvar modelo</button>
      </div>
    </form>
  );
}
