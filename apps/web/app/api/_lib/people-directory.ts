import { randomUUID } from "node:crypto";
import { accountTransaction, AccountError } from "./member-account-store";
import { documentId } from "./member-account";
import { financeActor } from "./finance-operations";
import { personalIntegration, journeyEnabled } from "./journey-operations";
import { assertModuleEnabled } from "./module-access";

type Data = Record<string, any>;
const pageSize = 100;
export async function peopleDirectoryOperation(
  body: Data,
  uid: string,
): Promise<any> {
  if (
    !body ||
    !["people", "families", "detail", "preference"].includes(body.action)
  )
    throw new AccountError(400, "Operação inválida.");
  const orgId = documentId(body.organizationId, "Instituição");
  return accountTransaction(async (tx) => {
    const { root } = await financeActor(tx, orgId, uid, true, null);
    if (body.action === "people" || body.action === "families") {
      const collection = body.action;
      const cursor = body.cursor
        ? documentId(body.cursor, "Página")
        : undefined;
      const [rows, total] = await Promise.all([
        tx.query(
          root,
          collection,
          undefined,
          undefined,
          "EQUAL",
          pageSize + 1,
          undefined,
          { field: "__name__", direction: "ASCENDING" },
          cursor,
        ),
        tx.count(root, collection),
      ]);
      const visible = rows
        .slice(0, pageSize)
        .filter((r) => r.organizationId === orgId);
      const items =
        collection === "families"
          ? await Promise.all(
              visible.map(async (f) => ({
                ...f,
                peopleCount: await tx.count(
                  root,
                  "people",
                  "primaryFamilyId",
                  f.id,
                ),
              })),
            )
          : visible;
      return {
        items,
        total,
        nextCursor: rows.length > pageSize ? rows[pageSize - 1].id : null,
      };
    }
    const personId = documentId(body.personId, "Pessoa");
    const path = `${root}/people/${personId}`;
    const [raw] = await tx.read(path);
    if (!raw || raw.organizationId !== orgId)
      throw new AccountError(404, "Pessoa não encontrada.");
    const person = { ...raw, id: personId };
    if (body.action === "preference") {
      if (
        typeof body.optOut !== "boolean" ||
        typeof body.expectedOptOut !== "boolean"
      )
        throw new AccountError(400, "Preferência inválida.");
      const current =
        raw.communicationOptOut === true || !!raw.whatsappOptOutAt;
      if (current !== body.expectedOptOut)
        throw new AccountError(
          409,
          "A preferência mudou. Atualize a ficha antes de tentar novamente.",
        );
      if (!body.optOut && body.consentConfirmed !== true)
        throw new AccountError(
          400,
          "Confirme que a pessoa autorizou novamente o contato por WhatsApp.",
        );
      const at = new Date().toISOString();
      const patch = {
        communicationOptOut: body.optOut,
        whatsappOptOutAt: body.optOut ? at : null,
      };
      if (current !== body.optOut) {
        tx.patch(path, patch);
        tx.set(`${root}/peoplePreferenceAudit/${randomUUID()}`, {
          organizationId: orgId,
          personId,
          actorId: uid,
          at,
          optOut: body.optOut,
          consentConfirmed: body.consentConfirmed === true,
        });
      }
      return { person: { ...person, ...patch } };
    }
    // Independent sections report unavailable/partial data instead of pretending it is empty.
    const notices: string[] = [];
    async function section<T>(
      label: string,
      work: () => Promise<T>,
      fallback: T,
    ): Promise<T> {
      try {
        return await work();
      } catch (error) {
        if (!(error instanceof AccountError)) throw error;
        notices.push(`${label}: ${error.message}`);
        return fallback;
      }
    }
    const integration = await section(
      "Jornada",
      async () => {
        await journeyEnabled(tx, root);
        return personalIntegration(tx, root, orgId, personId);
      },
      null,
    );
    const groups = integration?.cells.length
      ? (
          await tx.read(
            ...integration.cells.map((g) => `${root}/groups/${g.id}`),
          )
        ).flatMap((g, i) => (g ? [{ ...g, id: integration.cells[i].id }] : []))
      : [];
    const contributions = await section(
      "Contribuições",
      async () => {
        await assertModuleEnabled(tx, root, "finance");
        const rows = await tx.query(
          root,
          "contributions",
          "personId",
          personId,
          "EQUAL",
          201,
        );
        if (rows.length > 200)
          notices.push(
            "Contribuições: exibindo 200 registros; consulte Finanças para o histórico completo.",
          );
        return rows
          .slice(0, 200)
          .filter((r) => r.organizationId === orgId)
          .sort((a, b) => String(b.date).localeCompare(String(a.date)));
      },
      null,
    );
    const assignments = await section(
      "Escalas",
      async () => {
        await assertModuleEnabled(tx, root, "volunteers");
        const rows = await tx.query(
          root,
          "serviceAssignments",
          "personId",
          personId,
          "EQUAL",
          201,
        );
        if (rows.length > 200)
          notices.push(
            "Escalas: exibindo 200 registros; consulte Escalas para o histórico completo.",
          );
        return rows.slice(0, 200).filter((r) => r.organizationId === orgId);
      },
      null,
    );
    let family: Data | null = null;
    let familyPeople: Data[] = [];
    if (raw.primaryFamilyId) {
      const familyId = documentId(raw.primaryFamilyId, "Família");
      const [f] = await tx.read(`${root}/families/${familyId}`);
      if (f?.organizationId === orgId) {
        family = { ...f, id: familyId };
        const rows = await tx.query(
          root,
          "people",
          "primaryFamilyId",
          familyId,
          "EQUAL",
          101,
        );
        familyPeople = rows
          .slice(0, 100)
          .filter((p) => p.organizationId === orgId);
        if (rows.length > 100)
          notices.push(
            "Família: exibindo 100 pessoas. Consulte a secretaria para revisar este vínculo.",
          );
      } else
        notices.push(
          "A família vinculada não foi encontrada. Solicite revisão à secretaria.",
        );
    }
    return {
      person,
      family,
      familyPeople,
      integration,
      groups,
      contributions,
      assignments,
      notices,
    };
  });
}
