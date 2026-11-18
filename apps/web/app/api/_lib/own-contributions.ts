import type { AccountTransaction } from "./member-account-store";
import { boundPerson } from "./journey-operations";

/** Account records plus manual entries on the verified person; never email matching. */
export async function ownContributions(
  tx: AccountTransaction,
  root: string,
  orgId: string,
  uid: string,
) {
  const personId = await boundPerson(tx, root, orgId, uid);
  const query = (field: string, value: string) =>
    tx.query(root, "contributions", field, value, "EQUAL", 201, undefined, {
      field: "date",
      direction: "DESCENDING",
    });
  const [account, personal] = await Promise.all([
    query("userId", uid),
    personId ? query("personId", personId) : Promise.resolve([]),
  ]);
  const rows = [
    ...new Map(
      [...account, ...personal]
        .filter(
          (c) =>
            c.organizationId === orgId &&
            (c.userId === uid || (personId && c.personId === personId)),
        )
        .map((c) => [c.id, c]),
    ).values(),
  ].sort(
    (a, b) =>
      String(b.date).localeCompare(String(a.date)) || a.id.localeCompare(b.id),
  );
  return {
    rows: rows.slice(0, 200),
    truncated:
      account.length > 200 || personal.length > 200 || rows.length > 200,
  };
}
