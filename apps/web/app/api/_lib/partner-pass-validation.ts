import { createHash } from "node:crypto";
import {
  PLAN_LIMITS,
  planHasFeature,
  planTierToPlanId,
  type PlanId,
} from "@alvo/firebase";
import {
  AccountError,
  accountTransaction,
  type AccountTransaction,
} from "./member-account-store";
import { activePass, documentId } from "./member-account";
import { assertModuleEnabled } from "./module-access";

const CODE = /^[A-Za-z0-9_-]{8,128}$/;
const DAILY_VALIDATIONS = 500;
const MINUTE_VALIDATIONS = 20;

function code(value: unknown) {
  if (typeof value !== "string" || !CODE.test(value.trim())) {
    throw new AccountError(400, "Código do Passe inválido.");
  }
  return value.trim();
}

export function partnerValidationInput(raw: unknown) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new AccountError(400, "Validação inválida.");
  }
  const data = raw as Record<string, unknown>;
  return {
    organizationId: documentId(data.organizationId, "Igreja"),
    partnerId: documentId(data.partnerId, "Parceiro"),
    benefitId: documentId(data.benefitId, "Benefício"),
    requestId: documentId(data.requestId, "Tentativa"),
    memberCardCode: code(data.memberCardCode),
  };
}

async function partnerActor(
  tx: AccountTransaction,
  orgId: string,
  uid: string,
) {
  documentId(orgId, "Igreja");
  documentId(uid, "Conta");
  const root = `organizations/${orgId}`;
  await assertModuleEnabled(tx, root, "marketplace");
  const [org, actor, link, subscription] = await tx.read(
    root,
    `${root}/users/${uid}`,
    `${root}/memberAccountLinks/${uid}`,
    `${root}/settings/subscription`,
  );
  if (
    org?.status !== "active" ||
    actor?.organizationId !== orgId ||
    actor?.isActive !== true
  ) {
    throw new AccountError(403, "Você não tem acesso a esta instituição.");
  }
  const candidate =
    subscription?.plan ?? planTierToPlanId(subscription?.planTier);
  const plan: PlanId = Object.hasOwn(PLAN_LIMITS, candidate)
    ? candidate
    : "free";
  if (!planHasFeature(plan, "marketplace")) {
    throw new AccountError(
      403,
      "O Esdras Passe para parceiros não está disponível no plano atual.",
    );
  }
  if (
    !link ||
    link.organizationId !== orgId ||
    link.userId !== uid ||
    !link.verifiedBy ||
    actor.personId !== link.personId
  ) {
    throw new AccountError(
      403,
      "Sua conta precisa estar vinculada ao cadastro do responsável pelo parceiro.",
    );
  }
  const personId = documentId(link.personId, "Pessoa");
  const [claim] = await tx.read(`${root}/memberAccountClaims/${personId}`);
  if (
    !claim ||
    claim.organizationId !== orgId ||
    claim.userId !== uid ||
    claim.personId !== personId
  ) {
    throw new AccountError(
      403,
      "O vínculo da sua conta precisa ser confirmado pela instituição.",
    );
  }
  return { root, personId };
}

function activeBenefit(
  benefit: Record<string, any> | null,
  orgId: string,
  partnerId: string,
  now: number,
) {
  return Boolean(
    benefit &&
    benefit.organizationId === orgId &&
    benefit.partnerId === partnerId &&
    benefit.status === "active" &&
    (!benefit.validUntil ||
      (Number.isFinite(Date.parse(benefit.validUntil)) &&
        Date.parse(benefit.validUntil) >= now)),
  );
}

export async function readPartnerPassContext(
  orgId: string,
  uid: string,
  now = Date.now(),
) {
  return accountTransaction(async (tx) => {
    const { root, personId } = await partnerActor(tx, orgId, uid);
    const owned = await tx.query(
      root,
      "partners",
      "ownerPersonId",
      personId,
      "EQUAL",
      20,
    );
    const partners = owned.filter(
      (partner) =>
        partner.organizationId === orgId && partner.status === "active",
    );
    const result = [];
    for (const partner of partners) {
      const benefits = await tx.query(
        root,
        "partnerBenefits",
        "partnerId",
        partner.id,
        "EQUAL",
        100,
      );
      result.push({
        id: partner.id,
        name: String(partner.name ?? "Parceiro"),
        benefits: benefits
          .filter((benefit) => activeBenefit(benefit, orgId, partner.id, now))
          .map((benefit) => ({
            id: benefit.id,
            title: String(benefit.title ?? "Benefício"),
            discountLabel: String(benefit.discountLabel ?? ""),
            verificationMode: String(benefit.verificationMode ?? "member_code"),
          })),
      });
    }
    return { partners: result };
  });
}

function fingerprint(input: ReturnType<typeof partnerValidationInput>) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        partnerId: input.partnerId,
        benefitId: input.benefitId,
        memberCardCode: input.memberCardCode,
      }),
    )
    .digest("hex");
}

