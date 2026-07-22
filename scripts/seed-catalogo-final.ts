// Substitui o catalogo da Loja de Capacitacao pelos 10 cursos COMPLETOS gerados
// (scripts/catalogo-gerado.json), preservando os professores atribuidos e as capas.
// - Sobrescreve tp_seed_1..tp_seed_10 com os 10 cursos novos (titulo, descricao,
//   aulas com CONTENT). Preserva thumbnailUrl e createdAt do doc existente.
// - Reaplica o instructorName conforme o de-para (PROF por indice).
// - Apaga aulas antigas de cada trilha antes de gravar as novas.
// - Remove tp_seed_11 e tp_seed_12 (e suas aulas) — consolidando em 10.
// Uso: FIREBASE_SERVICE_ACCOUNT_PATH=./service-account.json npm run seed:catalogo-final
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";

interface ServiceAccount { project_id: string; client_email: string; private_key: string }
function getServiceAccount(): ServiceAccount | null {
  if (process.env.FIRESTORE_EMULATOR_HOST) return null;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    ?? (process.env.FIREBASE_SERVICE_ACCOUNT_PATH ? readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH, "utf8") : null);
  if (!raw) throw new Error("Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH.");
  const p = JSON.parse(raw) as ServiceAccount;
  return { ...p, private_key: p.private_key.replace(/\\n/g, "\n") };
}
function getProjectId(sa: ServiceAccount | null) {
  return process.env.FIREBASE_PROJECT_ID ?? sa?.project_id ?? "alvo-church";
}

const PRICE_BRL = 147;
// De-para de professores (indice 0..9 -> nome). Ajustavel.
const PROF = [
  "ELAINE FERNANDES DO NASCIMENTO",      // 1 Forjados para Servir
  "ALEXANDRE GOMES DA COSTA",            // 2 Casas que Transformam
  "ELAINE FERNANDES DO NASCIMENTO",      // 3 Da Porta da Frente ao Coracao
  "ALEXANDRE GOMES DA COSTA",            // 4 Igreja Viva
  "MANOEL PEREIRA GUIMARÃES NETO",       // 5 Fe a Mesa
  "ALEXANDRE GOMES DA COSTA",            // 6 Semear Cidades
  "ALEXANDRE GOMES DA COSTA",            // 7 Raizes Profundas
  "MANOEL PEREIRA GUIMARÃES NETO",       // 8 Equipe que Serve
  "ALEXANDRE GOMES DA COSTA",            // 9 Pastorear o Rebanho
  "ELAINE FERNANDES DO NASCIMENTO",      // 10 Lideres que Geram Lideres
];

interface GenLesson { title: string; durationMinutes?: number; content: string }
interface GenModule { title: string; lessons: GenLesson[] }
interface GenCourse { title: string; description: string; modules: GenModule[] }

async function deleteLessons(db: FirebaseFirestore.Firestore, programId: string) {
  const col = db.collection("platformPrograms").doc(programId).collection("lessons");
  const snap = await col.get();
  let batch = db.batch(); let n = 0;
  for (const d of snap.docs) { batch.delete(d.ref); if (++n % 400 === 0) { await batch.commit(); batch = db.batch(); } }
  if (n % 400 !== 0) await batch.commit();
}

async function run() {
  const sa = getServiceAccount();
  if (getApps().length === 0) {
    initializeApp(sa ? { credential: cert(sa), projectId: getProjectId(sa) } : { projectId: getProjectId(null) });
  }
  const db = getFirestore();
  const nowIso = new Date().toISOString();
  const catalog: GenCourse[] = JSON.parse(readFileSync("scripts/catalogo-gerado.json", "utf8"));
  if (catalog.length !== 10) throw new Error(`Esperado 10 cursos, veio ${catalog.length}`);

  for (let i = 0; i < catalog.length; i++) {
    const c = catalog[i];
    const programId = `tp_seed_${i + 1}`;
    const ref = db.collection("platformPrograms").doc(programId);
    const existing = (await ref.get()).data() || {};

    await ref.set({
      id: programId,
      title: c.title,
      description: c.description,
      priceBRL: PRICE_BRL,
      isPublished: true,
      instructorName: PROF[i],
      ...(existing.thumbnailUrl ? { thumbnailUrl: existing.thumbnailUrl } : {}),
      createdAt: existing.createdAt || nowIso,
      updatedAt: nowIso,
    }, { merge: true });

    await deleteLessons(db, programId);

    let order = 0;
    let batch = db.batch(); let ops = 0;
    for (const m of c.modules) {
      for (const l of m.lessons) {
        const lessonId = `tl_final_${i + 1}_${order + 1}`;
        batch.set(db.collection("platformPrograms").doc(programId).collection("lessons").doc(lessonId), {
          id: lessonId,
          programId,
          moduleId: m.title,
          title: l.title,
          videoUrl: "",
          durationMinutes: Number(l.durationMinutes) || 15,
          sortOrder: order,
          content: l.content,
        }, { merge: true });
        order++;
        if (++ops % 400 === 0) { await batch.commit(); batch = db.batch(); }
      }
    }
    if (ops % 400 !== 0) await batch.commit();
    console.log(`OK ${programId}: ${c.title} — ${order} aulas · prof ${PROF[i]}`);
  }

  // Consolida em 10: remove as 2 trilhas extras (11 e 12) e suas aulas.
  for (const extra of ["tp_seed_11", "tp_seed_12"]) {
    await deleteLessons(db, extra);
    await db.collection("platformPrograms").doc(extra).delete();
    console.log(`Removida trilha extra ${extra}`);
  }

  console.log(`\nCatalogo final semeado em '${getProjectId(sa)}': 10 cursos com material completo, professores preservados. Videos ficam vazios (a gravar).`);
}

run().catch((e: unknown) => { console.error(e); process.exitCode = 1; });
