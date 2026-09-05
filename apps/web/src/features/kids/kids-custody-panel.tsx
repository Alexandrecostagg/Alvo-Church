"use client";
import { useRef, useState } from "react";
import type { KidsCheckIn } from "@alvo/types";
import { useAppAuth } from "../../../app/providers";
import { KidsPhotoEditor } from "./kids-photo-editor";
const fieldStyle = { display: "block", width: "100%", padding: 10, marginBlock: 8 };

export function KidsCustodyPanel({ record, initialProof, onClose }: { record: KidsCheckIn; initialProof: string; onClose: (releasedTo?: string) => void }) {
  const { user, organizationId, firebaseConfig } = useAppAuth();
  const [current, setCurrent] = useState(record);
  const [proof, setProof] = useState(initialProof);
  const [receiverId, setReceiverId] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const attempt = useRef(crypto.randomUUID());
  async function call(body: object) {
    if (!user) throw new Error("Entre na sua conta.");
    const token = await user.getIdToken();
    const response = await fetch("/api/kids/custody", { method: "POST", headers: { "content-type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ ...body, organizationId, checkInId: current.id }) });
    const data = await response.json(); if (!response.ok) throw new Error(data.error); return data;
  }
  async function release() {
    setBusy(true); setMessage("");
    try {
      const data = await call({ action: "check_out", requestId: attempt.current, receiverId, proof, note, identityConfirmed: confirmed, expectedGuardianVersion: current.guardianVersion ?? 0 });
      onClose(data.receiverName);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível confirmar a retirada."); }
    finally { setBusy(false); }
  }
  async function refresh() {
    setBusy(true);
    try {
      const sdk = await import("@alvo/firebase");
      const updated = await sdk.fetchKidsCheckInByToken(firebaseConfig, { organizationId }, current.securityToken);
      if (!updated || updated.status !== "checked_in") { onClose(); return; }
      setCurrent(updated); setReceiverId(""); setConfirmed(false); setMessage("");
    } catch { setMessage("Não foi possível atualizar. Não libere sem verificar."); }
    finally { setBusy(false); }
  }
  return <section className="panel" style={{ maxWidth: 680, margin: "24px auto", padding: 24 }}>
    <h2>Confirmar retirada</h2><h3>{current.childName}</h3>
    <p>Responsável: {current.guardianName} · {current.parentId ? "Conta vinculada" : "Sem conta no aplicativo"}</p>
    {current.allergies && <p><strong>Alergias:</strong> {current.allergies}</p>}
    {current.securityRestrictions && <p><strong>Restrições:</strong> {current.securityRestrictions}</p>}
    <KidsPhotoEditor key={current.id} checkInId={current.id} />
    {!current.guardianVersion && <p role="alert">Check-in antigo: confirme abaixo o responsável e os autorizados antes de liberar.</p>}
    <label>Quem está retirando?
      <select style={fieldStyle} value={receiverId} disabled={busy} onChange={e => { setReceiverId(e.target.value); setConfirmed(false); }}>
        <option value="">Selecione uma pessoa autorizada</option>
        {(current.pickupPeople ?? []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
    </label>
    <label>QR ou código apresentado pelo responsável<input style={fieldStyle} value={proof} disabled={busy} onChange={e => setProof(e.target.value)} autoComplete="off" /></label>
    <label><input type="checkbox" checked={confirmed} disabled={busy} onChange={e => setConfirmed(e.target.checked)} /> Conferi a identidade de quem retira, a foto disponível e as restrições.</label>
    <label>Observação (opcional)<textarea style={fieldStyle} maxLength={500} value={note} disabled={busy} onChange={e => setNote(e.target.value)} /></label>
    <p role="status">{message}</p>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
      <button disabled={busy || !current.guardianVersion || !receiverId || !proof || !confirmed} onClick={() => void release()}>Confirmar retirada</button>
      <button disabled={busy} onClick={() => void refresh()}>Atualizar identificação</button>
      <button disabled={busy} onClick={() => onClose()}>Voltar</button>
    </div>
    <details style={{ marginTop: 24 }} open={!current.guardianVersion}>
      <summary>Confirmar ou corrigir responsáveis</summary>
      <p>Uma observação não autoriza uma pessoa ausente da lista. Confirme a autorização do responsável antes de alterá-la.</p>
      <GuardianEditor key={`${current.id}:${current.guardianVersion}`} record={current} disabled={busy} call={call} onChanged={updated => { setCurrent(updated); setConfirmed(false); setReceiverId(""); }} />
    </details>
  </section>;
}
function GuardianEditor({ record, disabled, call, onChanged }: { record: KidsCheckIn; disabled: boolean; call: (body: object) => Promise<any>; onChanged: (record: KidsCheckIn) => void }) {
  const [name, setName] = useState(record.guardianName ?? "");
  const [email, setEmail] = useState(record.guardianAccountEmail ?? "");
  const [names, setNames] = useState((record.authorizedPickupNames ?? []).join(", "));
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function save() {
    setBusy(true);
    try {
      const data = await call({ action: "guardians", guardianName: name, guardianEmail: email, guardianPhone: record.guardianPhone ?? "", authorizedNames: names.split(",").map(n => n.trim()).filter(Boolean), reason, identityConfirmed: confirmed, expectedGuardianVersion: record.guardianVersion ?? 0 });
      onChanged(data.checkIn);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Falha ao confirmar responsáveis."); }
    finally { setBusy(false); }
  }
  return <fieldset disabled={busy || disabled} style={{ border: 0, padding: 0 }}>
    <label>Nome do responsável<input style={fieldStyle} value={name} onChange={e => setName(e.target.value)} /></label>
    <label>E-mail da conta na igreja (vazio para responsável sem conta)<input style={fieldStyle} type="email" value={email} onChange={e => setEmail(e.target.value)} /></label>
    <label>Outras pessoas autorizadas, separadas por vírgula<input style={fieldStyle} value={names} onChange={e => setNames(e.target.value)} /></label>
    <label>Motivo da confirmação ou alteração<textarea style={fieldStyle} value={reason} maxLength={500} onChange={e => setReason(e.target.value)} /></label>
    <label><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} /> Confirmei a identidade, o vínculo da conta informada e a autorização destas pessoas.</label>
    <p role="status">{message}</p>
    <button disabled={!confirmed || !reason.trim() || !name.trim()} onClick={() => void save()}>Salvar responsáveis</button>
  </fieldset>;
}
