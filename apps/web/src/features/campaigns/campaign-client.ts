"use client";
import { useCallback } from "react";
import { useAppAuth } from "../../../app/providers";
export function useCampaignClient(path = "/api/campaigns") {
  const { user, organizationId } = useAppAuth();
  return useCallback(
    async (body: Record<string, unknown>) => {
      if (!user) throw Error("Entre na sua conta.");
      const r = await fetch(path, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({ organizationId, ...body }),
        signal: AbortSignal.timeout(path.endsWith("/copy") ? 90000 : 30000),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error || "Não foi possível concluir.");
      return data;
    },
    [user, organizationId, path],
  );
}
export const campaignStatus: Record<string, string> = {
  draft: "Rascunho",
  active: "Inscrições abertas",
  paused: "Pausada",
  closed: "Encerrada",
  invited: "Convidado",
  confirmed: "Presença confirmada",
  declined: "Não irá",
  attended: "Compareceu",
  reserved: "Cadastro reservado",
};
export function campaignDate(date: string, timezone = "America/Belem") {
  return new Date(date).toLocaleString("pt-BR", {
    timeZone: timezone,
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function campaignLabel(c: any) {
  return c.status === "active" &&
    c.inviteOpensAt &&
    Date.parse(c.inviteOpensAt) > Date.now()
    ? "Início agendado"
    : campaignStatus[c.status] || c.status;
}
