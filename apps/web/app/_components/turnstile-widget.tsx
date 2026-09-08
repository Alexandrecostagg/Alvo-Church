"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

const TEST_SITE_KEY = "1x00000000000000000000AA";

interface TurnstileApi {
  render(
    element: HTMLElement,
    options: {
      sitekey: string;
      action: string;
      language: string;
      theme: "light";
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
      "timeout-callback": () => void;
    },
  ): string;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

interface Props {
  action: "public_visit" | "public_giving";
  onTokenChange: (token: string) => void;
  resetKey?: number;
}

export function TurnstileWidget({
  action,
  onTokenChange,
  resetKey = 0,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef("");
  const callbackRef = useRef(onTokenChange);
  const [scriptReady, setScriptReady] = useState(false);
  const siteKey =
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ||
    (process.env.NODE_ENV !== "production" ? TEST_SITE_KEY : "");

  useEffect(() => {
    callbackRef.current = onTokenChange;
  }, [onTokenChange]);

  useEffect(() => {
    if (!scriptReady || !siteKey || !containerRef.current || !window.turnstile)
      return;
    const invalid = () => callbackRef.current("");
    widgetRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      action,
      language: "pt-BR",
      theme: "light",
      callback: (token) => callbackRef.current(token),
      "expired-callback": invalid,
      "error-callback": invalid,
      "timeout-callback": invalid,
    });
    return () => {
      if (widgetRef.current && window.turnstile) {
        window.turnstile.remove(widgetRef.current);
        widgetRef.current = "";
      }
    };
  }, [action, scriptReady, siteKey]);

  useEffect(() => {
    if (widgetRef.current && window.turnstile) {
      window.turnstile.reset(widgetRef.current);
      callbackRef.current("");
    }
  }, [resetKey]);

  if (!siteKey)
    return (
      <p role="alert" style={{ margin: 0, color: "#b91c1c", fontSize: 13 }}>
        A verificação de segurança está indisponível. Procure o suporte da
        igreja.
      </p>
    );

  return (
    <div style={{ display: "grid", gap: 6 }}>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
      />
      <div ref={containerRef} />
      <span style={{ fontSize: 11, color: "#64748b" }}>
        Verificação de segurança Cloudflare
      </span>
    </div>
  );
}
