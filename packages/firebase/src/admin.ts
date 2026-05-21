import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function getServiceAccountOrNull() {
  const rawFromEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const rawFromPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  const raw = rawFromEnv ?? (rawFromPath ? require("fs").readFileSync(rawFromPath, "utf8") : null);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    return {
      ...parsed,
      private_key: typeof parsed.private_key === "string" ? parsed.private_key.replace(/\\n/g, "\n") : parsed.private_key
    };
  } catch {
    return null;
  }
}

export function initializeAdmin(projectId?: string) {
  const serviceAccount = getServiceAccountOrNull();

  if (getApps().length === 0) {
    if (serviceAccount) {
      initializeApp({ credential: cert(serviceAccount), projectId: projectId ?? serviceAccount.project_id });
    } else {
      initializeApp({ projectId: projectId ?? process.env.FIREBASE_PROJECT_ID ?? "alvo-church" });
    }
  }

  return getFirestore();
}
