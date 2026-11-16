/** A tribo é uma referência de interesses, não uma identidade atribuída pela IA. */
export const TRIBE_CODES = [
  "LEVI",
  "JUDAH",
  "ASHER",
  "ISSACHAR",
  "JOSEPH",
  "NAPHTALI",
  "ZEBULUN",
  "GAD",
  "MANASSEH",
  "EPHRAIM",
  "BENJAMIN",
  "REUBEN",
] as const;
export const TRIAL_LABELS: Record<string, string> = {
  requested: "Interesse recebido",
  invited: "Aguardando sua resposta",
  accepted: "Experiência combinada",
  declined: "Convite recusado",
  completed: "Retorno recebido",
  closed: "Acompanhamento concluído",
  cancelled: "Cancelado",
};
export const OPEN_TRIAL_STATES = [
  "requested",
  "invited",
  "accepted",
  "completed",
];
export function tribeTrialTransition(
  state: string,
  action: string,
  manager: boolean,
) {
  if (manager) {
    if (action === "invite" && state === "requested") return "invited";
    if (action === "close" && state === "completed") return "closed";
    if (action === "cancel" && OPEN_TRIAL_STATES.includes(state))
      return "cancelled";
  } else {
    if (action === "accept" && state === "invited") return "accepted";
    if (
      action === "decline" &&
      ["requested", "invited", "accepted"].includes(state)
    )
      return "declined";
    if (action === "feedback" && state === "accepted") return "completed";
  }
  return null;
}
export interface TribePerson {
  id: string;
  name: string;
  tribe: string;
  secondary: string;
  reason: string;
  revision: number;
  interests: string[];
  servingProfile: string;
  availability: string[];
}
export interface TribeArea {
  id: string;
  name: string;
  summary: string;
  roles: string[];
  tribe: string;
  revision: number;
}
export interface TribeTrial {
  id: string;
  personId: string;
  personName: string;
  areaId: string;
  areaName: string;
  status: string;
  revision: number;
  purpose: string;
  scheduledAt: string;
  feedback: string;
  interest: string;
  outcome: string;
  updatedAt: string;
  responseSource?: string;
  responseNote?: string;
}
export interface TribeSnapshot {
  staff: boolean;
  manager: boolean;
  linked: boolean;
  timezone: string;
  servingEnabled: boolean;
  people: TribePerson[];
  areas: TribeArea[];
  trials: TribeTrial[];
}
