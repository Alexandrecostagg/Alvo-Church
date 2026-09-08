"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useParams } from "next/navigation";
import { AlertTriangle, Building2, CheckCircle, Link as LinkIcon, Loader2, LogIn, XCircle } from "lucide-react";
import { useAppAuth } from "../../providers";

type Step = "loading" | "auth_required" | "confirming" | "done" | "error";
type InviteDetails = { parentName: string; invitedName: string; childName: string; expiresAt: number };

export default function JoinNetworkPage() {
  const params = useParams();
  const code = String(params?.code ?? "").trim().toUpperCase();
  const { configured, firebaseReady, tenantReady, user, organizationId } = useAppAuth();
  const [step, setStep] = useState<Step>("loading");
  const [details, setDetails] = useState<InviteDetails | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (!code) {
      setErrorMsg("O link de convite está incompleto.");
      setStep("error");
      return;
    }
    if (!configured) {
      setErrorMsg("A autenticação está temporariamente indisponível.");
      setStep("error");
      return;
    }
    if (!firebaseReady || !tenantReady) return;
    if (!user || !organizationId) {
      setStep("auth_required");
      return;
    }

    async function inspect() {
      setStep("loading");
      try {
        const response = await fetch("/api/network/invitations", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            Authorization: `Bearer ${await user!.getIdToken()}`,
          },
          body: JSON.stringify({ action: "inspect", organizationId, inviteCode: code }),
        });
        const data = await response.json() as InviteDetails & { error?: string };
        if (!response.ok) throw new Error(data.error || "Não foi possível validar o convite.");
        if (!cancelled) {
          setDetails(data);
          setStep("confirming");
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMsg(error instanceof Error ? error.message : "Não foi possível validar o convite.");
          setStep("error");
        }
      }
    }
    void inspect();
    return () => { cancelled = true; };
  }, [code, configured, firebaseReady, tenantReady, user, organizationId]);

  async function acceptInvite() {
    if (!user || !organizationId) {
      setStep("auth_required");
      return;
    }
    setStep("loading");
    try {
      const response = await fetch("/api/network/invitations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({ action: "accept", organizationId, inviteCode: code }),
      });
      const data = await response.json() as { parentName?: string; error?: string };
      if (!response.ok) throw new Error(data.error || "Não foi possível aceitar o convite.");
      setDetails((current) => current ? { ...current, parentName: data.parentName || current.parentName } : current);
      setStep("done");
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Não foi possível aceitar o convite.");
      setStep("error");
    }
  }

  const returnTo = `/join/${encodeURIComponent(code)}`;
  return (
    <main style={page}>
      <div style={card}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: "var(--esdras-primary-softer)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
            <LinkIcon size={26} style={{ color: "var(--esdras-primary-dark)" }} />
          </div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#1c2433" }}>Integrar à rede</h1>
          <p style={{ margin: "6px 0 0", fontSize: 14, color: "#64748b" }}>
            Código: <strong style={{ color: "var(--esdras-primary-dark)", letterSpacing: "0.08em" }}>{code || "—"}</strong>
          </p>
        </div>

        {step === "loading" && (
          <div aria-label="Validando convite" style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
            <Loader2 size={28} style={{ color: "#94a3b8", animation: "spin 1s linear infinite" }} />
          </div>
        )}

        {step === "auth_required" && (
          <div style={{ display: "grid", gap: 16 }}>
            <div style={notice}>
              <LogIn size={17} style={{ color: "#d97706", flexShrink: 0 }} />
              <span>Entre com uma conta de administrador da instituição que aceitará o convite. O vínculo será feito com a instituição da sua conta.</span>
            </div>
            <a href={`/login?returnTo=${encodeURIComponent(returnTo)}`} style={{ ...btn, textDecoration: "none", textAlign: "center" }}>Entrar para continuar</a>
          </div>
        )}

        {step === "confirming" && details && (
          <div style={{ display: "grid", gap: 20 }}>
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: "16px 18px", display: "grid", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Building2 size={18} style={{ color: "#16a34a" }} />
                <div>
                  <strong style={{ fontSize: 13, color: "#1c2433", display: "block" }}>Convite válido</strong>
                  <span style={{ fontSize: 12, color: "#64748b" }}>Rede: <strong>{details.parentName}</strong></span>
                </div>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: "#374151" }}>
                A instituição <strong>{details.childName}</strong> será integrada à rede. O convite foi preparado para <strong>{details.invitedName}</strong>.
              </p>
            </div>
            <div style={notice}>
              <AlertTriangle size={15} style={{ color: "#d97706", flexShrink: 0 }} />
              <span>A sede verá somente indicadores gerenciais consolidados. Cadastros individuais de membros não são compartilhados.</span>
            </div>
            <button onClick={() => void acceptInvite()} style={btn}>Aceitar e integrar</button>
          </div>
        )}

        {step === "done" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "8px 0" }}>
            <CheckCircle size={48} style={{ color: "#16a34a" }} />
            <div style={{ textAlign: "center" }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#1c2433" }}>Integração concluída</h2>
              <p style={{ margin: "8px 0 0", fontSize: 14, color: "#64748b", lineHeight: 1.5 }}>Sua instituição agora faz parte da rede <strong>{details?.parentName}</strong>.</p>
            </div>
            <a href="/" style={{ ...btn, textDecoration: "none", textAlign: "center" }}>Ir para o painel</a>
          </div>
        )}

        {step === "error" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "8px 0" }}>
            <XCircle size={48} style={{ color: "#dc2626" }} />
            <div style={{ textAlign: "center" }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#1c2433" }}>Não foi possível continuar</h2>
              <p role="alert" style={{ margin: "8px 0 0", fontSize: 14, color: "#64748b" }}>{errorMsg}</p>
            </div>
            <a href="/app" style={{ ...btnSecondary, textDecoration: "none", textAlign: "center" }}>Voltar para o painel</a>
          </div>
        )}
      </div>
      <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}

const page: CSSProperties = { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px", background: "#fdfaf6" };
const card: CSSProperties = { maxWidth: 460, width: "100%", padding: "32px 28px", borderRadius: 20, background: "#fff", border: "1px solid rgba(29,41,64,0.1)", boxShadow: "0 4px 24px rgba(0,0,0,0.07)" };
const btn: CSSProperties = { padding: "13px", borderRadius: 12, background: "var(--esdras-primary-dark)", color: "#fff", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", width: "100%", boxSizing: "border-box" };
const btnSecondary: CSSProperties = { width: "100%", padding: "13px", borderRadius: 12, border: "1px solid rgba(29,41,64,0.18)", background: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", color: "#374151", boxSizing: "border-box" };
const notice: CSSProperties = { display: "flex", alignItems: "flex-start", gap: 8, padding: "12px 14px", borderRadius: 10, background: "#fffbeb", border: "1px solid #fde68a", fontSize: 13, color: "#64748b", lineHeight: 1.5 };
