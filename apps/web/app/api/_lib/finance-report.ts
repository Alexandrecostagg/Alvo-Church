import { accountTransaction, AccountError } from "./member-account-store";
import { financeActor, money } from "./finance-operations";
export function reportMonth(value: unknown) {
  if (typeof value !== "string" || !/^20\d{2}-(0[1-9]|1[0-2])$/.test(value))
    throw new AccountError(400, "Escolha um mês válido (AAAA-MM).");
  return value;
}
export function csvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${(/^[\s]*[=+@\-]/.test(text) ? "'" + text : text).replaceAll('"', '""')}"`;
}
export async function monthlyFinance(
  orgId: string,
  month: string,
  uid: string,
) {
  reportMonth(month);
  return accountTransaction(async (tx) => {
    const { root } = await financeActor(tx, orgId, uid);
    const from = `${month}-01`,
      to = `${month}-31T23:59:59.999Z`;
    const ledger = await tx.query(
      root,
      "financialTransactions",
      "date",
      from,
      "GREATER_THAN_OR_EQUAL",
      1001,
      { field: "date", value: to, op: "LESS_THAN_OR_EQUAL" },
    );
    const contributions = await tx.query(
      root,
      "contributions",
      "date",
      from,
      "GREATER_THAN_OR_EQUAL",
      1001,
      { field: "date", value: to, op: "LESS_THAN_OR_EQUAL" },
    );
    if (ledger.length > 1000 || contributions.length > 1000)
      throw new AccountError(
        422,
        "Este mês supera o limite de 1.000 registros por origem. Solicite uma exportação completa à administração técnica; nenhum relatório parcial foi gerado.",
      );
    const entries = [
      ...ledger
        .filter((r) => r.status !== "voided")
        .map((r) => ({
          id: r.id,
          date: r.date,
          kind: r.kind,
          label: r.label,
          amountCents: money(r.amount),
          reference: r.reference || "",
          source: "ledger",
        })),
      ...contributions
        .filter((c) => !c.ledgerId && (!c.status || c.status === "confirmed"))
        .map((c) => ({
          id: c.id,
          date: c.date,
          kind: c.type === "missao" ? "missions" : "income",
          label: c.contributorName || "Contribuição legada",
          amountCents: money(c.amount),
          reference: c.reconciliationReference || "",
          source: "legacy_contribution",
        })),
    ].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
    if (
      entries.some((r) => !["income", "expense", "missions"].includes(r.kind))
    )
      throw new AccountError(
        409,
        "Há categoria legada inválida; revise os registros antes de exportar.",
      );
    const incomeCents = entries
        .filter((r) => r.kind !== "expense")
        .reduce((s, r) => s + r.amountCents, 0),
      expenseCents = entries
        .filter((r) => r.kind === "expense")
        .reduce((s, r) => s + r.amountCents, 0);
    const header = [
      "Data",
      "Categoria",
      "Descrição",
      "Valor BRL",
      "Referência",
      "Origem",
      "Identificador",
    ]
      .map(csvCell)
      .join(";");
    const csv =
      "\uFEFF" +
      [
        header,
        ...entries.map((r) =>
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
    return {
      month,
      entries,
      incomeCents,
      expenseCents,
      balanceCents: incomeCents - expenseCents,
      csv,
    };
  });
}
