"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAppAuth } from "../providers";

export function AuthGate({ children }: { children: ReactNode }) {
  const { firebaseReady, configured, authError, retryAuth, user } = useAppAuth();
  const router = useRouter();

  useEffect(() => {
    if (firebaseReady && !user) {
      router.replace("/login");
    }
  }, [firebaseReady, user, router]);

  if (!firebaseReady || !user) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeContent: "center", padding: 24, textAlign: "center" }}>
        <h1 style={{ fontSize: 22 }}>Plataforma Esdras</h1>
        <p role={authError || !configured ? "alert" : "status"}>
          {authError ?? (!configured ? "O acesso está temporariamente indisponível." : firebaseReady ? "Abrindo a página de entrada..." : "Verificando sua sessão...")}
        </p>
        {authError ? <button onClick={retryAuth}>Tentar novamente</button> : null}
        <a href="/login">Ir para a página de entrada</a>
      </main>
    );
  }

  return <>{children}</>;
}
