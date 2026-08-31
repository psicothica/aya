import type { QuestionKind } from "@/app/painel/formularios/actions";

export type AnswerQuestion = {
  id: string;
  section: string | null;
  kind: QuestionKind;
  label: string;
  help_text: string | null;
  options: string[] | null;
  required: boolean;
};
export type AnswerValue = { value_text: string | null; value_number: number | null; value_bool: boolean | null };

function ReadOnlyValue({ kind, a }: { kind: QuestionKind; a?: AnswerValue }) {
  if (kind === "yes_no") return <>{a?.value_bool == null ? "— sem resposta —" : a.value_bool ? "Sim" : "Não"}</>;
  if (kind === "scale") return <>{a?.value_number ?? "— sem resposta —"}</>;
  return <>{a?.value_text || "— sem resposta —"}</>;
}

function Input({ q, a }: { q: AnswerQuestion; a?: AnswerValue }) {
  const name = `answer_${q.id}`;
  if (q.kind === "long_text") {
    return <textarea className="input" name={name} rows={3} defaultValue={a?.value_text ?? ""} required={q.required} />;
  }
  if (q.kind === "scale") {
    return <input className="input" type="number" min={0} max={10} name={name} defaultValue={a?.value_number ?? ""} required={q.required} />;
  }
  if (q.kind === "yes_no") {
    const current = a?.value_bool === true ? "true" : a?.value_bool === false ? "false" : "";
    return (
      <select className="input" name={name} defaultValue={current} required={q.required}>
        <option value="">— selecione —</option>
        <option value="true">Sim</option>
        <option value="false">Não</option>
      </select>
    );
  }
  if (q.kind === "multiple_choice") {
    return (
      <div style={{ display: "grid", gap: ".3em" }}>
        {(q.options ?? []).map((opt) => (
          <label key={opt} style={{ display: "flex", gap: ".5em", alignItems: "center" }}>
            <input type="radio" name={name} value={opt} defaultChecked={a?.value_text === opt} required={q.required} />
            {opt}
          </label>
        ))}
      </div>
    );
  }
  return <input className="input" name={name} defaultValue={a?.value_text ?? ""} required={q.required} />;
}

// Renderiza as perguntas de uma atribuição, agrupadas por seção. `readOnly`
// mostra só o valor (respostas já concluídas); do contrário, campos editáveis
// nomeados `answer_<questionId>`, lidos por saveFormResponses.
export default function FormAnswerFields({
  questions, answers, readOnly = false,
}: { questions: AnswerQuestion[]; answers: Map<string, AnswerValue>; readOnly?: boolean }) {
  let lastSection: string | null = null;
  return (
    <>
      {questions.map((q) => {
        const a = answers.get(q.id);
        const showSection = q.section !== lastSection;
        lastSection = q.section;
        return (
          <div key={q.id}>
            {showSection && q.section && <p className="eyebrow" style={{ marginTop: "1.2rem" }}>{q.section}</p>}
            <div className="field">
              <label>{q.label}{q.required && !readOnly ? " *" : ""}</label>
              {q.help_text && <div className="count-note" style={{ marginBottom: ".3em" }}>{q.help_text}</div>}
              {readOnly ? <div className="sub">{<ReadOnlyValue kind={q.kind} a={a} />}</div> : <Input q={q} a={a} />}
            </div>
          </div>
        );
      })}
    </>
  );
}
