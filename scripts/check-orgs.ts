import * as admin from "firebase-admin";
import * as fs from "fs";

const sa = JSON.parse(fs.readFileSync("service-account.json", "utf8"));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });

const db = admin.firestore();

async function main() {
  const orgs = await db.collection("organizations").where("status", "==", "active").get();
  console.log(`Organizations found: ${orgs.size}`);
  orgs.forEach(doc => {
    const data = doc.data();
    console.log(`- ${doc.id}: ${data.displayName || data.name} | ownerUid: ${data.ownerUid}`);
  });
}

main().catch(console.error);
