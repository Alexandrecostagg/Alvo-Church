"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAppAuth } from "../providers";

export function AuthGate({ children }: { children: ReactNode }) {
  const { firebaseReady, user } = useAppAuth();
  const router = useRouter();

  useEffect(() => {
    if (firebaseReady && !user) {
      router.replace("/login");
    }
  }, [firebaseReady, user, router]);

  // Enquanto carrega ou usuário não autenticado, não renderiza nada
  if (!firebaseReady || !user) return null;

  return <>{children}</>;
}
