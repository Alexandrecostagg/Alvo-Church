import * as admin from "firebase-admin";
import * as fs from "fs";

const sa = JSON.parse(fs.readFileSync("service-account.json", "utf8"));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });

const db = admin.firestore();

async function main() {
  const orgId = "org_1-igreja-alvorecer-de-maraba_ZrVlO6";
  
  // Check features settings
  const featuresDoc = await db.collection("organizations")
    .doc(orgId)
    .collection("settings")
    .doc("features")
    .get();
  
  if (featuresDoc.exists) {
    const data = featuresDoc.data();
    console.log(`Features for ${orgId}:`);
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log(`Features document not found`);
  }
  
  // Check subscription
  const subDoc = await db.collection("organizations")
    .doc(orgId)
    .collection("settings")
    .doc("subscription")
    .get();
  
  if (subDoc.exists) {
    const data = subDoc.data();
    console.log(`\nSubscription:`);
    console.log(JSON.stringify(data, null, 2));
  }
}

main().catch(console.error);
