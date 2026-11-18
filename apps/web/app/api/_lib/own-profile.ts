import { randomUUID } from "node:crypto";
import { validateOwnProfile, normalizeOwnProfile } from "@alvo/domain";
import { accountTransaction, AccountError } from "./member-account-store";
import { documentId } from "./member-account";
import { financeActor } from "./finance-operations";
import { boundPerson } from "./journey-operations";
import { ownContributions } from "./own-contributions";
import { givingEnabled } from "./giving-access";
export async function ownProfileOperation(
  body: Record<string, any>,
  uid: string,
): Promise<any> {
  if (!body || !["read", "save"].includes(body.action))
    throw new AccountError(400, "Operação inválida.");
  const orgId = documentId(body.organizationId, "Instituição");
  return accountTransaction(async (tx) => {
    const { root, actor, org } = await financeActor(
      tx,
      orgId,
      uid,
      false,
      null,
    );
    const personId = await boundPerson(tx, root, orgId, uid);
    const [person] = personId
      ? await tx.read(`${root}/people/${personId}`)
      : [null];
    const revision = Number.isSafeInteger(actor.ownProfileRevision)
      ? actor.ownProfileRevision
      : 0;
    if (body.action === "save") {
      if (
        !Number.isSafeInteger(body.expectedRevision) ||
        body.expectedRevision !== revision ||
        body.expectedPersonId !== personId
      )
        throw new AccountError(
          409,
          "Seu perfil ou vínculo mudou. Atualize antes de salvar novamente.",
        );
      let fields;
      try {
        fields = validateOwnProfile(body.fields);
      } catch (e) {
        throw new AccountError(
          400,
          e instanceof Error ? e.message : "Perfil inválido.",
        );
      }
      const at = new Date().toISOString();
      tx.patch(`${root}/users/${uid}`, {
        ...fields,
        ownProfileRevision: revision + 1,
        ownProfileUpdatedAt: at,
      });
      if (personId)
        tx.patch(`${root}/people/${personId}`, {
          ...fields,
          ownProfileUpdatedAt: at,
        });
      // Metadata only: never copy income or other personal answers to audit logs.
      tx.set(`${root}/ownProfileAudit/${randomUUID()}`, {
        organizationId: orgId,
        userId: uid,
        personId,
        at,
        revision: revision + 1,
      });
      return { revision: revision + 1, personId, profile: fields };
    }
    const fields = [
      "occupation",
      "educationLevel",
      "householdIncomeRange",
      "ministerialInterests",
      "servingProfile",
      "availability",
    ];
    const profile: Record<string, any> = {};
    for (const field of fields)
      profile[field] =
        person?.[field] ??
        actor[field] ??
        (["availability", "ministerialInterests"].includes(field)
          ? []
          : ["educationLevel", "householdIncomeRange"].includes(field)
            ? "not_informed"
            : "");
    let history: Awaited<ReturnType<typeof ownContributions>> | null = null;
    let contributionsNotice = "";
    try {
      await givingEnabled(tx, root);
      history = await ownContributions(tx, root, orgId, uid);
    } catch (e) {
      contributionsNotice =
        e instanceof AccountError
          ? e.message
          : "Não foi possível carregar suas contribuições. Tente atualizar o perfil.";
    }
    return {
      personId,
      linked: !!personId,
      revision,
      profile: normalizeOwnProfile(profile),
      name: person
        ? [person.preferredName || person.firstName, person.lastName]
            .filter(Boolean)
            .join(" ")
        : actor.displayName || actor.name || actor.email || "Minha conta",
      organizationName: org.displayName || org.name || "Minha igreja",
      roles: Array.isArray(actor.roles) ? actor.roles : [],
      contributions:
        history?.rows.map((c) => ({
          id: c.id,
          amount: c.amount,
          type: c.type,
          date: c.date,
          status: c.status || "legacy",
        })) ?? null,
      contributionsTruncated: history?.truncated || false,
      contributionsNotice,
    };
  });
}
