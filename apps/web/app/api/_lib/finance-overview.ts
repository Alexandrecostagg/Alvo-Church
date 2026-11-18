import { accountTransaction, AccountError } from "./member-account-store";
import { financeActor } from "./finance-operations";
import { financeMonth, reportMonth } from "./finance-report";
import { documentId } from "./member-account";
import { givingEnabled } from "./giving-access";
export async function financeOverview(body: Record<string, any>, uid: string) {
  const orgId = documentId(body.organizationId, "Igreja"),
    month = reportMonth(body.month);
  return accountTransaction(async (tx) => {
    const { root, org } = await financeActor(tx, orgId, uid);
    if (body.action === "evolution") {
      const [y, m] = month.split("-").map(Number);
      const months = Array.from({ length: 6 }, (_, i) =>
        new Date(Date.UTC(y, m - 6 + i, 1)).toISOString().slice(0, 7),
      );
      const reports = await Promise.all(
        months.map((key) => financeMonth(tx, root, orgId, key)),
      );
      return {
        series: reports.map(
          ({
            month,
            incomeCents,
            expenseCents,
            balanceCents,
            unconfirmedLegacyCount,
          }) => ({
            month,
            incomeCents,
            expenseCents,
            balanceCents,
            unconfirmedLegacyCount,
          }),
        ),
      };
    }
    if (body.action !== "overview")
      throw new AccountError(400, "Operação inválida.");
    const cursor = body.pendingAfter
      ? documentId(body.pendingAfter, "Página")
      : undefined;
    const [report, pendingRows, pendingCount] = await Promise.all([
      financeMonth(tx, root, orgId, month),
      tx.query(
        root,
        "contributions",
        "status",
        "pending",
        "EQUAL",
        101,
        undefined,
        { field: "__name__", direction: "ASCENDING" },
        cursor,
      ),
      tx.count(root, "contributions", "status", "pending"),
    ]);
    const pending = pendingRows
      .slice(0, 100)
      .filter((c) => c.organizationId === orgId)
      .map((c) => ({
        id: c.id,
        name: c.contributorName || "Contribuição",
        amount: c.amount,
        type: c.type,
        date: c.date,
        receiptId: c.receiptId || null,
      }));
    let givingAvailable = false;
    try {
      await givingEnabled(tx, root);
      givingAvailable = true;
    } catch (e) {
      if (!(e instanceof AccountError)) throw e;
    }
    const campaigns = givingAvailable
      ? await tx.query(
          root,
          "givingCampaigns",
          "status",
          "active",
          "EQUAL",
          501,
        )
      : [];
    const [branding, slugRecord] = givingAvailable
      ? await tx.read(
          root + "/settings/branding",
          "org_slugs/" +
            (org.slug && /^[A-Za-z0-9_-]{1,128}$/.test(org.slug)
              ? org.slug
              : "none"),
        )
      : [null, null];
    return {
      report,
      pending,
      pendingCount,
      nextPendingCursor: pendingRows.length > 100 ? pendingRows[99].id : null,
      campaigns: campaigns
        .slice(0, 500)
        .filter((c) => c.organizationId === orgId)
        .map((c) => ({
          id: c.id,
          title: c.title,
          goalAmount: Number(c.goalAmount) || 0,
          raisedAmount: Number(c.raisedAmount) || 0,
        })),
      campaignsTruncated: campaigns.length > 500,
      givingAvailable,
      publicPath:
        givingAvailable &&
        branding?.pixKey &&
        slugRecord?.organizationId === orgId
          ? "/p/" + org.slug + "/give"
          : null,
    };
  });
}
