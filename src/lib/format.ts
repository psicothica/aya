export function fmtMoney(v: number | null | undefined): string {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "A confirmar";
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

export const APPT_STATUS_LABEL: Record<string, string> = {
  scheduled: "Agendada", completed: "Realizada", cancelled: "Cancelada",
  no_show: "Faltou", rescheduled: "Remarcada",
};
