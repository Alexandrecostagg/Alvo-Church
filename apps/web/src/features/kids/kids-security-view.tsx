"use client";

import { useState, useEffect, useCallback } from "react";
import {
  QrCode,
  ShieldCheck,
  Baby,
  History,
  AlertCircle,
  ChevronRight,
  Camera,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { useAppAuth } from "../../../app/providers";
import {
  fetchActiveKidsCheckIns,
  isFirebaseWebRuntimeConfigured,
} from "@alvo/firebase";
import type { KidsCheckIn } from "@alvo/types";

export function KidsSecurityView() {
  const { user, configured, firebaseReady, firebaseConfig, organizationId } =
    useAppAuth();
  const [myCheckIns, setMyCheckIns] = useState<KidsCheckIn[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (
      !configured ||
      !firebaseReady ||
      !organizationId ||
      !user ||
      !isFirebaseWebRuntimeConfigured(firebaseConfig)
    ) {
      setLoading(false);
      return;
    }
    try {
      const active = await fetchActiveKidsCheckIns(firebaseConfig, {
        organizationId,
      });
      // Só os check-ins do próprio responsável (segurança: pai não vê filhos de outros).
      const mine = active.filter(
        (c) =>
          c.parentId === user.uid || c.authorizedPickUpIds?.includes(user.uid),
      );
      setMyCheckIns(mine);
    } catch {
      setMyCheckIns([]);
    } finally {
      setLoading(false);
    }
  }, [configured, firebaseReady, firebaseConfig, organizationId, user]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <main className="member-app-shell">
      <header className="member-header">
        <div className="member-user-info">
          <Link href="/me" className="back-link-circle">
            <ChevronRight size={20} style={{ transform: "rotate(180deg)" }} />
          </Link>
          <div className="member-welcome">
            <p className="eyebrow">Segurança Kids</p>
            <h1>Meus Check-ins</h1>
          </div>
        </div>
        <div
          className="icon-box"
          style={{ background: "#f0fdf4", color: "#16a34a" }}
        >
          <ShieldCheck size={20} />
        </div>
      </header>

      <section className="kids-status-container">
        <p className="section-subtitle">
          O crachá com QR de retirada dos seus filhos com check-in ativo.
        </p>

        {loading ? (
          <p
            style={{
              color: "var(--alvo-ink-soft)",
              fontSize: "0.9rem",
              padding: "1.5rem 0",
            }}
          >
            Carregando…
          </p>
        ) : myCheckIns.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "2.5rem 1rem",
              color: "var(--alvo-ink-soft)",
            }}
          >
            <Baby size={40} style={{ opacity: 0.3, marginBottom: 10 }} />
            <p style={{ fontSize: "0.9rem", fontWeight: 500 }}>
              Nenhum check-in ativo.
            </p>
            <p style={{ fontSize: "0.78rem", marginTop: 4 }}>
              O líder da sala Kids faz o check-in do seu filho na entrada — o
              crachá aparece aqui.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
              marginTop: "1rem",
            }}
          >
            {myCheckIns.map((c) => (
              <div
                key={c.id}
                className="token-card"
                style={{
                  padding: "1.25rem",
                  border: "1px solid var(--alvo-line)",
                  borderRadius: 20,
                }}
              >
                <div
                  className="token-header"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 10,
                  }}
                >
                  <ShieldCheck size={22} color="#16a34a" />
                  <strong>{c.childName ?? "Criança"}</strong>
                  <span
                    className="live-pulse"
                    style={{ marginLeft: "auto" }}
                  ></span>
                </div>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <img
                    src={`/api/kids/qr?data=${encodeURIComponent(c.securityToken)}`}
                    alt={`QR de retirada de ${c.childName ?? "criança"}`}
                    style={{ width: 190, height: 190, borderRadius: 8 }}
                  />
                </div>
                <div style={{ textAlign: "center", marginTop: 10 }}>
                  <strong
                    style={{ fontFamily: "monospace", fontSize: "0.85rem" }}
                  >
                    {c.securityToken}
                  </strong>
                  <p
                    style={{
                      fontSize: "0.78rem",
                      color: "var(--alvo-ink-soft)",
                      margin: "6px 0 0",
                    }}
                  >
                    Apresente este QR ao líder da sala Kids na retirada.
                  </p>
                  {c.checkedInAt && (
                    <p
                      style={{
                        fontSize: "0.72rem",
                        color: "var(--alvo-ink-soft)",
                        margin: "4px 0 0",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Clock size={12} /> Entrada às{" "}
                      {new Date(c.checkedInAt).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="kids-additional-info">
        <article className="info-card">
          <div className="icon-box-small">
            <Camera size={16} />
          </div>
          <div>
            <strong>Validação Visual</strong>
            <p>Líderes comparam a foto no momento da retirada.</p>
          </div>
        </article>
        <article className="info-card">
          <div className="icon-box-small">
            <AlertCircle size={16} />
          </div>
          <div>
            <strong>Retirada por Terceiros</strong>
            <p>Apenas pessoas autorizadas podem retirar a criança.</p>
          </div>
        </article>
      </section>

      <footer className="kids-history">
        <button
          className="ghost-button full"
          onClick={() => {
            setLoading(true);
            void load();
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <History size={18} />
          Atualizar
        </button>
      </footer>
    </main>
  );
}
