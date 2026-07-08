"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useAppAuth } from "./providers";

export function AuthPanel() {
  const { configured, firebaseReady, user, firebaseConfig, signIn, signOut } = useAppAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!configured) {
    return (
      <p style={{ textAlign: "center", color: "#6b7280", fontSize: 14 }}>
        Firebase não configurado. Verifique as variáveis de ambiente.
      </p>
    );
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
        <strong>Sessão ativa</strong>
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
                setError("Não foi possível encerrar a sessão. Tente novamente.");
                console.error(nextError);
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

  async function handleForgotPassword() {
    if (!email.trim()) {
      setError("Digite seu e-mail acima e clique em \"Esqueceu a senha?\" de novo.");
      return;
    }
    setError(null);
    setResetSent(false);
    startTransition(async () => {
      try {
        const sdk = await import("@alvo/firebase");
        await sdk.sendPasswordResetEmailWeb(firebaseConfig, email.trim());
        setResetSent(true);
      } catch (nextError) {
        setError(
          nextError instanceof Error
            ? translateAuthError(nextError.message)
            : "Não foi possível enviar o e-mail de redefinição."
        );
      }
    });
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
      <p style={{ margin: "8px 0 16px", lineHeight: 1.6, color: "#6b7280", fontSize: 14 }}>
        {firebaseReady ? "Entre com seu e-mail e senha." : "Carregando..."}
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          startTransition(async () => {
            setError(null);
            setResetSent(false);
            try {
              await signIn(email, password);
            } catch (nextError) {
              setError(
                nextError instanceof Error
                  ? translateAuthError(nextError.message)
                  : "Não foi possível iniciar a sessão."
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
            placeholder="seu@email.com"
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

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, fontSize: 13 }}>
        <button
          type="button"
          onClick={handleForgotPassword}
          disabled={isPending}
          style={{ background: "none", border: "none", color: "#f97316", fontWeight: 600, cursor: "pointer", padding: 0 }}
        >
          Esqueceu a senha?
        </button>
        <Link href="/signup" style={{ color: "#6b7280", fontWeight: 500, textDecoration: "none" }}>
          Criar conta grátis
        </Link>
      </div>

      {resetSent && (
        <p style={{ margin: "12px 0 0", color: "#166534", fontSize: 13, lineHeight: 1.5 }}>
          Enviamos um link de redefinição de senha para {email}. Confira sua caixa de entrada (e o spam).
        </p>
      )}
      {error ? <p style={errorStyle}>{error}</p> : null}
    </article>
  );
}

function translateAuthError(message: string): string {
  if (message.includes("user-not-found") || message.includes("invalid-credential")) return "E-mail ou senha incorretos.";
  if (message.includes("wrong-password")) return "Senha incorreta.";
  if (message.includes("too-many-requests")) return "Muitas tentativas. Aguarde alguns minutos e tente de novo.";
  if (message.includes("invalid-email")) return "E-mail inválido.";
  return "Não foi possível concluir a ação. Tente novamente.";
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
  background: "var(--esdras-primary)",
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
