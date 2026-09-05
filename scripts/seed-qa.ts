import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

async function run() {
  if (process.env.FIREBASE_PROJECT_ID !== "demo-alvo-qa"
    || process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:8080"
    || process.env.FIREBASE_AUTH_EMULATOR_HOST !== "127.0.0.1:9099") {
    throw new Error("Este seed só pode rodar nos emuladores demo-alvo-qa.");
  }
  initializeApp({ projectId: "demo-alvo-qa" });
  const auth = getAuth();
  const db = getFirestore();
  const batch = db.batch();
  for (const [suffix, plan] of [["principal", "pastoral"], ["secundaria", "free"]] as const) {
    const organizationId = `org_qa_${suffix}`;
    const uid = `qa_admin_${suffix}`;
    const email = `admin.${suffix}@example.test`;
    const existing = await auth.getUser(uid).catch((error) => {
      if (error.code !== "auth/user-not-found") throw error;
      return null;
    });
    if (!existing) await auth.createUser({ uid, email, password: "Local-QA-2026!", displayName: `QA ${suffix}` });
    await auth.setCustomUserClaims(uid, { organizationId });
    const org = db.doc(`organizations/${organizationId}`);
    batch.set(org, {
      id: organizationId, name: `Igreja QA ${suffix}`, displayName: `Igreja QA ${suffix}`,
      slug: `qa-${suffix}`, status: "active", timezone: "America/Belem", locale: "pt-BR",
      countryCode: "BR", ownerUid: uid, memberCount: 0, organizationTier: "solo",
    }, { merge: true });
    batch.set(org.collection("users").doc(uid), {
      id: uid, organizationId, email, roles: ["church_admin"], campusIds: [], isActive: true,
    });
    batch.set(org.collection("settings").doc("branding"), {
      organizationId, brandMode: "co_branded", publicProductName: `Igreja QA ${suffix}`,
      publicShortName: "QA Local", primaryColor: "#d27836", secondaryColor: "#1c2433",
      accentColor: "#e8dcc7", surfaceColor: "#f7f3ea", textColor: "#1c2433",
      showPoweredByAlvo: true,
    });
    batch.set(org.collection("settings").doc("subscription"), { organizationId, plan, billingStatus: "active" });
    batch.set(org.collection("settings").doc("features"), { organizationId, modules: {} });
  }
  await batch.commit();
  console.log("Igrejas de QA criadas somente nos emuladores.");
}
run().catch((error) => { console.error(error.message); process.exitCode = 1; });
