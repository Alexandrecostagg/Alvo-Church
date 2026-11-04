export const SERVING_STATUSES: Record<string, string> = {
  pending: "Aguardando resposta",
  confirmed: "Confirmado",
  declined: "Recusado",
  present: "Presente",
  absent: "Ausente",
  cancelled: "Cancelado",
};
export function servingDate(value: string, timezone = "America/Belem") {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Data não informada";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: timezone,
  }).format(date);
}
/** Resolve a church-local wall clock on the server, never a fixed hour or browser offset. */
export function servingInstant(day: string, time: string, timezone: string) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)
  )
    throw new Error("Confira a data e o horário.");
  const [y, m, d] = day.split("-").map(Number),
    [h, min] = time.split(":").map(Number);
  const wall = Date.UTC(y, m - 1, d, h, min);
  const calendar = new Date(wall);
  if (
    calendar.getUTCFullYear() !== y ||
    calendar.getUTCMonth() !== m - 1 ||
    calendar.getUTCDate() !== d
  )
    throw new Error("Confira a data do calendário.");
  let guess = wall;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  for (let i = 0; i < 4; i++) {
    const parts = Object.fromEntries(
      formatter.formatToParts(new Date(guess)).map((p) => [p.type, p.value]),
    );
    const represented = Date.UTC(
      +parts.year,
      +parts.month - 1,
      +parts.day,
      +parts.hour,
      +parts.minute,
    );
    if (represented === wall) return new Date(guess).toISOString();
    guess += wall - represented;
  }
  throw new Error(
    "Esse horário não existe no fuso da instituição. Confira a data.",
  );
}
