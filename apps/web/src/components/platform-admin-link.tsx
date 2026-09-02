"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { useAppAuth } from "../../app/providers";
import { isPlatformAdmin } from "@alvo/firebase";

// Renderiza um link discreto pro painel cross-tenant só para quem está em
// platformAdmins/{uid} — não é role de tenant (super_admin), é o dono da
// própria Plataforma Esdras.
export function PlatformAdminLink() {
  const { user, firebaseConfig } = useAppAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!user) {
      setVisible(false);
      return;
    }
    let active = true;
    isPlatformAdmin(firebaseConfig, user.uid).then((ok) => {
      if (active) setVisible(ok);
    });
    return () => {
      active = false;
    };
  }, [user, firebaseConfig]);

  if (!visible) return null;

  return (
    <Link
      href="/platform-admin"
      title="Painel Esdras (admin da plataforma)"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        background: "#0f172a",
        border: "none",
        borderRadius: 8,
        padding: "6px 10px",
        cursor: "pointer",
        fontSize: 13,
        color: "#fff",
        flexShrink: 0,
        textDecoration: "none",
      }}
    >
      <ShieldCheck size={14} />
      Esdras
    </Link>
  );
}
