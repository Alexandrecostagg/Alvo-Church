"use client";
export const runtime = 'edge';

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Building2, CheckCircle, XCircle, Loader2, Link as LinkIcon, AlertTriangle
} from "lucide-react";
import {
  getFirebaseFirestore,
  getOrganizationBrandingDocumentPath,
  fetchNetworkAffiliateByInviteCode,
  saveNetworkAffiliate,
  isFirebaseWebRuntimeConfigured,
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
} from "@alvo/firebase";

function buildConfig() {
  return {
    apiKey:        process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
    authDomain:    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
    projectId:     process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  };
}

type Step = "loading" | "enter_org" | "confirming" | "done" | "error";

export default function JoinNetworkPage() {
  const params  = useParams();
  const code    = (params?.code as string ?? "").toUpperCase();
  const config  = buildConfig();
  const ready   = isFirebaseWebRuntimeConfigured(config);

  const [step,         setStep]         = useState<Step>("loading");
  const [orgId,        setOrgId]        = useState("");
  const [orgName,      setOrgName]      = useState("");
  const [parentName,   setParentName]   = useState("");
  const [affiliateName,setAffiliateName]= useState("");
  const [errorMsg,     setErrorMsg]     = useState("");

  /* Ao montar: tenta resolver o código e o nome da sede */
  useEffect(() => {
    if (!ready || !code) { setStep("enter_org"); return; }

    async function resolve() {
      try {
        const db = getFirebaseFirestore(config);
        // Busca em todas as orgs que têm este convite (scan via collectionGroup seria ideal,
        // mas como a sede envia o link com o orgId dela, usamos o orgId salvo no código)
        // Abordagem: o link é /join/{code}?from={parentOrgId}
        // Por ora, exige que o filha informe o ID da org sede (campo simples)
        setStep("enter_org");
      } catch {
        setStep("enter_org");
      }
    }
    void resolve();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, ready]);

  async function lookupParent(parentOrgId: string) {
    if (!ready || !parentOrgId.trim()) return;
    setStep("loading");
    try {
      const db = getFirebaseFirestore(config);

      // Valida o convite
      const affiliate = await fetchNetworkAffiliateByInviteCode(config, parentOrgId.trim(), code);
      if (!affiliate) {
        setErrorMsg("Código de convite inválido ou já utilizado.");
        setStep("error");
        return;
      }

      // Nome da sede
      const brandSnap = await getDoc(doc(db, getOrganizationBrandingDocumentPath({ organizationId: parentOrgId.trim() })));
      const parentBrand = brandSnap.data() as { publicShortName?: string; publicProductName?: string } | undefined;
      setParentName(parentBrand?.publicShortName ?? parentBrand?.publicProductName ?? parentOrgId.trim());
      setAffiliateName(affiliate.childName);
      setStep("confirming");
    } catch (e) {
      setErrorMsg("Não foi possível validar o convite. Verifique o código e tente novamente.");
      setStep("error");
    }
  }

  async function acceptInvite() {
    if (!ready || !orgId.trim()) return;
    setStep("loading");
    try {
      const db = getFirebaseFirestore(config);

      // Resolve o orgId da filha via slug
      const slugSnap = await getDoc(doc(db, "org_slugs", orgId.trim()));
      const childOrgId = slugSnap.exists()
        ? String(slugSnap.data()["organizationId"])
        : orgId.trim();

      // Atualiza o affiliado: status active + childOrganizationId real
      const affiliate = await fetchNetworkAffiliateByInviteCode(config, orgId.trim(), code);
      if (!affiliate) throw new Error("Convite não encontrado");

      await saveNetworkAffiliate(config, {
        ...affiliate,
        childOrganizationId: childOrgId,
        status:              "active",
        joinedAt:            new Date().toISOString().slice(0, 10),
        inviteCode:          undefined,          // invalida o código após uso
      });

      setStep("done");
    } catch (e) {
      setErrorMsg("Erro ao confirmar a integração. Tente novamente.");
      setStep("error");
    }
  }

  /* ── UI ──────────────────────────────────────────────────────────────── */
  return (
    <main style={page}>
      <div style={card}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: "var(--esdras-primary-softer)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
            <LinkIcon size={26} style={{ color: "var(--esdras-primary-dark)" }} />
          </div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#1c2433" }}>
            Integrar à Rede
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: 14, color: "#64748b" }}>
            Código de convite: <strong style={{ color: "var(--esdras-primary-dark)", letterSpacing: "0.08em" }}>{code}</strong>
          </p>
        </div>

        {/* Loading */}
        {step === "loading" && (
          <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
            <Loader2 size={28} style={{ color: "#94a3b8", animation: "spin 1s linear infinite" }} />
          </div>
        )}

        {/* Informar ID da sede */}
        {step === "enter_org" && (
          <div style={{ display: "grid", gap: 16 }}>
            <div style={notice}>
              <AlertTriangle size={15} style={{ color: "#d97706", flexShrink: 0 }} />
              <span>Informe o <strong>ID da organização sede</strong> que enviou o convite. Este dado está disponível no e-mail ou mensagem recebida.</span>
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              <label style={lbl}>ID da organização sede *</label>
              <input
                type="text"
                placeholder="Ex: alvo-sp-sede"
                value={orgId}
                onChange={e => setOrgId(e.target.value)}
                style={inp}
                onKeyDown={e => e.key === "Enter" && lookupParent(orgId)}
              />
            </div>
            <button
              onClick={() => lookupParent(orgId)}
              disabled={!orgId.trim()}
              style={{ ...btn, opacity: orgId.trim() ? 1 : 0.5, cursor: orgId.trim() ? "pointer" : "not-allowed" }}
            >
              Validar convite
            </button>
          </div>
        )}

        {/* Confirmação */}
        {step === "confirming" && (
          <div style={{ display: "grid", gap: 20 }}>
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: "16px 18px", display: "grid", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Building2 size={18} style={{ color: "#16a34a" }} />
                <div>
                  <strong style={{ fontSize: 13, color: "#1c2433", display: "block" }}>Convite válido</strong>
                  <span style={{ fontSize: 12, color: "#64748b" }}>Sede: <strong>{parentName}</strong></span>
                </div>
              </div>
              {affiliateName && (
                <p style={{ margin: 0, fontSize: 13, color: "#374151" }}>
                  Sua igreja será integrada como <strong>{affiliateName}</strong> na rede.
                  A sede poderá visualizar apenas dados gerenciais (totais agregados).
                </p>
              )}
            </div>

            <div style={notice}>
              <AlertTriangle size={14} style={{ color: "#d97706", flexShrink: 0 }} />
              <span style={{ fontSize: 12 }}>
                Ao aceitar, a sede visualizará totais como número de membros, arrecadação e engajamento.
                Dados individuais de membros <strong>não são compartilhados</strong>.
              </span>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setStep("enter_org"); setOrgId(""); }} style={btnSecondary}>
                Voltar
              </button>
              <button onClick={acceptInvite} style={{ ...btn, flex: 2 }}>
                Aceitar e integrar
              </button>
            </div>
          </div>
        )}

        {/* Sucesso */}
        {step === "done" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "8px 0" }}>
            <CheckCircle size={48} style={{ color: "#16a34a" }} />
            <div style={{ textAlign: "center" }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#1c2433" }}>Integração concluída!</h2>
              <p style={{ margin: "8px 0 0", fontSize: 14, color: "#64748b", lineHeight: 1.5 }}>
                Sua igreja agora faz parte da rede <strong>{parentName}</strong>.
                Os dados gerenciais serão sincronizados automaticamente.
              </p>
            </div>
            <a href="/" style={{ ...btn, textDecoration: "none", textAlign: "center" as const }}>
              Ir para o painel
            </a>
          </div>
        )}

        {/* Erro */}
        {step === "error" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "8px 0" }}>
            <XCircle size={48} style={{ color: "#dc2626" }} />
            <div style={{ textAlign: "center" }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#1c2433" }}>Código inválido</h2>
              <p style={{ margin: "8px 0 0", fontSize: 14, color: "#64748b" }}>{errorMsg}</p>
            </div>
            <button onClick={() => { setStep("enter_org"); setErrorMsg(""); }} style={btnSecondary}>
              Tentar novamente
            </button>
          </div>
        )}
      </div>
      <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}

