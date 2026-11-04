import { documentId } from "./member-account";
import { AccountError, type AccountTransaction } from "./member-account-store";

export interface FamilyGuardian {
  id: string;
  name: string;
  phone: string;
  email: string;
  userId: string;
}

export async function resolveRegisteredGuardians(
  tx: AccountTransaction,
  orgId: string,
  childId: string,
) {
  const root = `organizations/${orgId}`;
  const [child] = await tx.read(`${root}/people/${childId}`);
  if (
    child?.organizationId !== orgId ||
    child.status !== "active" ||
    !["child", "teen"].includes(child.personType)
  )
    throw new AccountError(409, "Criança cadastrada não encontrada nesta igreja.");
  if (
    typeof child.primaryFamilyId !== "string" ||
    !/^[A-Za-z0-9_-]{1,128}$/.test(child.primaryFamilyId)
  )
    throw new AccountError(
      409,
      "A criança ainda não possui uma família completa. Atualize o cadastro antes do check-in.",
    );
  const familyId = documentId(child.primaryFamilyId, "Família da criança");
  const familyPath = `${root}/families/${familyId}`;
  const [family] = await tx.read(familyPath);
  if (family?.organizationId !== orgId || family.status !== "active")
    throw new AccountError(
      409,
      "A família desta criança está inativa ou incompleta. Atualize o cadastro antes do check-in.",
    );
  const members = await tx.query(familyPath, "members", undefined, undefined, "EQUAL", 51);
  if (members.length > 50)
    throw new AccountError(
      409,
      "Esta família precisa ser revisada pela secretaria antes do check-in.",
    );
  if (
    !members.some(
      (member) =>
        member.organizationId === orgId &&
        member.familyId === familyId &&
        member.personId === childId,
    )
  )
    throw new AccountError(
      409,
      "O vínculo familiar da criança está incompleto. Atualize o cadastro antes do check-in.",
    );
  const personIds = [
    ...new Set(
      members
        .filter(
          (member) =>
            member.organizationId === orgId &&
            member.familyId === familyId &&
            member.isLegalGuardian === true &&
            typeof member.personId === "string",
        )
        .map((member) => documentId(member.personId, "Responsável legal")),
    ),
  ];
  const people = await tx.read(...personIds.map((id) => `${root}/people/${id}`));
  const activePeople = personIds.flatMap((personId, index) => {
    const person = people[index];
    if (
      person?.organizationId !== orgId ||
      person.status !== "active" ||
      ["child", "teen"].includes(person.personType)
    )
      return [];
    const name = [person.firstName, person.lastName]
      .filter((value) => typeof value === "string" && value.trim())
      .join(" ")
      .trim();
    return name ? [{ personId, person, name }] : [];
  });
  const claims = await tx.read(
    ...activePeople.map(({ personId }) => `${root}/memberAccountClaims/${personId}`),
  );
  const claimUserIds = claims.map((claim) =>
    claim?.organizationId === orgId && typeof claim.userId === "string"
      ? documentId(claim.userId, "Conta do responsável")
      : "",
  );
  const accountRows = await tx.read(
    ...claimUserIds.flatMap((userId) =>
      userId ? [`${root}/users/${userId}`, `${root}/memberAccountLinks/${userId}`] : [],
    ),
  );
  let accountOffset = 0;
  const guardians: FamilyGuardian[] = activePeople.map(
    ({ personId, person, name }, index) => {
      const claimedUserId = claimUserIds[index];
      let userId = "";
      if (claimedUserId) {
        const account = accountRows[accountOffset++];
        const link = accountRows[accountOffset++];
        if (
          account?.organizationId === orgId &&
          account.isActive === true &&
          account.personId === personId &&
          link?.organizationId === orgId &&
          link.userId === claimedUserId &&
          link.personId === personId &&
          claims[index]?.personId === personId
        )
          userId = claimedUserId;
      }
      return {
        id: personId,
        name,
        phone: String(person.whatsappPhone ?? person.mobilePhone ?? ""),
        email: String(person.email ?? "").toLowerCase(),
        userId,
      };
    },
  );
  if (!guardians.length)
    throw new AccountError(
      409,
      "Nenhum responsável legal ativo foi encontrado nesta família. Atualize o cadastro antes do check-in.",
    );
  return { child, familyId, guardians };
}

export async function registeredGuardianData(
  tx: AccountTransaction,
  orgId: string,
  childId: string,
  guardianPersonId: unknown,
) {
  const family = await resolveRegisteredGuardians(tx, orgId, childId);
  const selectedId = documentId(guardianPersonId, "Responsável legal");
  const selected = family.guardians.find((guardian) => guardian.id === selectedId);
  if (!selected)
    throw new AccountError(
      409,
      "O responsável escolhido não está autorizado no cadastro familiar desta criança.",
    );
  const others = family.guardians.filter((guardian) => guardian.id !== selected.id);
  return {
    child: family.child,
    guardian: {
      familyId: family.familyId,
      parentId: selected.userId,
      guardianPersonId: selected.id,
      guardianAccountEmail: selected.email,
      authorizedPickUpIds: [...new Set(others.map((guardian) => guardian.userId).filter(Boolean))],
      guardianName: selected.name,
      guardianPhone: selected.phone,
      authorizedPickupNames: others.map((guardian) => guardian.name),
      pickupPeople: family.guardians.map((guardian) => ({
        id: guardian.id,
        name: guardian.name,
        userId: guardian.userId,
      })),
    },
  };
}

export async function assertCurrentFamilyGuardian(
  tx: AccountTransaction,
  orgId: string,
  childId: string,
  receiverId: string,
) {
  const family = await resolveRegisteredGuardians(tx, orgId, childId);
  if (!family.guardians.some((guardian) => guardian.id === receiverId))
    throw new AccountError(
      409,
      "A autorização familiar desta pessoa foi alterada. Atualize os responsáveis antes de liberar.",
    );
}

export async function assertCurrentGuardianAccount(
  tx: AccountTransaction,
  orgId: string,
  personId: string,
  userId: string,
) {
  const root = `organizations/${orgId}`;
  const [account, link, claim] = await tx.read(
    `${root}/users/${userId}`,
    `${root}/memberAccountLinks/${userId}`,
    `${root}/memberAccountClaims/${personId}`,
  );
  if (
    account?.isActive !== true ||
    account.organizationId !== orgId ||
    account.personId !== personId ||
    link?.organizationId !== orgId ||
    link.userId !== userId ||
    link.personId !== personId ||
    claim?.organizationId !== orgId ||
    claim.userId !== userId ||
    claim.personId !== personId
  )
    throw new AccountError(
      409,
      "Conta do responsável inativa ou desvinculada. Confirme novamente a autorização pelo painel.",
    );
}
