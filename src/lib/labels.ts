import type { Database } from "@/lib/database.types";

type Profession = Database["public"]["Enums"]["profession_type"];
type Modality = Database["public"]["Enums"]["attendance_modality"];

export const PROFESSION_LABELS: Record<Profession, string> = {
  psychologist: "Psicologia",
  psychiatrist: "Psiquiatria",
  physician: "Medicina",
  nutritionist: "Nutrição",
  physiotherapist: "Fisioterapia",
  occupational_therapist: "Terapia Ocupacional",
  speech_therapist: "Fonoaudiologia",
  nurse: "Enfermagem",
  social_worker: "Serviço Social",
  other: "Outra",
};

export const MODALITY_LABELS: Record<Modality, string> = {
  in_person: "Presencial",
  online: "Online",
  hybrid: "Híbrido",
};

export function professionLabel(p: Profession | null | undefined): string {
  return p ? PROFESSION_LABELS[p] ?? "Saúde" : "Saúde";
}
export function modalityLabel(m: Modality): string {
  return MODALITY_LABELS[m] ?? m;
}

export type DocCategory = "prontuario" | "ficha_atendimento" | "laudo" | "exame" | "recibo" | "outro";

export const DOC_CATEGORY_LABEL: Record<DocCategory, string> = {
  prontuario: "Prontuário",
  ficha_atendimento: "Ficha de atendimento",
  laudo: "Laudo",
  exame: "Exame",
  recibo: "Recibo",
  outro: "Outro",
};
