// Deploy das Firestore rules via Firebase Rules REST API usando o
// service-account.json — bypassa o `firebase login` interativo (útil quando o
// token do CLI expira). Cria um ruleset novo e aponta o release
// `cloud.firestore` para ele.
//
//   GOOGLE_APPLICATION_CREDENTIALS não é necessário; lemos o SA direto.
//   Uso: tsx scripts/deploy-firestore-rules.ts

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import admin from "firebase-admin";

async function main() {
  const saPath = resolve(process.cwd(), "service-account.json");
  const sa = JSON.parse(readFileSync(saPath, "utf8"));
  const projectId: string = sa.project_id;
  const rulesText = readFileSync(resolve(process.cwd(), "firestore.rules"), "utf8");

  const app = admin.initializeApp({ credential: admin.credential.cert(sa) });
  const tokenObj = await app.options.credential!.getAccessToken();
  const token = tokenObj.access_token;
  const base = `https://firebaserules.googleapis.com/v1/projects/${projectId}`;
  const authHeaders = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  // 1 — cria o ruleset com o conteúdo atual do firestore.rules
  const rsRes = await fetch(`${base}/rulesets`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ source: { files: [{ name: "firestore.rules", content: rulesText }] } }),
  });
  const rs = (await rsRes.json()) as { name?: string; error?: unknown };
  if (!rsRes.ok || !rs.name) throw new Error(`create ruleset falhou: ${JSON.stringify(rs)}`);
  const rulesetName = rs.name; // projects/{p}/rulesets/{id}
  console.log("✔ ruleset criado:", rulesetName);

  // 2 — aponta o release cloud.firestore para o novo ruleset. Se já existe,
  // é PATCH; senão, POST.
  const relName = `projects/${projectId}/releases/cloud.firestore`;
  const getRes = await fetch(`${base}/releases/cloud.firestore`, { headers: authHeaders });
  const exists = getRes.ok;

  const relRes = await fetch(
    exists ? `${base}/releases/cloud.firestore` : `${base}/releases`,
    {
      method: exists ? "PATCH" : "POST",
      headers: authHeaders,
      body: JSON.stringify(
        exists
          ? { release: { name: relName, rulesetName } }
          : { name: relName, rulesetName }
      ),
    }
  );
  const rel = (await relRes.json()) as Record<string, unknown>;
  if (!relRes.ok) throw new Error(`release (${exists ? "PATCH" : "POST"}) falhou: ${JSON.stringify(rel)}`);
  console.log(`✔ release cloud.firestore -> ${rel.rulesetName ?? rulesetName}`);
  console.log("✅ Firestore rules deployadas com sucesso.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error("❌", e instanceof Error ? e.message : e); process.exit(1); });
