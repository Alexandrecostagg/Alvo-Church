"use client";

import { useCallback, useEffect, useState } from "react";

const API_URL =
  "https://alvo-church-web.alexandrecostagg.workers.dev/api/public/lp-events";
const CONSENT_KEY = "esdras_lp_analytics_consent";
const SESSION_KEY = "esdras_lp_analytics_session";

type Consent = "accepted" | "declined" | null;

function sessionId() {
  const existing = sessionStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const created = crypto.randomUUID();
  sessionStorage.setItem(SESSION_KEY, created);
  return created;
}

function sendEvent(event: string, placement: string, target: string) {
  const body = JSON.stringify({
    event,
    placement,
    target,
    sessionId: sessionId(),
  });
  if (
    navigator.sendBeacon?.(
      API_URL,
      new Blob([body], { type: "application/json" }),
    )
  )
    return;
  void fetch(API_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
  });
}

export function ConversionAnalytics() {
  const [consent, setConsent] = useState<Consent>(null);

  useEffect(() => {
    const saved = localStorage.getItem(CONSENT_KEY);
    const next = saved === "accepted" || saved === "declined" ? saved : null;
    setConsent(next);
    if (next === "accepted") sendEvent("lp_view", "page", "landing");
  }, []);

  useEffect(() => {
    if (consent !== "accepted") return;
    const handleClick = (event: MouseEvent) => {
      const element = (event.target as Element | null)?.closest<HTMLElement>(
        "[data-analytics-event]",
      );
      if (!element) return;
      sendEvent(
        element.dataset.analyticsEvent || "interaction",
        element.dataset.analyticsPlacement || "unknown",
        element.dataset.analyticsTarget || "unknown",
      );
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [consent]);

  const choose = useCallback((next: Exclude<Consent, null>) => {
    localStorage.setItem(CONSENT_KEY, next);
    setConsent(next);
    if (next === "accepted") sendEvent("lp_view", "page", "landing");
  }, []);

  if (consent !== null) return null;
  return (
    <aside className="lp-consent" aria-label="Preferências de métricas">
      <div>
        <strong>Métricas de melhoria</strong>
        <p>
          Podemos contar visitas e cliques sem guardar nome, e-mail, telefone ou
          conteúdo digitado. Isso ajuda a melhorar esta página.
        </p>
      </div>
      <div className="lp-consent-actions">
        <button
          type="button"
          className="lp-consent-secondary"
          onClick={() => choose("declined")}
        >
          Continuar sem métricas
        </button>
        <button
          type="button"
          className="lp-consent-primary"
          onClick={() => choose("accepted")}
        >
          Permitir métricas
        </button>
      </div>
    </aside>
  );
}
