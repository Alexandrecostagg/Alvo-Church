// Seed FOCADO da Loja de Capacitação: grava SOMENTE o catálogo global de
// trilhas da Plataforma Esdras (coleção top-level platformPrograms/ + /lessons).
// Diferente de seed-firebase.ts, NÃO toca em nenhuma organização/pessoa — seguro
// para rodar contra produção só para popular/atualizar o catálogo.
//
// Uso (produção):
//   FIREBASE_SERVICE_ACCOUNT_PATH=./service-account.json npm run seed:capacitacao
// ou emulador local:
//   FIRESTORE_EMULATOR_HOST=localhost:8080 FIREBASE_PROJECT_ID=alvo-church npm run seed:capacitacao
//
// Reusa a MESMA fonte que a UI semeia (mock-data), então os 12 cursos/46 aulas
// não ficam duplicados: editou lá, roda aqui.
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";
import { MOCK_TRAINING_PROGRAMS, MOCK_TRAINING_LESSONS } from "../apps/web/src/lib/mock-data";

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

function getServiceAccount(): ServiceAccount | null {
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    return null;
  }
  const rawFromEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const rawFromPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
    ? readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH, "utf8")
    : null;
  const raw = rawFromEnv ?? rawFromPath;
  if (!raw) {
    throw new Error(
      "Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH (or use FIRESTORE_EMULATOR_HOST)."
    );
  }
  const parsed = JSON.parse(raw) as ServiceAccount;
  return {
    ...parsed,
    private_key: parsed.private_key.replace(/\\n/g, "\n")
  };
}

function getProjectId(serviceAccount: ServiceAccount | null) {
  return process.env.FIREBASE_PROJECT_ID ?? serviceAccount?.project_id ?? "alvo-church";
}

async function run() {
  const serviceAccount = getServiceAccount();

  if (getApps().length === 0) {
    if (serviceAccount) {
      initializeApp({ credential: cert(serviceAccount), projectId: getProjectId(serviceAccount) });
    } else {
      initializeApp({ projectId: getProjectId(null) });
    }
  }

  const firestore = getFirestore();
  const batch = firestore.batch();

  for (const program of MOCK_TRAINING_PROGRAMS) {
    const programRef = firestore.collection("platformPrograms").doc(program.id);
    batch.set(programRef, program, { merge: true });
  }

  for (const lesson of MOCK_TRAINING_LESSONS) {
    const lessonRef = firestore
      .collection("platformPrograms")
      .doc(lesson.programId)
      .collection("lessons")
      .doc(lesson.id);
    batch.set(lessonRef, lesson, { merge: true });
  }

  await batch.commit();

  console.log(
    `Catalogo Capacitacao semeado em '${getProjectId(serviceAccount)}': ${MOCK_TRAINING_PROGRAMS.length} trilhas + ${MOCK_TRAINING_LESSONS.length} aulas em platformPrograms/.`
  );
}

run().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
