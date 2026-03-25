"use client";

import {
  createFirebaseWebRuntimeConfigFromEnv,
  getMissingFirebaseWebRuntimeConfigFields
} from "@alvo/firebase";
import { useAppAuth } from "./providers";

export function AuthStatusCard() {
  const { configured, firebaseReady, user } = useAppAuth();
  const firebaseConfig = createFirebaseWebRuntimeConfigFromEnv({
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
  });
  const missingFields = getMissingFirebaseWebRuntimeConfigFields(firebaseConfig);

  if (!configured) {
    return (
      <article
        style={{
          padding: 20,
          borderRadius: 20,
          background: "#fff7ec",
          border: "1px solid rgba(196, 106, 45, 0.28)"
        }}
      >
        <strong>Firebase ainda nao configurado</strong>
        <p style={{ margin: "8px 0 0", lineHeight: 1.6 }}>
          Defina as variaveis em <code>.env.local</code> para ativar autenticacao real.
        </p>
        <p style={{ margin: "10px 0 0", lineHeight: 1.6 }}>
          Faltando agora:{" "}
          <code>{missingFields.map(toEnvVariableName).join(", ") || "nenhuma"}</code>
        </p>
        <p style={{ margin: "10px 0 0", lineHeight: 1.6 }}>
          No Firebase Console, registre o app web em
          {" "}
          <code>Configuracoes do projeto &gt; Seus aplicativos</code>
          {" "}
          para copiar <code>apiKey</code> e <code>appId</code>.
        </p>
      </article>
    );
  }

  return (
    <article
      style={{
        padding: 20,
        borderRadius: 20,
        background: "#fffdf8",
        border: "1px solid rgba(31, 41, 55, 0.12)"
      }}
    >
      <strong>Firebase Auth</strong>
      <p style={{ margin: "8px 0 0", lineHeight: 1.6 }}>
        {firebaseReady
          ? user
            ? `Sessao ativa para ${user.email ?? user.uid}.`
            : "Pronto para autenticar usuarios."
          : "Inicializando autenticacao..."}
      </p>
    </article>
  );
}

function toEnvVariableName(field: string) {
  switch (field) {
    case "apiKey":
      return "NEXT_PUBLIC_FIREBASE_API_KEY";
    case "authDomain":
      return "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN";
    case "projectId":
      return "NEXT_PUBLIC_FIREBASE_PROJECT_ID";
    case "storageBucket":
      return "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET";
    default:
      return field;
  }
}
