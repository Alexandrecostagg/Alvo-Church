import {
  PLAN_LIMITS,
  planTierToPlanId,
  resolveBillingStatus,
  type PlanId,
} from "@alvo/firebase";
import { accountTransaction, AccountError } from "./member-account-store";
import { financeActor } from "./finance-operations";
import { documentId } from "./member-account";
export const AI_TASKS = [
  "cell_script",
  "cell_dynamic",
  "cell_meeting_summary",
  "absence_message",
  "care_reply",
  "pastoral_suggestion",
  "tribe_classify",
  "banner_copy",
  "banner_image",
] as const;
export function aiTask(value: unknown): string {
  if (typeof value !== "string" || !AI_TASKS.includes(value as any))
    throw new AccountError(400, "Tarefa de IA inválida.");
  return value;
}
// A single monthly allowance and short-window cap cover all generation routes.
// Failed/uncertain provider attempts remain counted; inputs/results are not logged.
export async function aiGate(
  orgId: string,
  uid: string,
  task: string,
  consume = true,
  now = Date.now(),
) {
  aiTask(task);
  return accountTransaction(async (tx) => {
    const { root, actor } = await financeActor(
      tx,
      orgId,
      uid,
      task.startsWith("banner_"),
    );
    if (
      task === "pastoral_suggestion" &&
      !actor.roles?.some((r: string) =>
        ["super_admin", "church_admin", "pastor"].includes(r),
      )
    )
      throw new AccountError(
        403,
        "Este recurso é restrito à liderança pastoral.",
      );
    const month = new Date(now).toISOString().slice(0, 7),
      minute = Math.floor(now / 60000);
    const monthPath = `${root}/aiUsage/${month}`,
      burstPath = `${root}/aiRateLimits/org`,
      userPath = `${root}/aiRateLimits/${uid}`;
    const [subscription, usage, burst, personal] = await tx.read(
      `${root}/settings/subscription`,
      monthPath,
      burstPath,
      userPath,
    );
    const candidate =
      subscription?.plan ?? planTierToPlanId(subscription?.planTier);
    const plan: PlanId = Object.hasOwn(PLAN_LIMITS, candidate)
      ? candidate
      : "free";
    if (
      task === "pastoral_suggestion" &&
      !["pastoral", "rede", "enterprise"].includes(plan)
    )
      throw new AccountError(
        403,
        "A análise pastoral exige o plano Pastoral ou superior.",
      );
    if (
      subscription?.billingStatus === "overdue" &&
      !Number.isFinite(Date.parse(subscription?.overdueSince))
    )
      throw new AccountError(
        503,
        "A carência da assinatura precisa de conferência.",
      );
    if (
      resolveBillingStatus(
        subscription?.billingStatus,
        subscription?.overdueSince,
      ) === "suspended"
    )
      throw new AccountError(
        403,
        "Assinatura suspensa. Regularize o plano para usar IA.",
      );
    const limit = PLAN_LIMITS[plan].aiQueriesPerMonth,
      used = usage?.count ?? 0;
    if (!Number.isInteger(used) || used < 0)
      throw new AccountError(503, "Contador de IA precisa de conferência.");
    if (used >= limit)
      throw new AccountError(
        429,
        `Cota mensal de IA esgotada (${used}/${limit}). Texto, banner e imagem usam a mesma cota.`,
      );
    const orgCount = burst?.window === minute ? burst.count : 0,
      userCount = personal?.window === minute ? personal.count : 0;
    if (![orgCount, userCount].every((n) => Number.isInteger(n) && n >= 0))
      throw new AccountError(503, "Contador temporário de IA inválido.");
    if (orgCount >= 10 || userCount >= 3)
      throw new AccountError(
        429,
        "Aguarde um minuto antes de gerar novamente.",
      );
    if (!consume) return { plan, limit, used, auditId: "" };
    const auditId = crypto.randomUUID(),
      createdAt = new Date(now).toISOString();
    tx.set(monthPath, { count: used + 1, updatedAt: createdAt });
    tx.set(burstPath, { window: minute, count: orgCount + 1 });
    tx.set(userPath, { window: minute, count: userCount + 1 });
    tx.set(`${root}/aiAudit/${auditId}`, {
      actorId: uid,
      task,
      month,
      createdAt,
      status: "started",
    });
    return { plan, limit, used: used + 1, auditId };
  });
}
export async function completeAi(
  orgId: string,
  auditId: string,
  status: "completed" | "failed",
) {
  documentId(orgId, "Igreja");
  documentId(auditId, "Registro de IA");
  await accountTransaction(async (tx) => {
    const path = `organizations/${orgId}/aiAudit/${auditId}`,
      [row] = await tx.read(path);
    if (row?.status === "started")
      tx.patch(path, { status, finishedAt: new Date().toISOString() });
  });
}
