"use client";

import { useState, useTransition } from "react";
import { useAppAuth } from "./providers";

export function AuthPanel() {
  const { configured, firebaseReady, user, signIn, signOut } = useAppAuth();
  const [email, setEmail] = useState("admin@alvochurch.app");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!configured) {
    return null;
  }

  if (user) {
    return (
      <article
        style={{
          padding: 20,
          borderRadius: 20,
          background: "#eef7ef",
          border: "1px solid rgba(22, 101, 52, 0.18)"
        }}
      >
        <strong>Sessao ativa</strong>
        <p style={{ margin: "8px 0 16px", lineHeight: 1.6 }}>
          Conectado como {user.email ?? user.uid}.
        </p>
        <button
          onClick={() =>
            startTransition(async () => {
              setError(null);
              try {
                await signOut();
              } catch (nextError) {
                setError(
                  nextError instanceof Error
                    ? nextError.message
                    : "Nao foi possivel encerrar a sessao."
                );
              }
            })
          }
          style={buttonStyle}
          disabled={isPending}
        >
          {isPending ? "Saindo..." : "Sair"}
        </button>
        {error ? <p style={errorStyle}>{error}</p> : null}
      </article>
    );
  }

  return (
    <article
      style={{
        padding: 20,
        borderRadius: 20,
        background: "#fffdf8",
        border: "1px solid rgba(31, 41, 55, 0.12)"
      }}
    >
      <strong>Entrar no painel</strong>
      <p style={{ margin: "8px 0 16px", lineHeight: 1.6 }}>
        {firebaseReady ? "Use email e senha do Firebase Auth." : "Inicializando autenticacao..."}
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          startTransition(async () => {
            setError(null);
            try {
              await signIn(email, password);
            } catch (nextError) {
              setError(
                nextError instanceof Error
                  ? nextError.message
                  : "Nao foi possivel iniciar a sessao."
              );
            }
          });
        }}
        style={{ display: "grid", gap: 12 }}
      >
        <label style={labelStyle}>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            style={inputStyle}
            autoComplete="email"
          />
        </label>
        <label style={labelStyle}>
          Senha
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            style={inputStyle}
            autoComplete="current-password"
          />
        </label>
        <button type="submit" style={buttonStyle} disabled={isPending || !firebaseReady}>
          {isPending ? "Entrando..." : "Entrar"}
        </button>
      </form>
      {error ? <p style={errorStyle}>{error}</p> : null}
    </article>
  );
}

const labelStyle = {
  display: "grid",
  gap: 8,
  fontSize: 14,
  color: "#1f2937"
} as const;

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid rgba(31, 41, 55, 0.16)",
  background: "#fffdf8",
  color: "#1f2937"
} as const;

const buttonStyle = {
  border: 0,
  borderRadius: 14,
  padding: "12px 16px",
  background: "#c46a2d",
  color: "#fffaf1",
  fontWeight: 700,
  cursor: "pointer"
} as const;

const errorStyle = {
  margin: "12px 0 0",
  color: "#b42318",
  fontSize: 13,
  lineHeight: 1.5
} as const;

