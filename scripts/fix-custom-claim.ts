import * as admin from "firebase-admin";
import * as fs from "fs";

const sa = JSON.parse(fs.readFileSync("service-account.json", "utf8"));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });

const auth = admin.auth();

async function main() {
  const uid = "ZrVlO6rTJQX2ZfQtLCOZe5MSRho1";
  
  try {
    const user = await auth.getUser(uid);
    console.log(`User UID: ${user.uid}`);
    console.log(`Email: ${user.email}`);
    console.log(`Custom Claims:`, JSON.stringify(user.customClaims, null, 2));
    
    // Update custom claim to point to the correct organization
    const newClaims = {
      ...user.customClaims,
      organizationId: "org_1-igreja-alvorecer-de-maraba_ZrVlO6"
    };
    
    await auth.setCustomUserClaims(uid, newClaims);
    console.log("\n✅ Custom claim updated to org_1-igreja-alvorecer-de-maraba_ZrVlO6");
  } catch (err: any) {
    console.log(`Error: ${err.message}`);
  }
}

main().catch(console.error);