function rateLimit(
  tx: AccountTransaction,
  root: string,
  partnerId: string,
  states: Array<Record<string, any> | null>,
  now: number,
) {
  const windows = [
    {
      path: `${root}/partnerBenefitRateLimits/${partnerId}_minute`,
      window: Math.floor(now / 60000),
      max: MINUTE_VALIDATIONS,
    },
    {
      path: `${root}/partnerBenefitRateLimits/${partnerId}_day`,
      window: Math.floor(now / 86400000),
      max: DAILY_VALIDATIONS,
    },
  ];
  windows.forEach((item, index) => {
    const count =
      states[index]?.window === item.window ? states[index]?.count : 0;
    if (!Number.isInteger(count) || count < 0)
      throw new AccountError(
        503,
        "O controle de validações precisa de conferência.",
      );
    if (count >= item.max)
      throw new AccountError(
        429,
        "Muitas validações. Aguarde antes de tentar novamente.",
      );
    tx.set(item.path, {
      window: item.window,
      count: count + 1,
      updatedAt: new Date(now).toISOString(),
    });
  });
}

export async function validatePartnerPass(
  raw: unknown,
  uid: string,
  now = Date.now(),
) {
  const input = partnerValidationInput(raw);
  await accountTransaction(async (tx) => {
    const { root, personId } = await partnerActor(
      tx,
      input.organizationId,
      uid,
    );
    const minutePath = `${root}/partnerBenefitRateLimits/${input.partnerId}_minute`;
    const dayPath = `${root}/partnerBenefitRateLimits/${input.partnerId}_day`;
    const [partner, benefit, minute, day] = await tx.read(
      `${root}/partners/${input.partnerId}`,
      `${root}/partnerBenefits/${input.benefitId}`,
      minutePath,
      dayPath,
    );
    if (
      !partner ||
      partner.organizationId !== input.organizationId ||
      partner.status !== "active" ||
      partner.ownerPersonId !== personId
    ) {
      throw new AccountError(
        403,
        "Este parceiro não está vinculado à sua conta ou está inativo.",
      );
    }
    if (!activeBenefit(benefit, input.organizationId, input.partnerId, now)) {
      throw new AccountError(409, "Este benefício não está disponível.");
    }
    rateLimit(tx, root, input.partnerId, [minute, day], now);
  });
  return accountTransaction(async (tx) => {
    const { root, personId: actorPersonId } = await partnerActor(
      tx,
      input.organizationId,
      uid,
    );
    const validationPath = `${root}/memberBenefitValidations/${input.requestId}`;
    const [partner, benefit, existing] = await tx.read(
      `${root}/partners/${input.partnerId}`,
      `${root}/partnerBenefits/${input.benefitId}`,
      validationPath,
    );
    const currentFingerprint = fingerprint(input);
    if (existing) {
      if (
        existing.fingerprint !== currentFingerprint ||
        existing.validatedByUserId !== uid
      ) {
        throw new AccountError(
          409,
          "Esta tentativa já foi usada em outra validação.",
        );
      }
      return {
        status: "approved" as const,
        member: { name: String(existing.memberName ?? "Membro ativo") },
        benefit: {
          title: String(existing.benefitTitle ?? benefit?.title ?? "Benefício"),
          discountLabel: String(
            existing.discountLabel ?? benefit?.discountLabel ?? "",
          ),
        },
        validatedAt: String(existing.validatedAt),
        replayed: true,
      };
    }
    if (
      !partner ||
      partner.organizationId !== input.organizationId ||
      partner.status !== "active" ||
      partner.ownerPersonId !== actorPersonId
    ) {
      throw new AccountError(
        403,
        "Este parceiro não está vinculado à sua conta ou está inativo.",
      );
    }
    if (!activeBenefit(benefit, input.organizationId, input.partnerId, now)) {
      throw new AccountError(409, "Este benefício não está disponível.");
    }
    const people = await tx.query(
      root,
      "people",
      "memberCardCode",
      input.memberCardCode,
      "EQUAL",
      2,
    );
    const eligible = people.filter((person) =>
      activePass(person, input.organizationId),
    );
    if (people.length !== 1 || eligible.length !== 1) {
      throw new AccountError(
        404,
        "Passe não encontrado ou indisponível. Oriente a pessoa a procurar a instituição.",
      );
    }
    const person = eligible[0];
    if (person.id === actorPersonId)
      throw new AccountError(
        409,
        "O responsável pelo parceiro não pode validar o próprio Passe.",
      );
    const validatedAt = new Date(now).toISOString();
    const memberName = String(person.preferredName || person.firstName).trim();
    tx.set(validationPath, {
      id: input.requestId,
      organizationId: input.organizationId,
      partnerId: input.partnerId,
      benefitId: input.benefitId,
      personId: person.id,
      validationStatus: "approved",
      memberCardCodeSuffix: input.memberCardCode.slice(-4),
      memberName,
      benefitTitle: String(benefit!.title ?? "Benefício"),
      discountLabel: String(benefit!.discountLabel ?? ""),
      validatedByUserId: uid,
      fingerprint: currentFingerprint,
      validatedAt,
      exposedFields: ["name", "memberActive", "benefitEligible"],
    });
    tx.set(`${root}/partnerBenefitAudit/${crypto.randomUUID()}`, {
      organizationId: input.organizationId,
      partnerId: input.partnerId,
      benefitId: input.benefitId,
      personId: person.id,
      validationId: input.requestId,
      actorId: uid,
      action: "pass_approved",
      at: validatedAt,
    });
    return {
      status: "approved" as const,
      member: { name: memberName },
      benefit: {
        title: String(benefit!.title ?? "Benefício"),
        discountLabel: String(benefit!.discountLabel ?? ""),
      },
      validatedAt,
      replayed: false,
    };
  });
}
