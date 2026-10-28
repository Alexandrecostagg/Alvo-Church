export interface MobileServingAssignment {
  id: string;
  role: string;
  areaName?: string;
  serviceName?: string;
  serviceDate: string;
  status: string;
  responseNote?: string;
  timezone?: string;
}
export function servingNotificationMatches(data: unknown, orgId: string) {
  if (!data || typeof data !== "object") return false;
  const row = data as Record<string, unknown>;
  return (
    row.type === "serving_assignment" &&
    row.organizationId === orgId &&
    typeof row.assignmentId === "string" &&
    /^[A-Za-z0-9_-]{1,128}$/.test(row.assignmentId)
  );
}
export function pendingServingCount(
  rows: MobileServingAssignment[],
  now = Date.now(),
) {
  return rows.filter(
    (a) =>
      a.status === "pending" && Date.parse(a.serviceDate) >= now - 86400000,
  ).length;
}
export function mobileServingSlots(
  rows: MobileServingAssignment[],
  now = Date.now(),
) {
  return rows
    .filter(
      (a) =>
        ["pending", "confirmed", "declined"].includes(a.status) &&
        Date.parse(a.serviceDate) >= now - 86400000,
    )
    .sort((a, b) => a.serviceDate.localeCompare(b.serviceDate))
    .map((a) => ({
      id: a.id,
      role: a.role,
      service: `${a.areaName || "Área de serviço"} · ${a.serviceName || "Serviço"}`,
      responseNote: a.responseNote,
      date: new Date(a.serviceDate).toLocaleDateString("pt-BR", {
        timeZone: a.timezone || "America/Belem",
      }),
      time: new Date(a.serviceDate).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: a.timezone || "America/Belem",
      }),
      status:
        a.status === "confirmed"
          ? ("confirmado" as const)
          : a.status === "declined"
            ? ("recusado" as const)
            : ("pendente" as const),
    }));
}
