/** Dados fictícios para capturas reais da LP. Nunca executa em produção. */
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { seedPeople, seedFamilies, seedFamilyMembers, seedGroups, seedOrganizationFeatures } from "./seed-data";

async function run() {
  if (process.env.FIREBASE_PROJECT_ID !== "demo-alvo-qa"
    || process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:8080"
    || process.env.FIREBASE_AUTH_EMULATOR_HOST !== "127.0.0.1:9099") {
    throw new Error("Capturas permitidas somente nos emuladores demo-alvo-qa.");
  }
  const app = initializeApp({ projectId: "demo-alvo-qa" });
  const auth = getAuth(app);
  const db = getFirestore(app);
  const organizationId = "org_lp_capturas";
  const uid = "lp_capturas_admin";
  const email = "demonstracao@example.test";
  const user = { email, password: "Local-LP-2026!", displayName: "Equipe Demonstração", emailVerified: true };
  try { await auth.getUser(uid); }
  catch (error) {
    if ((error as { code?: string }).code !== "auth/user-not-found") throw error;
    await auth.createUser({ uid, ...user });
  }
  await auth.setCustomUserClaims(uid, { organizationId });
  const org = db.collection("organizations").doc(organizationId);
  const batch = db.batch();
  batch.set(org, { id: organizationId, name: "Comunidade Esperança", displayName: "Comunidade Esperança", slug: "comunidade-demonstracao", status: "active", timezone: "America/Belem", locale: "pt-BR", countryCode: "BR", ownerUid: uid, memberCount: seedPeople.length, organizationTier: "solo" });
  batch.set(org.collection("users").doc(uid), { id: uid, organizationId, email, displayName: user.displayName, roles: ["church_admin"], campusIds: [], isActive: true });
  batch.set(org.collection("settings").doc("branding"), { organizationId, brandMode: "co_branded", publicProductName: "Comunidade Esperança", publicShortName: "Esperança", primaryColor: "#d27836", secondaryColor: "#1c2433", accentColor: "#e8dcc7", surfaceColor: "#f7f3ea", textColor: "#1c2433", showPoweredByAlvo: true });
  batch.set(org.collection("settings").doc("subscription"), { organizationId, plan: "pastoral", billingStatus: "active" });
  batch.set(org.collection("settings").doc("features"), { organizationId, modules: seedOrganizationFeatures.modules });
  for (const [collection, rows] of [["people", seedPeople], ["families", seedFamilies], ["familyMembers", seedFamilyMembers], ["groups", seedGroups]] as const) {
    for (const row of rows) {
      const data = JSON.parse(JSON.stringify({ ...row, organizationId }));
      // Não publicar documentos, telefones ou e-mails, mesmo os do seed fictício.
      for (const field of ["cpf", "email", "phone", "mobilePhone", "whatsappPhone", "birthDate", "address", "householdIncomeRange", "incomeRange", "memberCardCode"]) delete data[field];
      batch.set(org.collection(collection).doc(row.id), data);
    }
  }
  const now = new Date();
  const date = now.toISOString();
  const serviceDate = new Date(now.getTime() + ((7 - now.getUTCDay()) % 7 || 7) * 86400000).toISOString().slice(0, 10);
  batch.set(org.collection("serviceTeams").doc("team_reception"), { id: "team_reception", organizationId, code: "reception", name: "Recepção e acolhimento", summary: "Receber pessoas e orientar visitantes.", targetVolunteers: 3, status: "active" });
  for (const [i, person] of seedPeople.entries()) {
    const id = `assignment_demo_${i}`;
    batch.set(org.collection("serviceAssignments").doc(id), { id, organizationId, serviceTeamId: "team_reception", ministryCode: "reception", personId: person.id, role: "Acolhimento", serviceDate, status: i === 0 ? "confirmed" : "pending", createdAt: date, updatedAt: date });
  }
  for (const [i, [label, kind, amount]] of [["Contribuições — demonstração", "income", 1200], ["Manutenção — demonstração", "expense", 350], ["Apoio a missões — demonstração", "missions", 200]].entries()) {
    const id = `finance_demo_${i}`;
    batch.set(org.collection("financialTransactions").doc(id), { id, organizationId, label, kind, amount, status: "posted", date, createdAt: date, createdByUserId: uid });
  }
  await batch.commit();
  console.log("Instituição fictícia preparada exclusivamente nos emuladores.");
  await app.delete();
}
run().catch((error) => { console.error(error.message); process.exitCode = 1; });
