import { useEffect, useState } from "react";
import { AppState, Image, Text } from "react-native";
import type { FirebaseAuthUser } from "@alvo/firebase";
export function KidsPrivateImage({ user, organizationId, checkInId, kind, apiBaseUrl, size }: { user: FirebaseAuthUser; organizationId: string; checkInId: string; kind: "qr" | "photo"; apiBaseUrl: string; size: number }) {
  const identity = `${organizationId}:${user.uid}:${checkInId}:${kind}`;
  const [media, setMedia] = useState<{ identity: string; url: string | null; message: string } | null>(null);
  useEffect(() => {
    let disposed = false, sequence = 0;
    let controller: AbortController | undefined;
    const clear = () => { sequence++; controller?.abort(); if (!disposed) setMedia(null); };
    async function load() {
      clear(); if (AppState.currentState !== "active") return;
      const request = sequence, pending = new AbortController(); controller = pending;
      const timeout = setTimeout(() => pending.abort(), 12000);
      try {
        const token = await user.getIdToken();
        if (disposed || request !== sequence) return;
        const response = await fetch(`${apiBaseUrl}/api/kids/qr`, { method: "POST", headers: { "content-type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ organizationId, checkInId, kind }), signal: pending.signal });
        const data = await response.json();
        if (!response.ok || typeof data.expiresAt !== "number" || data.expiresAt <= Date.now() || (data.dataUrl !== null && !/^data:image\/(png|jpeg);base64,/.test(data.dataUrl))) throw new Error();
        if (!disposed && request === sequence) setMedia({ identity, url: data.dataUrl, message: data.dataUrl ? "" : "Sem foto privada autorizada." });
      } catch { if (!disposed && request === sequence) setMedia({ identity, url: null, message: "Mídia indisponível. Confira a conexão ou procure a equipe Kids." }); }
      finally { clearTimeout(timeout); }
    }
    void load(); const interval = setInterval(() => { if (AppState.currentState === "active") void load(); }, 30000);
    const subscription = AppState.addEventListener("change", state => { if (state === "active") void load(); else clear(); });
    return () => { disposed = true; clear(); clearInterval(interval); subscription.remove(); };
  }, [user, organizationId, checkInId, kind, apiBaseUrl, identity]);
  const current = media?.identity === identity ? media : null;
  return current?.url ? <Image accessibilityLabel={kind === "qr" ? "QR de retirada Kids" : "Foto privada da criança"} source={{ uri: current.url }} style={{ width: size, height: size, backgroundColor: "white", alignSelf: "center", marginVertical: 8 }} /> : <Text style={{ color: "#64748b", textAlign: "center", margin: 8 }}>{current?.message ?? "Verificando mídia Kids…"}</Text>;
}
