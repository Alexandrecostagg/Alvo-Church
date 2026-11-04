import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, updateDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBe9StFXtahsJb_AMSMNLrvdOImi9YRBu4",
  authDomain: "alvo-church.firebaseapp.com",
  projectId: "alvo-church",
  storageBucket: "alvo-church.firebasestorage.app",
  messagingSenderId: "616327426236",
  appId: "1:616327426236:web:8b3e265426a5d00ce120b9"
};

if (getApps().length === 0) {
  initializeApp(firebaseConfig);
}

const db = getFirestore();

const GRATUITO_MODULES = {
  core: { enabled: true, source: "plan" as const },
  visitors: { enabled: true, source: "plan" as const },
  groups: { enabled: true, source: "plan" as const },
  events: { enabled: true, source: "plan" as const },
  children: { enabled: false, source: "manual" as const },
  youth: { enabled: false, source: "addon" as const },
  volunteers: { enabled: false, source: "addon" as const },
  tribes: { enabled: false, source: "plan" as const },
  journeys: { enabled: false, source: "plan" as const },
  communication: { enabled: false, source: "addon" as const },
  marketplace: { enabled: false, source: "addon" as const },
  giving: { enabled: false, source: "addon" as const },
  publicForms: { enabled: true, source: "plan" as const },
  finance: { enabled: false, source: "addon" as const },
  ai: { enabled: false, source: "trial" as const }
};

async function updateOrganizationFeatures() {
  const orgsRef = collection(db, "organizations");
  const q = query(orgsRef, where("status", "==", "active"));
  const snapshot = await getDocs(q);

  console.log(`Found ${snapshot.size} active organizations`);

  for (const doc of snapshot.docs) {
    const orgId = doc.id;
    const orgData = doc.data();
    
    console.log(`\nUpdating ${orgId} (${orgData.displayName || orgData.name})...`);
    
    const featuresRef = collection(db, "organizations", orgId, "settings", "features");
    // Try both paths: settings/features and settings/features/settings
    let featuresDocRef;
    try {
      featuresDocRef = await getDocs(featuresRef);
      if (featuresDocRef.size > 0) {
        const featuresDoc = featuresDocRef.docs[0];
        await updateDoc(featuresDoc.ref, { modules: GRATUITO_MODULES });
        console.log(`  ✓ Updated features (path: settings/features)`);
      } else {
        // Try direct path
        const directRef = db.collection("organizations").doc(orgId).collection("features");
        const directDoc = await getDocs(directRef);
        if (directDoc.size > 0) {
          const directFeaturesDoc = directDoc.docs[0];
          await updateDoc(directFeaturesDoc.ref, { modules: GRATUITO_MODULES });
          console.log(`  ✓ Updated features (path: features)`);
        } else {
          console.log(`  ⚠ No features document found`);
        }
      }
    } catch (err) {
      console.log(`  ⚠ Error updating features: ${err}`);
    }
  }

  console.log("\n✅ Update complete");
}

updateOrganizationFeatures().catch(console.error);
