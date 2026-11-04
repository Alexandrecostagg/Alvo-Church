"use client";
import { useState } from "react";
import { useAppAuth } from "../../../app/providers";
import { KidsPrivateImage } from "./kids-private-image";
export function KidsPhotoEditor({ checkInId }: { checkInId: string }) {
  const { user, organizationId } = useAppAuth();
  const [file, setFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [revision, setRevision] = useState(0);
  async function save(remove = false) {
    if (!user) return;
    setBusy(true); setMessage("");
    try {
      let dataUrl: string | undefined;
      if (!remove) {
        if (!file || !consent || file.size > 512000 || !["image/png", "image/jpeg"].includes(file.type)) throw new Error("Escolha JPEG/PNG de até 500 KB e confirme a autorização.");
        dataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); });
      }
      const token = await user.getIdToken();
      const response = await fetch("/api/kids/photo", { method: remove ? "DELETE" : "POST", headers: { "content-type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ organizationId, checkInId, dataUrl, consent }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setRevision(r => r + 1); setFile(null); setConsent(false);
      setMessage(remove ? "Foto removida." : "Foto salva com acesso privado.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Falha ao processar a foto."); }
    finally { setBusy(false); }
  }
  return <section aria-label="Foto de identificação Kids" style={{ padding: 12, marginTop: 12 }}>
    <KidsPrivateImage checkInId={checkInId} kind="photo" size={120} revision={revision} />
    <label style={{ display: "block", marginBlock: 8 }}>Foto JPEG/PNG (até 500 KB)
      <input key={revision} type="file" accept="image/jpeg,image/png" disabled={busy} onChange={e => setFile(e.target.files?.[0] ?? null)} style={{ display: "block", maxWidth: "100%" }} />
    </label>
    <label style={{ display: "block", marginBlock: 8 }}><input type="checkbox" checked={consent} disabled={busy} onChange={e => setConsent(e.target.checked)} /> O responsável autorizou o uso da foto para identificação neste check-in.</label>
    <button disabled={busy || !file || !consent} onClick={() => void save()}>Salvar foto</button>{" "}
    <button disabled={busy} onClick={() => void save(true)}>Remover foto</button>
    <p role="status">{message}</p>
  </section>;
}
