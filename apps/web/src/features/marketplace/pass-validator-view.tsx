"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import jsQR from "jsqr";
import {
  ArrowLeft,
  BadgeCheck,
  Camera,
  Loader2,
  ScanLine,
  ShieldCheck,
} from "lucide-react";
import { useAppAuth } from "../../../app/providers";

interface Benefit {
  id: string;
  title: string;
  discountLabel: string;
  verificationMode: string;
}
interface Partner {
  id: string;
  name: string;
  benefits: Benefit[];
}
interface Approved {
  status: "approved";
  member: { name: string };
  benefit: { title: string; discountLabel: string };
  validatedAt: string;
}

export function PassValidatorView() {
  const { user, organizationId, firebaseReady, tenantReady } = useAppAuth();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [partnerId, setPartnerId] = useState("");
  const [benefitId, setBenefitId] = useState("");
  const [memberCardCode, setMemberCardCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approved, setApproved] = useState<Approved | null>(null);

  async function authenticatedFetch(url: string, init?: RequestInit) {
    if (!user) throw new Error("Entre na sua conta.");
    const response = await fetch(url, {
      ...init,
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${await user.getIdToken()}`,
        ...init?.headers,
      },
    });
    const data = (await response.json().catch(() => ({}))) as Record<
      string,
      any
    >;
    if (!response.ok)
      throw new Error(
        typeof data.error === "string"
          ? data.error
          : "Não foi possível concluir a operação.",
      );
    return data;
  }

  useEffect(() => {
    if (!firebaseReady || !tenantReady || !user || !organizationId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    authenticatedFetch(
      `/api/members/pass/validate?organizationId=${encodeURIComponent(organizationId)}`,
    )
      .then((data) => {
        if (cancelled) return;
        const next = Array.isArray(data.partners)
          ? (data.partners as Partner[])
          : [];
        setPartners(next);
        setPartnerId(next[0]?.id ?? "");
        setBenefitId(next[0]?.benefits[0]?.id ?? "");
      })
      .catch((cause) => {
        if (!cancelled)
          setError(
            cause instanceof Error
              ? cause.message
              : "Não foi possível abrir a área do parceiro.",
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // authenticatedFetch deliberately follows the current authenticated user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firebaseReady, tenantReady, user, organizationId]);

  const selectedPartner = useMemo(
    () => partners.find((partner) => partner.id === partnerId),
    [partners, partnerId],
  );

  function choosePartner(value: string) {
    setPartnerId(value);
    setBenefitId(
      partners.find((partner) => partner.id === value)?.benefits[0]?.id ?? "",
    );
    setApproved(null);
    setError(null);
  }

  async function scanPhoto(file?: File) {
    if (!file) return;
    setError(null);
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error();
      context.drawImage(bitmap, 0, 0);
      const image = context.getImageData(0, 0, canvas.width, canvas.height);
      const result = jsQR(image.data, image.width, image.height);
      if (!result?.data)
        throw new Error(
          "QR não identificado. Aproxime a câmera e tente novamente.",
        );
      setMemberCardCode(result.data.trim());
      setApproved(null);
    } catch (cause) {
      setError(
        cause instanceof Error && cause.message
          ? cause.message
          : "Não foi possível ler a foto do QR.",
      );
    }
  }

  async function validate() {
    if (!partnerId || !benefitId || !memberCardCode.trim()) return;
    setSubmitting(true);
    setError(null);
    setApproved(null);
    try {
      const data = await authenticatedFetch("/api/members/pass/validate", {
        method: "POST",
        body: JSON.stringify({
          organizationId,
          partnerId,
          benefitId,
          memberCardCode: memberCardCode.trim(),
          requestId: crypto.randomUUID(),
        }),
      });
      setApproved(data as Approved);
      setMemberCardCode("");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível validar o Passe.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="page-root" style={{ maxWidth: 820, margin: "0 auto" }}>
      <header className="page-header">
        <div className="page-header-left">
          <Link className="btn-secondary btn-sm" href="/marketplace">
            <ArrowLeft size={14} /> Marketplace
          </Link>
          <h1 className="page-title" style={{ marginTop: 14 }}>
            Validar Esdras Passe
          </h1>
          <p className="page-subtitle">
            Área segura do parceiro. A validação confirma apenas nome, vínculo
            ativo e benefício.
          </p>
        </div>
        <ShieldCheck size={42} color="var(--alvo-blue)" />
      </header>

      {loading ? (
        <section
          className="content-section"
          style={{ textAlign: "center", padding: 48 }}
        >
          <Loader2 className="spinner" />{" "}
          <p>Conferindo seu vínculo com parceiros...</p>
        </section>
      ) : error && partners.length === 0 ? (
        <section className="content-section">
          <h2 className="section-title">Área indisponível</h2>
          <p role="alert">{error}</p>
          <p className="page-subtitle">
            Peça à administração da igreja para vincular sua conta ao cadastro
            da pessoa responsável pelo parceiro.
          </p>
        </section>
      ) : partners.length === 0 ? (
        <section className="content-section">
          <h2 className="section-title">Nenhum parceiro ativo</h2>
          <p className="page-subtitle">
            Sua conta está confirmada, mas não há parceiro ativo sob sua
            responsabilidade.
          </p>
        </section>
      ) : (
        <section
          className="content-section"
          style={{ display: "grid", gap: 18 }}
        >
          <div>
            <label htmlFor="partner">
              <strong>Parceiro</strong>
            </label>
            <select
              id="partner"
              value={partnerId}
              onChange={(event) => choosePartner(event.target.value)}
              style={fieldStyle}
            >
              {partners.map((partner) => (
                <option key={partner.id} value={partner.id}>
                  {partner.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="benefit">
              <strong>Benefício</strong>
            </label>
            <select
              id="benefit"
              value={benefitId}
              onChange={(event) => {
                setBenefitId(event.target.value);
                setApproved(null);
              }}
              style={fieldStyle}
            >
              {selectedPartner?.benefits.map((benefit) => (
                <option key={benefit.id} value={benefit.id}>
                  {benefit.title}
                  {benefit.discountLabel ? ` · ${benefit.discountLabel}` : ""}
                </option>
              ))}
            </select>
          </div>
          {selectedPartner?.benefits.length === 0 ? (
            <p role="alert">
              Este parceiro não possui benefício ativo no momento.
            </p>
          ) : (
            <>
              <div>
                <label htmlFor="pass-code">
                  <strong>Código do Passe</strong>
                </label>
                <input
                  id="pass-code"
                  autoComplete="off"
                  value={memberCardCode}
                  onChange={(event) => {
                    setMemberCardCode(event.target.value);
                    setApproved(null);
                  }}
                  placeholder="Leia o QR ou cole o código"
                  style={fieldStyle}
                />
              </div>
              <label
                className="btn-secondary"
                style={{ width: "fit-content", cursor: "pointer" }}
              >
                <Camera size={16} /> Ler foto do QR
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  hidden
                  onChange={(event) => void scanPhoto(event.target.files?.[0])}
                />
              </label>
              <button
                className="btn-primary"
                type="button"
                disabled={submitting || !memberCardCode.trim()}
                onClick={() => void validate()}
                style={{
                  opacity: submitting || !memberCardCode.trim() ? 0.55 : 1,
                  width: "fit-content",
                }}
              >
                <ScanLine size={16} />{" "}
                {submitting ? "Validando..." : "Validar Passe"}
              </button>
            </>
          )}
          {error && (
            <p role="alert" style={{ color: "#b42318", margin: 0 }}>
              {error}
            </p>
          )}
          {approved && (
            <div
              role="status"
              style={{
                padding: 18,
                borderRadius: 14,
                background: "#ecfdf3",
                color: "#05603a",
              }}
            >
              <BadgeCheck size={28} />
              <h2 style={{ margin: "8px 0 4px" }}>Passe aprovado</h2>
              <strong>{approved.member.name}</strong>
              <p style={{ margin: "6px 0 0" }}>
                {approved.benefit.title}
                {approved.benefit.discountLabel
                  ? ` · ${approved.benefit.discountLabel}`
                  : ""}
              </p>
              <small>
                Validação registrada em{" "}
                {new Date(approved.validatedAt).toLocaleString("pt-BR")}.
              </small>
            </div>
          )}
          <p className="page-subtitle" style={{ fontSize: 12 }}>
            O parceiro não recebe CPF, telefone, endereço, renda ou dados
            pastorais. Se o Passe não for encontrado, a pessoa deve procurar a
            secretaria da igreja escolhida ou o suporte do app.
          </p>
        </section>
      )}
      <style jsx>{`
        .spinner {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </main>
  );
}

const fieldStyle = {
  width: "100%",
  marginTop: 8,
  padding: "11px 12px",
  borderRadius: 10,
  border: "1px solid var(--alvo-line)",
  background: "var(--alvo-surface)",
  color: "var(--alvo-ink)",
  font: "inherit",
  boxSizing: "border-box" as const,
};
