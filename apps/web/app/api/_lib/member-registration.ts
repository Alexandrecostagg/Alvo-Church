import { getGoogleAccessToken } from "./google-service-account";
import {
  isLocalQaFirebase,
  serverFirestoreDocumentsUrl,
} from "./firebase-server-env";
import {
  PLAN_LIMITS,
  planTierToPlanId,
  resolveBillingStatus,
  type PlanId,
} from "@alvo/firebase/src/plans";
import { generateSecureCode } from "@alvo/utils";
import { birthDateError, isValidCpf } from "../../../src/lib/member-form";

type Data = Record<string, any>;
export class RegistrationError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const reject = (message: string): never => {
  throw new RegistrationError(400, message);
};
function record(value: unknown): Data {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return reject("Cadastro inválido.");
  return value as Data;
}
function str(data: Data, key: string, max = 160, required = false) {
  const value = data[key];
  if (value === undefined || value === null || value === "") {
    if (required) return reject(`Informe ${key}.`);
    return undefined;
  }
  if (
    typeof value !== "string" ||
    value.trim().length > max ||
    (required && !value.trim())
  )
    return reject(`Campo ${key} inválido.`);
  return value.trim() || undefined;
}
function flag(data: Data, key: string) {
  if (data[key] !== undefined && typeof data[key] !== "boolean")
    return reject(`Campo ${key} inválido.`);
  return data[key] === true;
}
function choice(data: Data, key: string, values: string[], fallback: string) {
  const value = data[key] ?? fallback;
  if (!values.includes(value)) return reject(`Campo ${key} inválido.`);
  return value;
}
export function validateRegistration(raw: unknown) {
  const body = record(raw),
    source = record(body.person);
  const organizationId = str(body, "organizationId", 128, true)!;
  const requestId = str(body, "requestId", 36, true)!;
  if (
    !/^[a-zA-Z0-9_-]+$/.test(organizationId) ||
    !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(requestId)
  )
    return reject("Identificação do cadastro inválida.");
  const cpfInput = str(source, "cpf", 14);
  const cpf = cpfInput?.replace(/\D/g, "");
  if (cpfInput && (!/^[\d.\-]+$/.test(cpfInput) || !isValidCpf(cpf ?? "")))
    return reject("O CPF informado parece inválido.");
  const birthDate = str(source, "birthDate", 10);
  if (birthDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate))
      return reject("Data de nascimento inválida.");
    const [year, month, day] = birthDate.split("-");
    const error = birthDateError(day, month, year);
    if (error) return reject(error);
  }
  const partnerBenefitsEnabled = flag(source, "partnerBenefitsEnabled");
  const consent = flag(body, "consent");
  if (partnerBenefitsEnabled && !consent)
    return reject(
      "Registre o consentimento antes de habilitar o Esdras Passe.",
    );
  const addressSource = source.address ? record(source.address) : {};
  const address = Object.fromEntries(
    [
      "postalCode",
      "street",
      "number",
      "complement",
      "district",
      "city",
      "state",
    ].map((key) => [key, str(addressSource, key, key === "state" ? 2 : 160)]),
  );
  if (
    address.state &&
    !"AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO"
      .split(" ")
      .includes(address.state)
  )
    return reject("Estado inválido.");
  const person = {
    firstName: str(source, "firstName", 100, true),
    lastName: str(source, "lastName", 160, true),
    preferredName: str(source, "preferredName"),
    email: str(source, "email", 254),
    mobilePhone: str(source, "mobilePhone", 30),
    whatsappPhone: str(source, "whatsappPhone", 30),
    cpf,
    birthDate,
    address,
    partnerBenefitsEnabled,
    personType: choice(
      source,
      "personType",
      ["adult", "young_adult", "teen", "child"],
      "adult",
    ),
    memberStatus: choice(
      source,
      "memberStatus",
      [
        "visitor",
        "congregant",
        "new_believer",
        "member",
        "leader",
        "volunteer",
      ],
      "member",
    ),
  };
  if (person.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(person.email))
    return reject("E-mail inválido.");
  const familySource = body.family ? record(body.family) : null;
  const memberSource = body.familyMember ? record(body.familyMember) : {};
  const family = familySource
    ? {
        familyName: str(familySource, "familyName", 160, true),
        notes: str(familySource, "notes", 2000),
      }
    : null;
  const familyMember = family
    ? {
        relationshipType: choice(
          memberSource,
          "relationshipType",
          ["self", "spouse", "child", "parent", "sibling", "other"],
          "self",
        ),
        isPrimaryContact: flag(memberSource, "isPrimaryContact"),
        isFinancialResponsible: flag(memberSource, "isFinancialResponsible"),
        isLegalGuardian: flag(memberSource, "isLegalGuardian"),
      }
    : null;
  return { organizationId, requestId, person, family, familyMember, consent };
}

