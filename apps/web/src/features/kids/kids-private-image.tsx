"use client";
import { useEffect, useState } from "react";
import { useAppAuth } from "../../../app/providers";

export function KidsPrivateImage({ checkInId, kind = "qr", size = 190, revision = 0 }: { checkInId: string; kind?: "qr" | "photo"; size?: number; revision?: number }) {
  const { user, organizationId } = useAppAuth();
  const identity = `${organizationId}:${user?.uid}:${checkInId}:${kind}:${revision}`;
  const [media, setMedia] = useState<{ identity: string; url: string | null; message: string } | null>(null);
  useEffect(() => {
    let disposed = false, sequence = 0;
    let controller: AbortController | undefined;
    const clear = () => { sequence++; controller?.abort(); if (!disposed) setMedia(null); };
    async function load() {
      clear(); if (!user || document.visibilityState !== "visible") return;
      const request = sequence;
      const pending = new AbortController(); controller = pending;
      const timeout = setTimeout(() => pending.abort(), 12000);
      try {
        const token = await user.getIdToken();
        if (disposed || request !== sequence) return;
        const response = await fetch("/api/kids/qr", { method: "POST", headers: { "content-type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ organizationId, checkInId, kind }), cache: "no-store", signal: pending.signal });
        const data = await response.json();
        if (!response.ok || typeof data.expiresAt !== "number" || data.expiresAt <= Date.now() || (data.dataUrl !== null && !/^data:image\/(png|jpeg);base64,/.test(data.dataUrl))) throw new Error();
        if (!disposed && request === sequence) setMedia({ identity, url: data.dataUrl, message: data.dataUrl ? "" : "Sem foto privada autorizada." });
      } catch { if (!disposed && request === sequence) setMedia({ identity, url: null, message: "Mídia indisponível. Atualize ou procure a equipe Kids." }); }
      finally { clearTimeout(timeout); }
    }
    const visible = () => { if (document.visibilityState === "visible") void load(); else clear(); };
    void load(); const interval = setInterval(visible, 30000);
    document.addEventListener("visibilitychange", visible);
    return () => { disposed = true; clear(); clearInterval(interval); document.removeEventListener("visibilitychange", visible); };
  }, [user, organizationId, checkInId, kind, identity]);
  const current = media?.identity === identity ? media : null;
  return current?.url ? <img src={current.url} alt={kind === "qr" ? "QR de retirada Kids" : "Foto privada da criança"} style={{ width: size, height: size, objectFit: "contain", background: "white", borderRadius: 8 }} /> : <p role="status">{current?.message ?? "Verificando mídia Kids…"}</p>;
}