const page: React.CSSProperties = { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px", background: "#fdfaf6" };
const card: React.CSSProperties = { maxWidth: 460, width: "100%", padding: "32px 28px", borderRadius: 20, background: "#fff", border: "1px solid rgba(29,41,64,0.1)", boxShadow: "0 4px 24px rgba(0,0,0,0.07)" };
const lbl:  React.CSSProperties = { fontSize: 13, fontWeight: 600, color: "#374151" };
const inp:  React.CSSProperties = { padding: "10px 14px", borderRadius: 10, border: "1.5px solid rgba(29,41,64,0.18)", fontSize: 14, outline: "none", background: "#fff", width: "100%", boxSizing: "border-box" };
const btn:  React.CSSProperties = { padding: "13px", borderRadius: 12, background: "var(--esdras-primary-dark)", color: "#fff", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", width: "100%" };
const btnSecondary: React.CSSProperties = { flex: 1, padding: "13px", borderRadius: 12, border: "1px solid rgba(29,41,64,0.18)", background: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", color: "#374151" };
const notice: React.CSSProperties = { display: "flex", alignItems: "flex-start", gap: 8, padding: "12px 14px", borderRadius: 10, background: "#fffbeb", border: "1px solid #fde68a", fontSize: 13, color: "#64748b", lineHeight: 1.5 };