function encode(value: any): Data {
  if (value === null) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return { integerValue: String(value) };
  if (Array.isArray(value))
    return { arrayValue: { values: value.map(encode) } };
  return {
    mapValue: {
      fields: Object.fromEntries(
        Object.entries(value)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, encode(v)]),
      ),
    },
  };
}
function decode(value: Data): any {
  if (value.mapValue)
    return Object.fromEntries(
      Object.entries(value.mapValue.fields ?? {}).map(([k, v]) => [
        k,
        decode(v as Data),
      ]),
    );
  if (value.arrayValue) return (value.arrayValue.values ?? []).map(decode);
  if (value.integerValue !== undefined) return Number(value.integerValue);
  return value.stringValue ?? value.booleanValue ?? null;
}
async function hash(value: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    ),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
}

export async function registerMember(raw: unknown, uid: string) {
  const input = validateRegistration(raw);
  const { organizationId, requestId, person, family, familyMember, consent } =
    input;
  const base = serverFirestoreDocumentsUrl();
  const name = (path: string) => base.split("/v1/")[1] + "/" + path;
  const orgPath = `organizations/${organizationId}`;
  const operationPath = `${orgPath}/memberRegistrations/${requestId}`;
  const cpfPath = person.cpf
    ? `${orgPath}/memberCpfClaims/${await hash(person.cpf)}`
    : null;
  const fingerprint = await hash(JSON.stringify(input));
  const token = isLocalQaFirebase()
    ? "owner"
    : await getGoogleAccessToken("https://www.googleapis.com/auth/datastore");
  async function call(suffix: string, body: Data): Promise<any> {
    const response = await fetch(base + suffix, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      if (response.status === 409 || error.error?.status === "ABORTED")
        throw new RegistrationError(
          409,
          "Conflito de cadastro. Tente novamente.",
        );
      throw new Error(`Firestore ${response.status}`);
    }
    return response.json();
  }
  for (let attempt = 0; attempt < 5; attempt++) {
    let transaction: string | undefined;
    let committed = false;
    try {
      transaction = (
        await call(":beginTransaction", { options: { readWrite: {} } })
      ).transaction;
      if (!transaction) throw new Error("Transação ausente.");
      const paths = [
        orgPath,
        `${orgPath}/users/${uid}`,
        `${orgPath}/settings/subscription`,
        operationPath,
        ...(cpfPath ? [cpfPath] : []),
      ];
      const rows = (await call(":batchGet", {
        documents: paths.map(name),
        transaction,
      })) as Data[];
      const docs = new Map(
        rows
          .filter((r) => r.found)
          .map((r) => [
            r.found.name,
            decode({ mapValue: { fields: r.found.fields } }),
          ]),
      );
      const org = docs.get(name(orgPath));
      const user = docs.get(name(`${orgPath}/users/${uid}`));
      if (
        !org ||
        org.status !== "active" ||
        !user?.isActive ||
        user.organizationId !== organizationId ||
        !Array.isArray(user.roles) ||
        !user.roles.some((r: string) =>
          ["church_admin", "super_admin", "pastor", "secretary"].includes(r),
        )
      )
        throw new RegistrationError(
          403,
          "Você não pode cadastrar membros nesta igreja.",
        );
      const previous = docs.get(name(operationPath));
      if (previous) {
        if (previous.uid !== uid || previous.fingerprint !== fingerprint)
          throw new RegistrationError(
            409,
            "Este pedido já foi usado para outro cadastro.",
          );
        return { ...previous.result, replayed: true };
      }
      if (cpfPath && docs.has(name(cpfPath)))
        throw new RegistrationError(
          409,
          "Já existe um cadastro para este CPF.",
        );
      if (person.cpf) {
        const formatted = person.cpf.replace(
          /(\d{3})(\d{3})(\d{3})(\d{2})/,
          "$1.$2.$3-$4",
        );
        const found = (await call(`/${orgPath}:runQuery`, {
          transaction,
          structuredQuery: {
            from: [{ collectionId: "people" }],
            where: {
              fieldFilter: {
                field: { fieldPath: "cpf" },
                op: "IN",
                value: encode([person.cpf, formatted]),
              },
            },
            limit: 1,
          },
        })) as Data[];
        if (found.some((row) => row.document))
          throw new RegistrationError(
            409,
            "Já existe um cadastro para este CPF.",
          );
      }
      const subscription =
        docs.get(name(`${orgPath}/settings/subscription`)) ?? {};
      const plan: PlanId = Object.hasOwn(PLAN_LIMITS, subscription.plan ?? "")
        ? subscription.plan
        : planTierToPlanId(subscription.planTier);
      if (
        resolveBillingStatus(
          subscription.billingStatus,
          subscription.overdueSince,
        ) === "suspended"
      )
        throw new RegistrationError(
          403,
          "A assinatura desta igreja está suspensa.",
        );
      const aggregate = (await call(`/${orgPath}:runAggregationQuery`, {
        transaction,
        structuredAggregationQuery: {
          structuredQuery: { from: [{ collectionId: "people" }] },
          aggregations: [{ alias: "total", count: {} }],
        },
      })) as Data[];
      const countValue = aggregate.find((row) => row.result)?.result
        ?.aggregateFields?.total?.integerValue;
      const count = Number(countValue);
      if (countValue === undefined || !Number.isSafeInteger(count) || count < 0)
        throw new Error("Contagem inválida.");
      if (count >= PLAN_LIMITS[plan].maxMembers)
        throw new RegistrationError(
          409,
          "Limite de membros do plano atingido. Consulte Configurações → Plano.",
        );
      const personId = `person_${requestId}`,
        familyId = family ? `family_${requestId}` : undefined;
      const memberCardCode = person.partnerBenefitsEnabled
        ? `ESDRAS-${generateSecureCode(24)}`
        : undefined;
      const createdAt = new Date().toISOString();
      const result = { personId, familyId, memberCardCode };
      const create = (path: string, data: Data) => ({
        update: { name: name(path), fields: encode(data).mapValue.fields },
        currentDocument: { exists: false },
      });
      const writes: Data[] = [
        create(`${orgPath}/people/${personId}`, {
          ...person,
          id: personId,
          organizationId,
          primaryFamilyId: familyId,
          memberCardCode,
          consentLgpdAt: consent ? createdAt : undefined,
          status: "active",
          createdAt,
        }),
        create(operationPath, { uid, fingerprint, result, createdAt }),
        {
          update: {
            name: name(orgPath),
            fields: encode({ memberCount: count + 1 }).mapValue.fields,
          },
          updateMask: { fieldPaths: ["memberCount"] },
        },
      ];
      if (family && familyId) {
        writes.push(
          create(`${orgPath}/families/${familyId}`, {
            ...family,
            id: familyId,
            organizationId,
            displayName: family.familyName,
            address: person.address,
            status: "active",
          }),
        );
        writes.push(
          create(
            `${orgPath}/families/${familyId}/members/family_member_${requestId}`,
            {
              ...familyMember,
              id: `family_member_${requestId}`,
              organizationId,
              familyId,
              personId,
            },
          ),
        );
      }
      if (cpfPath) writes.push(create(cpfPath, { personId, createdAt }));
      await call(":commit", { transaction, writes });
      committed = true;
      return result;
    } catch (error) {
      if (
        error instanceof RegistrationError &&
        error.status === 409 &&
        error.message.startsWith("Conflito") &&
        attempt < 4
      )
        continue;
      throw error;
    } finally {
      if (transaction && !committed)
        await call(":rollback", { transaction }).catch(() => {});
    }
  }
  throw new RegistrationError(409, "Cadastro concorrido. Tente novamente.");
}
