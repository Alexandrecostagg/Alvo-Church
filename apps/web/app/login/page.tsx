"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthPanel } from "../auth-panel";
import { BrandLogo } from "../brand-logo";
import { useAppAuth } from "../providers";

export default function LoginPage() {
  const { user } = useAppAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) router.replace("/app");
  }, [user, router]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
            <BrandLogo size={56} iconOnly />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Plataforma Esdras</h1>
          <p style={{ color: "#6b7280", marginTop: 6, fontSize: 14 }}>
            Plataforma de gestão da sua igreja
          </p>
        </div>
        <AuthPanel />
      </div>
    </div>
  );
}
