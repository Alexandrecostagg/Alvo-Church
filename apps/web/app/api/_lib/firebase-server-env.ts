// The only unsigned-token/admin emulator bypass is this explicit local demo.
export function isLocalQaFirebase() {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID === "demo-alvo-qa" &&
    process.env.FIRESTORE_EMULATOR_HOST === "127.0.0.1:8080" &&
    process.env.FIREBASE_AUTH_EMULATOR_HOST === "127.0.0.1:9099"
  );
}

export function serverFirestoreDocumentsUrl() {
  const host = isLocalQaFirebase()
    ? "http://127.0.0.1:8080"
    : "https://firestore.googleapis.com";
  const project = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!project || !/^[a-z0-9-]+$/.test(project))
    throw new Error("Projeto Firebase não configurado.");
  return `${host}/v1/projects/${project}/databases/(default)/documents`;
}
