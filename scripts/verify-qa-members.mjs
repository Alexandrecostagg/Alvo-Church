import assert from "node:assert/strict";

if (process.env.FIREBASE_PROJECT_ID !== "demo-alvo-qa"
  || process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:8080"
  || process.env.FIREBASE_AUTH_EMULATOR_HOST !== "127.0.0.1:9099") {
  throw new Error("Esta verificação só pode rodar nos emuladores demo-alvo-qa.");
}

const base = "http://127.0.0.1:8080/v1/projects/demo-alvo-qa/databases/(default)/documents";
async function signIn(suffix) {
  const response = await fetch("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-alvo-qa-key", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: `admin.${suffix}@example.test`, password: "Local-QA-2026!", returnSecureToken: true }),
  });
  assert.equal(response.status, 200, `Login de QA ${suffix}`);
  return (await response.json()).idToken;
}
function read(path, token) {
  return fetch(`${base}/${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
}
function decode(value) {
  if (value.mapValue) return Object.fromEntries(Object.entries(value.mapValue.fields ?? {}).map(([key, field]) => [key, decode(field)]));
  if (value.arrayValue) return (value.arrayValue.values ?? []).map(decode);
  return value.stringValue ?? value.booleanValue ?? value.integerValue ?? value.nullValue;
}

const primary = await signIn("principal");
const secondary = await signIn("secundaria");
const peopleResponse = await read("organizations/org_qa_principal/people", primary);
assert.equal(peopleResponse.status, 200);
const people = (await peopleResponse.json()).documents ?? [];
const matching = people.map((doc) => decode({ mapValue: { fields: doc.fields } })).filter((person) => person.cpf === "52998224725");
assert.equal(matching.length, 1, "Cadastre uma única Pessoa QA Homologação conforme o roteiro; a tentativa duplicada não deve criar outra pessoa.");
const person = matching[0];
assert.equal(person.birthDate, "2000-02-29");
assert.equal(person.organizationId, "org_qa_principal");
assert.equal(person.address.city, "São Paulo");
assert.equal(person.address.state, "SP");
assert.equal(person.partnerBenefitsEnabled, false);
assert.ok(!person.consentLgpdAt && !person.memberCardCode, "Consentimento e passe não podem ser inventados.");
assert.ok(person.primaryFamilyId);
const familyResponse = await read(`organizations/org_qa_principal/families/${person.primaryFamilyId}`, primary);
assert.equal(familyResponse.status, 200);
assert.equal(decode({ mapValue: { fields: (await familyResponse.json()).fields } }).familyName, "Família QA Local");

const foreignRead = await read(`organizations/org_qa_principal/people/${person.id}`, secondary);
assert.equal(foreignRead.status, 403, "A segunda igreja não pode ler o membro da primeira.");
const anonymousRead = await read(`organizations/org_qa_principal/people/${person.id}`, "");
assert.ok([401, 403].includes(anonymousRead.status), "A ficha exige autenticação.");
const ownSecondary = await read("organizations/org_qa_secundaria/people", secondary);
assert.equal(ownSecondary.status, 200);
assert.equal(((await ownSecondary.json()).documents ?? []).length, 0);
console.log("QA OK: cadastro único, nascimento, endereço, família, consentimento, passe e isolamento de leitura entre igrejas.");
