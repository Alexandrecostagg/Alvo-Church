import type { ModuleKey } from "@alvo/domain";
import { AccountError, type AccountTransaction } from "./member-account-store";

const MODULE_LABELS: Partial<Record<ModuleKey, string>> = {
  visitors: "Recepção e Visitantes",
  groups: "Células",
  tribes: "Tribos Ministeriais",
  journeys: "Jornadas e EAD",
  events: "Eventos",
  volunteers: "Escalas e Louvor",
  communication: "Comunicação",
  giving: "Doações e Dízimos",
  finance: "Finanças",
  ai: "Cuidado Pastoral",
  marketplace: "Marketplace",
  children: "Segurança Kids",
  publicForms: "Formulários Públicos",
};

/** Enforces a platform-admin pause at the server boundary. Legacy settings remain enabled. */
export async function assertModuleEnabled(
  tx: AccountTransaction,
  root: string,
  moduleKey: ModuleKey,
) {
  const [features] = await tx.read(`${root}/settings/features`);
  if (features?.modules?.[moduleKey]?.enabled === false) {
    throw new AccountError(
      403,
      `${MODULE_LABELS[moduleKey] ?? "Este módulo"} está temporariamente indisponível para esta instituição. Procure o administrador da plataforma.`,
    );
  }
}
