import * as admin from "firebase-admin";
import * as fs from "fs";

const sa = JSON.parse(fs.readFileSync("service-account.json", "utf8"));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });

const auth = admin.auth();
const db = admin.firestore();

async function main() {
  const uid = "ZrVlO6rTJQX2ZfQtLCOZe5MSRho1";
  
  // Update password
  try {
    await auth.updateUser(uid, {
      password: "Alvorecer1@"
    });
    console.log("Password updated to Alvorecer1@");
  } catch (err: any) {
    console.log(`Error updating password: ${err.message}`);
  }
  
  // Check user's organizations
  const orgs = await db.collection("organizations")
    .where("ownerUid", "==", uid)
    .get();
  
  console.log(`\nOrganizations for user ${uid}:`);
  orgs.forEach(doc => {
    const data = doc.data();
    console.log(`- ${doc.id}: ${data.displayName || data.name}`);
  });
}

main().catch(console.error);
