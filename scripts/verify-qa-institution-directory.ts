import assert from "node:assert/strict";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

if (
  process.env.FIREBASE_PROJECT_ID !== "demo-alvo-qa" ||
  process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:8080" ||
  process.env.FIREBASE_AUTH_EMULATOR_HOST !== "127.0.0.1:9099"
) throw new Error("Somente QA local.");

const app = initializeApp({ projectId: "demo-alvo-qa" });
const auth = getAuth(app);
const db = getFirestore(app);
const uid = "qa_directory_member";
const email = "directory.member@example.test";
const slugs = ["qa-directory-alvorecer", "qa-directory-batista"];
let checks = 0;

async function listDirectory(token?: string) {
  return fetch("http://127.0.0.1:8080/v1/projects/demo-alvo-qa/databases/(default)/documents/org_slugs", {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
}

async function run() {
  await auth.createUser({ uid, email, password: "Local-QA-2026!" }).catch(async (error) => {
    if (error.code !== "auth/uid-already-exists") throw error;
    await auth.updateUser(uid, { email, password: "Local-QA-2026!" });
  });
  await Promise.all([
    db.doc(`org_slugs/${slugs[0]}`).set({ organizationId: "org_qa_alvorecer", displayName: "Igreja Alvorecer" }),
    db.doc(`org_slugs/${slugs[1]}`).set({ organizationId: "org_qa_batista", displayName: "Igreja Batista" }),
  ]);

  const signIn = await fetch("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-alvo-qa-key", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: "Local-QA-2026!", returnSecureToken: true }),
  });
  assert.equal(signIn.status, 200, "login de QA deve funcionar");
  const token = String((await signIn.json()).idToken ?? "");

  const anonymous = await listDirectory();
  assert.equal(anonymous.status, 403, "visitante não lista o diretório");
  checks++;

  const authenticated = await listDirectory(token);
  assert.equal(authenticated.status, 200, "usuário autenticado lista o diretório");
  checks++;
  const data = await authenticated.json() as { documents?: Array<{ name?: string }> };
  const documentNames = (data.documents ?? []).map((document) => document.name ?? "");
  assert.ok(slugs.every((slug) => documentNames.some((name) => name.endsWith(`/org_slugs/${slug}`))), "as instituições cadastradas devem aparecer");
  checks++;

  console.log(`Diretório de instituições: ${checks} verificações passaram.`);
}

run()
  .finally(async () => {
    await Promise.all(slugs.map((slug) => db.doc(`org_slugs/${slug}`).delete().catch(() => {})));
    await auth.deleteUser(uid).catch(() => {});
    await app.delete();
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
