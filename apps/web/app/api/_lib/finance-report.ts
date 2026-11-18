import {
  accountTransaction,
  AccountError,
  type AccountTransaction,
} from "./member-account-store";
import { financeActor, money } from "./finance-operations";
export function reportMonth(value: unknown) {
  if (typeof value !== "string" || !/^20\d{2}-(0[1-9]|1[0-2])$/.test(value))
    throw new AccountError(400, "Escolha um mês válido (AAAA-MM).");
  return value;
}
export function financeDate(value: unknown) {
  if (
    typeof value !== "string" ||
    !/^20\d{2}-\d{2}-\d{2}$/.test(value) ||
    Number.isNaN(Date.parse(value)) ||
    new Date(value).toISOString().slice(0, 10) !== value
  )
    throw new AccountError(400, "Informe uma data válida (AAAA-MM-DD).");
  return value;
}
export function csvCell(value: unknown) {
  const text = String(value ?? "");
  return (
    '"' +
    (/^[\s]*[=+@\-]/.test(text) ? "'" + text : text).replaceAll('"', '""') +
    '"'
  );
}
export async function financeMonth(
  tx: AccountTransaction,
  root: string,
  orgId: string,
  month: string,
) {
  reportMonth(month);
  const from = month + "-01",
    to = month + "-31T23:59:59.999Z";
  const query = (collection: string) =>
    tx.query(root, collection, "date", from, "GREATER_THAN_OR_EQUAL", 1001, {
      field: "date",
      value: to,
      op: "LESS_THAN_OR_EQUAL",
    });
  const [ledger, contributions] = await Promise.all([
    query("financialTransactions"),
    query("contributions"),
  ]);
  if (ledger.length > 1000 || contributions.length > 1000)
    throw new AccountError(
      422,
      "O mês " +
        month +
        " supera 1.000 registros por origem. Solicite uma exportação completa à administração técnica; nenhum total parcial foi apresentado.",
    );
  const valid = (rows: Record<string, any>[]) =>
    rows.filter((r) => r.organizationId === orgId);
  const transactions = valid(ledger),
    declared = valid(contributions);
  const entries = [
    ...transactions
      .filter((r) => !r.status || r.status === "posted")
      .map((r) => ({
        id: r.id,
        date: r.date,
        kind: r.kind,
        label: String(r.label || "Lançamento"),
        note: String(r.note || ""),
        amountCents: money(r.amount),
        reference: r.reference || "",
        source: r.contributionId ? "contribution" : "manual",
        canVoid: !r.contributionId,
        contributionId: r.contributionId || "",
      })),
    ...declared
      .filter(
        (c) =>
          c.status === "confirmed" &&
          !c.ledgerId &&
          !transactions.some((t) => t.contributionId === c.id),
      )
      .map((c) => ({
        id: c.id,
        date: c.date,
        kind: c.type === "missao" ? "missions" : "income",
        label: String(c.contributorName || "Contribuição confirmada"),
        note: "",
        amountCents: money(c.amount),
        reference: c.reconciliationReference || "",
        source: "legacy_contribution",
        canVoid: false,
        contributionId: c.id,
      })),
  ].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  if (entries.some((r) => !["income", "expense", "missions"].includes(r.kind)))
    throw new AccountError(
      409,
      "Há categoria inválida no mês. Revise os registros antes de consultar os totais.",
    );
  for (const e of entries) financeDate(String(e.date).slice(0, 10));
  const sum = (kind: string) =>
    entries
      .filter((e) => e.kind === kind)
      .reduce((n, e) => n + e.amountCents, 0);
  const missionsCents = sum("missions"),
    incomeCents = sum("income") + missionsCents,
    expenseCents = sum("expense");
  return {
    month,
    entries,
    incomeCents,
    expenseCents,
    missionsCents,
    balanceCents: incomeCents - expenseCents,
    unconfirmedLegacyCount: declared.filter((c) => !c.status).length,
    voidedCount: transactions.filter((t) => t.status === "voided").length,
  };
}
export async function monthlyFinance(
  orgId: string,
  month: string,
  uid: string,
) {
  reportMonth(month);
  return accountTransaction(async (tx) => {
    const { root } = await financeActor(tx, orgId, uid);
    const report = await financeMonth(tx, root, orgId, month);
    const csv =
      "\uFEFF" +
      [
        [
          "Data",
          "Categoria",
          "Descrição",
          "Valor BRL",
          "Referência",
          "Origem",
          "Identificador",
        ]
          .map(csvCell)
          .join(";"),
        ...report.entries.map((r) =>
          [
            r.date,
            r.kind,
            r.label,
            (r.amountCents / 100).toFixed(2).replace(".", ","),
            r.reference,
            r.source,
            r.id,
          ]
            .map(csvCell)
            .join(";"),
        ),
      ].join("\r\n");
    return { ...report, csv };
  });
}
