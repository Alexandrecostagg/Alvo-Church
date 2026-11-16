/** Shared decimal parser for campaign goals and member contributions. */
export function parseGivingAmount(value: string): number | null {
  const raw = value.trim();
  if (
    !/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(raw) &&
    !/^\d+\.\d{1,2}$/.test(raw)
  )
    return null;
  const normalized =
    raw.includes(",") || /^\d{1,3}(?:\.\d{3})+$/.test(raw)
      ? raw.replace(/\./g, "").replace(",", ".")
      : raw;
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount > 0 && amount <= 1000000
    ? Math.round(amount * 100) / 100
    : null;
}
export const GIVING_STATUS: Record<string, string> = {
  captured: "Intenção — pagamento não declarado",
  declared: "Aguardando conferência",
  pending: "Aguardando conferência",
  confirmed: "Recebimento confirmado",
  rejected: "Recebimento não confirmado",
};
export interface GivingOverview {
  manager: boolean;
  canReconcile: boolean;
  canCommunicate: boolean;
  publicPath: string | null;
  pixConfigured: boolean;
  campaigns: Array<{
    id: string;
    title: string;
    description: string;
    category: string;
    goalAmount: number;
    raisedAmount: number;
    status: "active" | "closed";
    updatedAt: string;
  }>;
  contributions: Array<{
    id: string;
    contributorName: string;
    amount: number;
    type: string;
    date: string;
    status: string;
    campaignId: string;
  }>;
  intents: Array<{
    id: string;
    name: string;
    canContact: boolean;
    amount: number;
    status: string;
    createdAt: string;
    campaignId: string;
  }>;
  pendingCount: number;
  truncated: boolean;
}
