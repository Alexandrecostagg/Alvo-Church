import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";

const SERVICE_ACCOUNT_PATH = path.join(__dirname, "../service-account.json");

if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error("Service account file not found at:", SERVICE_ACCOUNT_PATH);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, "utf8"));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

const GRATUITO_MODULES = {
  core: { enabled: true, source: "plan" },
  visitors: { enabled: true, source: "plan" },
  groups: { enabled: true, source: "plan" },
  events: { enabled: true, source: "plan" },
  children: { enabled: false, source: "manual" },
  youth: { enabled: false, source: "addon" },
  volunteers: { enabled: false, source: "addon" },
  tribes: { enabled: false, source: "plan" },
  journeys: { enabled: false, source: "plan" },
  communication: { enabled: false, source: "addon" },
  marketplace: { enabled: false, source: "addon" },
  giving: { enabled: false, source: "addon" },
  publicForms: { enabled: true, source: "plan" },
  finance: { enabled: false, source: "addon" },
  ai: { enabled: false, source: "trial" }
};

async function updateOrganizationFeatures(orgId: string) {
  const orgDocRef = db.collection("organizations").doc(orgId);
  
  const orgDoc = await orgDocRef.get();
  if (!orgDoc.exists) {
    console.log(`  ⚠ Organization ${orgId} not found`);
    return false;
  }

  const orgData = orgDoc.data();
  console.log(`  Name: ${orgData.displayName || orgData.name || orgId}`);
  console.log(`  Status: ${orgData.status}`);

  if (orgData.status !== "active") {
    console.log(`  Skipping inactive organization`);
    return false;
  }

  const settingsRef = orgDocRef.collection("settings");
  const featuresDocRef = await settingsRef.doc("features").get();

  if (!featuresDocRef.exists) {
    console.log(`  ⚠ Features document not found, creating...`);
    await settingsRef.doc("features").set({ modules: GRATUITO_MODULES });
    console.log(`  ✓ Created features with gratuito modules`);
    return true;
  }

  const currentModules = featuresDocRef.data()?.modules || {};
  const hasPaidModules = Object.values(currentModules).some(
    (mod: any) => mod.enabled && 
    ["journeys", "finance", "volunteers", "ai", "tribes", "marketplace", "giving"].includes(
      Object.keys(currentModules).find(k => currentModules[k] === mod) || ""
    )
  );

  if (!hasPaidModules) {
    console.log(`  ✓ Already has correct modules`);
    return false;
  }

  await featuresDocRef.ref.update({ modules: GRATUITO_MODULES });
  console.log(`  ✓ Updated modules to gratuito plan`);
  return true;
}

async function main() {
  console.log("=== Updating Organizations to Gratuito Plan ===\n");

  const orgsSnapshot = await db.collection("organizations")
    .where("status", "==", "active")
    .get();

  console.log(`Found ${orgsSnapshot.size} active organizations\n`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const doc of orgsSnapshot.docs) {
    const orgId = doc.id;
    try {
      const result = await updateOrganizationFeatures(orgId);
      if (result) updated++;
      else skipped++;
    } catch (err) {
      console.log(`  ✗ Error: ${err}`);
      errors++;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);
  console.log(`\n✅ Done`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
