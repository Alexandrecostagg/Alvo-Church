export function campaignLocalDate(value: string | number, timezone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}
export function campaignDay(date: string, delta = 0) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    throw Error("Informe uma data válida.");
  const value = new Date(`${date}T12:00:00Z`);
  if (
    !Number.isFinite(value.getTime()) ||
    value.toISOString().slice(0, 10) !== date
  )
    throw Error("Informe uma data válida.");
  value.setUTCDate(value.getUTCDate() + delta);
  return value.toISOString().slice(0, 10);
}
export function invitationCalendar(
  eventDate: string,
  startDate: string,
  intervalDays: number,
) {
  campaignDay(eventDate);
  campaignDay(startDate);
  if (!Number.isInteger(intervalDays) || intervalDays < 1 || intervalDays > 30)
    throw Error("Escolha um intervalo de 1 a 30 dias.");
  const distance =
    (Date.parse(`${eventDate}T12:00:00Z`) -
      Date.parse(`${startDate}T12:00:00Z`)) /
    86400000;
  if (distance < 1 || distance > 90)
    throw Error(
      "O primeiro lembrete deve ficar nos 90 dias anteriores ao evento, até a véspera.",
    );
  const rows = [];
  for (let day = 0; day < distance; day += intervalDays)
    rows.push({
      date: campaignDay(startDate, day),
      daysBefore: distance - day,
    });
  if (rows.length > 15)
    throw Error(
      `Este calendário teria ${rows.length} mensagens. Aumente o intervalo ou aproxime o início: o limite é 15 por convidado.`,
    );
  return rows;
}
export function campaignCadence(intervalDays = 1) {
  return intervalDays === 1
    ? "uma mensagem por dia"
    : `uma mensagem a cada ${intervalDays} dias`;
}
export function repeatedInvitationCopy(
  rows: { body: string; confirmedBody: string }[],
) {
  const normalize = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\d+/g, "#")
      .replace(/[^\p{L}#]+/gu, " ")
      .trim();
  for (const key of ["body", "confirmedBody"] as const) {
    const seen = new Map<string, number>();
    for (let i = 0; i < rows.length; i++) {
      const text = normalize(rows[i][key]);
      if (seen.has(text)) return [seen.get(text)! + 1, i + 1];
      seen.set(text, i);
    }
  }
  return null;
}
