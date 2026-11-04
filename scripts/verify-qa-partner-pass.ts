import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { PLAN_LIMITS } from "@alvo/firebase";

if (
  process.env.FIREBASE_PROJECT_ID !== "demo-alvo-qa" ||
  process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:8080" ||
  process.env.FIREBASE_AUTH_EMULATOR_HOST !== "127.0.0.1:9099"
)
  throw new Error("Somente emuladores locais de QA.");
initializeApp({ projectId: "demo-alvo-qa" });
const db = getFirestore();
const orgId = `org_qa_partner_pass_${randomUUID()}`;
const org = db.doc(`organizations/${orgId}`);
const ownerUid = "qa_admin_principal",
  memberUid = "qa_admin_secundaria";
const ownerPersonId = "person_owner",
  memberPersonId = "person_member";
const partnerId = "partner_owned",
  benefitId = "benefit_active";
const memberCode = "ESDRAS-PARTNER-VALIDATION-2026";
let checks = 0;
function equal(actual: unknown, expected: unknown, label: string) {
  assert.deepEqual(actual, expected, label);
  checks++;
}
async function signIn(suffix: string) {
  const response = await fetch(
    "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-alvo-qa-key",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: `admin.${suffix}@example.test`,
        password: "Local-QA-2026!",
        returnSecureToken: true,
      }),
    },
  );
  equal(response.status, 200, "Conta de QA autenticada");
  return (await response.json()).idToken as string;
}
async function api(token: string | undefined, body?: Record<string, unknown>) {
  const response = await fetch(
    `http://127.0.0.1:3001/api/members/pass/validate${body ? "" : `?organizationId=${orgId}`}`,
    {
      method: body ? "POST" : "GET",
      headers: {
        "content-type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    },
  );
  equal(
    response.headers.get("cache-control"),
    "private, no-store",
    "Resposta privada",
  );
  return { status: response.status, data: await response.json() };
}
async function direct(path: string, token: string, method = "GET") {
  return fetch(
    `http://127.0.0.1:8080/v1/projects/demo-alvo-qa/databases/(default)/documents/${org.path}/${path}`,
    {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      ...(method === "PATCH"
        ? {
            body: JSON.stringify({
              fields: { validationStatus: { stringValue: "approved" } },
            }),
          }
        : {}),
    },
  );
}
const request = (
  requestId = randomUUID(),
  code = memberCode,
  partner = partnerId,
  benefit = benefitId,
) => ({
  organizationId: orgId,
  partnerId: partner,
  benefitId: benefit,
  requestId,
  memberCardCode: code,
});

async function run() {
  const ownerToken = await signIn("principal"),
    memberToken = await signIn("secundaria");
  const person = {
    organizationId: orgId,
    status: "active",
    firstName: "Maria",
    lastName: "Membro",
    partnerBenefitsEnabled: true,
    consentLgpdAt: "2026-09-12T12:00:00.000Z",
    memberCardCode: memberCode,
    cpf: "52998224725",
    address: { city: "Privado" },
  };
  await org.set({ id: orgId, name: "Igreja QA", status: "active" });
  await org
    .collection("settings")
    .doc("features")
    .set({ modules: { marketplace: { enabled: true } } });
  await org
    .collection("settings")
    .doc("subscription")
    .set({ plan: "pastoral", billingStatus: "active" });
  await org
    .collection("users")
    .doc(ownerUid)
    .set({
      organizationId: orgId,
      isActive: true,
      roles: ["member"],
      personId: ownerPersonId,
    });
  await org
    .collection("users")
    .doc(memberUid)
    .set({
      organizationId: orgId,
      isActive: true,
      roles: ["member"],
      personId: memberPersonId,
    });
  await org
    .collection("people")
    .doc(ownerPersonId)
    .set({
      ...person,
      id: ownerPersonId,
      firstName: "José",
      lastName: "Parceiro",
      memberCardCode: "ESDRAS-OWNER-VALIDATION-2026",
    });
  await org
    .collection("people")
    .doc(memberPersonId)
    .set({ ...person, id: memberPersonId });
  for (const [uid, personId] of [
    [ownerUid, ownerPersonId],
    [memberUid, memberPersonId],
  ]) {
    await org
      .collection("memberAccountLinks")
      .doc(uid)
      .set({ organizationId: orgId, userId: uid, personId, verifiedBy: "qa" });
    await org
      .collection("memberAccountClaims")
      .doc(personId)
      .set({ organizationId: orgId, userId: uid, personId });
  }
  await org.collection("partners").doc(partnerId).set({
    id: partnerId,
    organizationId: orgId,
    ownerPersonId,
    name: "Farmácia Parceira",
    status: "active",
    category: "health",
    isMemberBusiness: true,
  });
  await org.collection("partnerBenefits").doc(benefitId).set({
    id: benefitId,
    organizationId: orgId,
    partnerId,
    title: "Desconto saúde",
    discountLabel: "10%",
    status: "active",
    verificationMode: "qr_code",
    validUntil: "2027-12-31T23:59:59.000Z",
  });

  equal(
    PLAN_LIMITS.free.maxMembers,
    50,
    "Plano gratuito continua limitado a 50 membros",
  );
  equal((await api(undefined)).status, 401, "Sem autenticação");
  await org.collection("settings").doc("subscription").update({ plan: "free" });
  equal(
    (await api(ownerToken)).status,
    403,
    "Plano sem Marketplace não abre o validador",
  );
  await org
    .collection("settings")
    .doc("subscription")
    .update({ plan: "pastoral" });
  equal(
    (await api(memberToken)).status,
    200,
    "Membro vinculado consulta contexto vazio sem acessar outro parceiro",
  );
  equal(
    (await api(memberToken)).data.partners,
    [],
    "Parceiro alheio não aparece",
  );
  const context = await api(ownerToken);
  equal(context.status, 200, "Responsável abre área do parceiro");
  equal(
    context.data.partners[0].benefits[0].id,
    benefitId,
    "Somente benefício ativo é oferecido",
  );
  equal(
    (await api(memberToken, request())).status,
    403,
    "Outro membro não valida pelo parceiro",
  );
  equal(
    (await api(ownerToken, request(randomUUID(), "CODIGO-INEXISTENTE"))).status,
    404,
    "Código desconhecido recebe resposta genérica",
  );
  await org
    .collection("people")
    .doc("duplicate")
    .set({ ...person, id: "duplicate" });
  equal(
    (await api(ownerToken, request())).status,
    404,
    "Código duplicado nunca aprova",
  );
  await org.collection("people").doc("duplicate").delete();
  await org
    .collection("people")
    .doc(memberPersonId)
    .update({ partnerBenefitsEnabled: false });
  equal(
    (await api(ownerToken, request())).status,
    404,
    "Consentimento de benefício revogado interrompe validação",
  );
  await org
    .collection("people")
    .doc(memberPersonId)
    .set({ ...person, id: memberPersonId });
  equal(
    (
      await api(
        ownerToken,
        request(randomUUID(), "ESDRAS-OWNER-VALIDATION-2026"),
      )
    ).status,
    409,
    "Responsável não valida o próprio Passe",
  );
  await org
    .collection("partnerBenefits")
    .doc(benefitId)
    .update({ status: "paused" });
  equal(
    (await api(ownerToken, request())).status,
    409,
    "Benefício pausado é recusado",
  );
  await org
    .collection("partnerBenefits")
    .doc(benefitId)
    .update({ status: "active" });
  const validationId = randomUUID();
  const approved = await api(ownerToken, request(validationId));
  equal(approved.status, 200, "Passe elegível aprovado");
  equal(
    Object.keys(approved.data).sort(),
    ["benefit", "member", "replayed", "status", "validatedAt"],
    "Resposta não expõe cadastro sensível",
  );
  equal(
    approved.data.member,
    { name: "Maria" },
    "Parceiro recebe somente primeiro nome",
  );
  const stored = (
    await org.collection("memberBenefitValidations").doc(validationId).get()
  ).data()!;
  equal(
    stored.memberCardCode,
    undefined,
    "Código completo não fica no histórico",
  );
  equal(
    stored.memberCardCodeSuffix,
    "2026",
    "Histórico guarda somente sufixo operacional",
  );
  equal(stored.cpf, undefined, "Histórico não copia CPF");
  equal(
    (await api(ownerToken, request(validationId))).data.replayed,
    true,
    "Repetição idempotente",
  );
  equal(
    (await api(ownerToken, request(validationId, "ESDRAS-OUTRO-CODIGO-2026")))
      .status,
    409,
    "Tentativa não pode ser reutilizada com outro código",
  );
  equal(
    (
      await direct(
        `memberBenefitValidations/${validationId}`,
        ownerToken,
        "PATCH",
      )
    ).status,
    403,
    "Nem admin forja validação diretamente",
  );
  equal(
    (await direct(`partnerBenefitRateLimits/${partnerId}_day`, memberToken))
      .status,
    403,
    "Contador antiabuso é privado",
  );
  equal(
    (await direct(`partnerBenefitAudit/forged`, ownerToken, "PATCH")).status,
    403,
    "Auditoria é exclusiva do servidor",
  );
  equal(
    (await org.collection("people").get()).size,
    2,
    "Validar Passe não cria pessoas e não contorna o limite de membros",
  );
  console.log(
    `QA Parceiro/Passe OK: ${checks} verificações; vínculo, benefício, privacidade, idempotência, antiabuso e limite de 50 membros.`,
  );
}
run()
  .finally(() => db.recursiveDelete(org))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
