import * as admin from "firebase-admin";
import * as fs from "fs";

const sa = JSON.parse(fs.readFileSync("service-account.json", "utf8"));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });

const auth = admin.auth();

async function main() {
  // Search for user by email
  try {
    const user = await auth.getUserByEmail("contatoalvorecerapp@gmail.com");
    console.log(`User found:`);
    console.log(`  UID: ${user.uid}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Display Name: ${user.displayName}`);
    console.log(`  Created: ${user.metadata.creationTime}`);
    console.log(`  Last Sign In: ${user.metadata.lastSignInTime}`);
  } catch (err: any) {
    console.log(`Error: ${err.message}`);
    if (err.code === "auth/user-not-found") {
      console.log("User not found with this email");
    }
  }
}

main().catch(console.error);
