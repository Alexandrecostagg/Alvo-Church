// Course-only backup/removal. Restore always creates drafts; never republishes.
// node scripts/course-archive.mjs backup|archive|restore-drafts|verify <folder>
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import admin from "firebase-admin";

const PROJECT = "alvo-church";
const PREFIX = `projects/${PROJECT}/databases/(default)/documents/`;
const rootPattern = /^(organizations\/[^/]+\/courses\/[^/]+|platformPrograms\/[^/]+)$/;
export const digest = value => createHash("sha256").update(value).digest("hex");

export function validateBackup(backup) {
  if (backup.project !== PROJECT || backup.version !== 1 || !Array.isArray(backup.roots) || !Array.isArray(backup.documents)) throw Error("Formato de backup inválido");
  if (!backup.roots.length || backup.roots.some(root => !rootPattern.test(root)) || new Set(backup.roots).size !== backup.roots.length) throw Error("Escopo de cursos inválido");
  if (!backup.documents.length || backup.documents.length > 450) throw Error("Backup excede o limite de uma operação atômica (450 documentos)");
  const paths = new Set();
  for (const doc of backup.documents) {
    if (typeof doc.name !== "string" || !doc.name.startsWith(PREFIX) || !doc.updateTime || !doc.fields || typeof doc.fields !== "object") throw Error("Documento inválido");
    const path = doc.name.slice(PREFIX.length);
    if (!backup.roots.some(root => path === root || path.startsWith(root + "/")) || paths.has(path)) throw Error("Documento fora do escopo ou duplicado");
    paths.add(path);
  }
  if (backup.roots.some(root => !paths.has(root))) throw Error("Raiz de curso ausente no backup");
  return backup;
}

export function restoreWrites(backup) {
  validateBackup(backup);
  return backup.documents.map(doc => {
    const path = doc.name.slice(PREFIX.length);
    const fields = { ...doc.fields };
    if (backup.roots.includes(path)) fields[path.startsWith("platformPrograms/") ? "isPublished" : "isActive"] = { booleanValue: false };
    return { update: { name: doc.name, fields }, currentDocument: { exists: false } };
  });
}

async function run() {
  const [mode, folderArg] = process.argv.slice(2);
  if (!["backup", "archive", "restore-drafts", "verify"].includes(mode) || !folderArg) throw Error("Use backup|archive|restore-drafts|verify <pasta>");
  if (process.env.FIRESTORE_EMULATOR_HOST) throw Error("Remova FIRESTORE_EMULATOR_HOST; este arquivo é exclusivo do projeto alvo-church");
  const folder = resolve(folderArg);
  let backup;
  if (mode !== "backup") {
    const bytes = await readFile(resolve(folder, "courses.json"));
    const hash = (await readFile(resolve(folder, "courses.sha256"), "utf8")).trim();
    if (digest(bytes) !== hash) throw Error("Checksum do backup não confere; nenhuma alteração executada");
    backup = validateBackup(JSON.parse(bytes));
  }
  const sa = JSON.parse(await readFile(resolve("service-account.json"), "utf8"));
  if (sa.project_id !== PROJECT) throw Error("Credencial pertence a outro projeto");
  const app = admin.initializeApp({ credential: admin.credential.cert(sa) });
  try {
    const token = (await app.options.credential.getAccessToken()).access_token;
    const base = `https://firestore.googleapis.com/v1/${PREFIX.slice(0, -1)}`;
    const api = async (suffix, body) => {
      const response = await fetch(base + suffix, { method: body ? "POST" : "GET", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw Error(`Firestore HTTP ${response.status}; operação ${mode} interrompida`);
      return response.json();
    };
    const db = admin.firestore(app);
    const catalog = async () => {
      const [courses, programs] = await Promise.all([db.collectionGroup("courses").limit(451).get(), db.collection("platformPrograms").limit(451).get()]);
      const roots = [...courses.docs, ...programs.docs].map(doc => doc.ref.path).sort();
      if (roots.some(root => !rootPattern.test(root)) || roots.length > 450) throw Error("Catálogo fora do escopo esperado");
      return roots;
    };
    const collect = async roots => {
      const documents = [];
      async function visit(path) {
        if (documents.length >= 450) throw Error("Limite de 450 documentos excedido; nada removido");
        documents.push(await api("/" + path));
        let token;
        do {
          const collections = await api("/" + path + ":listCollectionIds", { pageSize: 100, ...(token ? { pageToken: token } : {}) });
          for (const id of collections.collectionIds ?? []) {
            let page;
            do {
              const result = await api("/" + path + "/" + encodeURIComponent(id) + "?pageSize=100" + (page ? "&pageToken=" + encodeURIComponent(page) : ""));
              for (const doc of result.documents ?? []) await visit(doc.name.slice(PREFIX.length));
              page = result.nextPageToken;
            } while (page);
          }
          token = collections.nextPageToken;
        } while (token);
      }
      for (const root of roots) await visit(root);
      return documents.sort((a, b) => a.name.localeCompare(b.name));
    };
    if (mode === "backup") {
      const roots = await catalog();
      backup = validateBackup({ version: 1, project: PROJECT, createdAt: new Date().toISOString(), roots, documents: await collect(roots) });
      const content = JSON.stringify(backup, null, 2) + "\n";
      await mkdir(folder, { recursive: true, mode: 0o700 });
      await writeFile(resolve(folder, "courses.json"), content, { flag: "wx", mode: 0o600 });
      await writeFile(resolve(folder, "courses.sha256"), digest(content) + "\n", { flag: "wx", mode: 0o600 });
      if (digest(await readFile(resolve(folder, "courses.json"))) !== digest(content)) throw Error("Falha na verificação do arquivo salvo");
      console.log(JSON.stringify({ mode, folder, courses: roots.length, documents: backup.documents.length, sha256: digest(content) }));
    } else if (mode === "archive") {
      const roots = await catalog();
      if (JSON.stringify(roots) !== JSON.stringify([...backup.roots].sort())) throw Error("Catálogo mudou desde o backup; faça outra cópia");
      const current = await collect(roots);
      const revision = docs => docs.map(doc => [doc.name, doc.updateTime]).sort((a, b) => a[0].localeCompare(b[0]));
      if (JSON.stringify(revision(current)) !== JSON.stringify(revision(backup.documents))) throw Error("Conteúdo mudou desde o backup; nada removido");
      // One atomic commit, with revision preconditions: preserve concurrent edits.
      await api(":commit", { writes: backup.documents.map(doc => ({ delete: doc.name, currentDocument: { updateTime: doc.updateTime } })) });
      await writeFile(resolve(folder, "archived.json"), JSON.stringify({ archivedAt: new Date().toISOString(), courses: roots.length, documents: current.length }) + "\n", { mode: 0o600 });
      console.log(JSON.stringify({ mode, courses: roots.length, documents: current.length, remainingCourses: (await catalog()).length }));
    } else if (mode === "restore-drafts") {
      // This never overwrites existing documents, nor changes student progress.
      await api(":commit", { writes: restoreWrites(backup) });
      console.log(JSON.stringify({ mode, courses: backup.roots.length, documents: backup.documents.length, published: false }));
    } else {
      const rows = await db.getAll(...backup.documents.map(doc => db.doc(doc.name.slice(PREFIX.length))));
      console.log(JSON.stringify({ mode, checksum: "valid", archivedDocumentsStillPresent: rows.filter(doc => doc.exists).length, remainingCourses: (await catalog()).length }));
    }
  } finally { await app.delete(); }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) run().catch(error => { console.error(error.message); process.exitCode = 1; });
