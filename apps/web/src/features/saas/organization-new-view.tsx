"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { claimOrganizationSlug, provisionSelfServeOrganization } from "@alvo/firebase";
import { useAppAuth } from "../../../app/providers";
import { friendlyError } from "../../lib/friendly-error";

/** Reuse the supported free bootstrap; paid plans are never written by this form. */
export function OrganizationNewView() {
  const { configured, user, firebaseConfig, switchOrganization } = useAppAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const attempt = useRef<{ id: string; name: string; city: string; state: string } | null>(null);
  const busy = useRef(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || !configured || !user) return;
    if (!name.trim()) { setError("Informe o nome da instituição."); return; }
    busy.current = true; setSaving(true); setError("");
    // Retrying resumes the same organization after an uncertain network response.
    attempt.current ??= { id: `org_${crypto.randomUUID()}`, name: name.trim(), city: city.trim(), state: state.trim().toUpperCase() };
    const draft = attempt.current;
    try {
      await provisionSelfServeOrganization(firebaseConfig, { organizationId: draft.id, churchName: draft.name, ownerUid: user.uid, ownerEmail: user.email ?? "", addressCity: draft.city, addressState: draft.state });
      await claimOrganizationSlug(firebaseConfig, { slug: draft.id.slice(4), organizationId: draft.id, displayName: draft.name });
      switchOrganization(draft.id);
      router.push("/settings");
    } catch (nextError) {
      setError(friendlyError(nextError, "Não foi possível concluir. Tente novamente para retomar o mesmo cadastro."));
    } finally { busy.current = false; setSaving(false); }
  }
  return <div className="page-root saas-form-page">
    <header className="page-header"><div className="page-header-left">
      <Link className="back-link" href="/app">← Voltar ao painel</Link>
      <h1 className="page-title">Nova instituição</h1>
      <p className="page-subtitle">Crie uma instituição no plano gratuito, vinculada à sua conta. Ajuste a identidade em Configurações e escolha um plano na área de assinatura.</p>
    </div></header>
    <form onSubmit={submit} className="panel" style={{ maxWidth: 680, padding: 24, display: "grid", gap: 16 }}>
      <label>Nome da instituição<input className="input" value={name} onChange={e => setName(e.target.value)} required maxLength={150} disabled={saving || Boolean(attempt.current)} /></label>
      <label>Cidade<input className="input" value={city} onChange={e => setCity(e.target.value)} maxLength={100} disabled={saving || Boolean(attempt.current)} /></label>
      <label>Estado (UF)<input className="input" value={state} onChange={e => setState(e.target.value)} maxLength={2} pattern="[A-Za-z]{2}" disabled={saving || Boolean(attempt.current)} /></label>
      <p>O cadastro não realiza cobrança. Recursos pagos dependem da ativação do plano correspondente.</p>
      {!configured && <p role="alert">O acesso ainda não está configurado. Procure o suporte.</p>}
      {error && <p role="alert">{error}</p>}
      <button className="button primary" type="submit" disabled={saving || !configured || !user}>{saving ? "Criando instituição…" : attempt.current ? "Retomar cadastro" : "Criar instituição gratuita"}</button>
    </form>
  </div>;
}
