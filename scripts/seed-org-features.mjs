/**
 * Popula o documento de features da org demo no Firestore.
 * Rodar: node scripts/seed-org-features.mjs
 */
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { readFileSync } from "fs";

const env = Object.fromEntries(
  readFileSync(new URL("../apps/web/.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => l.split("=").map((s) => s.trim()))
);

const app = initializeApp({
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
});

const db = getFirestore(app);
const organizationId = "org_alvo_demo";

const modules = {
  core:          { enabled: true,  source: "plan"   },
  visitors:      { enabled: true,  source: "plan"   },
  groups:        { enabled: true,  source: "plan"   },
  events:        { enabled: true,  source: "plan"   },
  children:      { enabled: true,  source: "manual" },
  youth:         { enabled: true,  source: "addon"  },
  volunteers:    { enabled: true,  source: "addon"  },
  tribes:        { enabled: true,  source: "plan"   },
  journeys:      { enabled: true,  source: "plan"   },
  communication: { enabled: true,  source: "addon"  },
  marketplace:   { enabled: true,  source: "addon"  },
  giving:        { enabled: true,  source: "addon"  },
  publicForms:   { enabled: true,  source: "plan"   },
  finance:       { enabled: true,  source: "addon"  },
  ai:            { enabled: true,  source: "trial", limits: { monthlySuggestions: 500 } },
};

const ref = doc(db, `organizations/${organizationId}/settings/features`);
await setDoc(ref, { organizationId, modules }, { merge: true });

console.log(`✓ Módulos habilitados para ${organizationId}`);
Object.entries(modules).forEach(([k, v]) =>
  console.log(`  ${v.enabled ? "✓" : "✗"} ${k} (${v.source})`)
);
process.exit(0);
