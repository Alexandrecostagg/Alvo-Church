"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useAppAuth } from "../../../providers";
export default function ConnectWhatsappPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const { user } = useAppAuth();
  const [url, setUrl] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "40px 16px",
        background: "#fdfaf6",
        color: "#1c2433",
      }}
    >
      <div style={{ maxWidth: 520, margin: "auto", display: "grid", gap: 16 }}>
        <Link href={`/p/${orgSlug}`}>Voltar ao portal</Link>
        <h1>Meu WhatsApp na igreja</h1>
        <p>
          Confirme sua identidade uma vez para registrar sua própria presença em
          célula pelo WhatsApp. Seu telefone não dá acesso ao cadastro de outras
          pessoas.
        </p>
        {!user ? (
          <>
            <p>
              Entre na sua conta pelo navegador, sem baixar aplicativo. Depois
              volte a esta página. A secretaria precisa ter conferido o vínculo
              da sua conta com seu cadastro.
            </p>
            <Link href="/login">Entrar na minha conta</Link>
          </>
        ) : (
          <button
            disabled={busy}
            onClick={() => {
              setBusy(true);
              setUrl("");
              setError("");
              void user
                .getIdToken()
                .then((token) =>
                  fetch("/api/whatsapp/link", {
                    method: "POST",
                    headers: {
                      "content-type": "application/json",
                      Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ orgSlug }),
                  }),
                )
                .then(async (response) => {
                  const data = await response.json();
                  if (!response.ok) throw new Error(data.error);
                  setUrl(data.url);
                })
                .catch((cause) => setError(cause.message))
                .finally(() => setBusy(false));
            }}
          >
            {busy ? "Gerando…" : "Gerar vínculo de uso único"}
          </button>
        )}
        {url && (
          <>
            <p>
              O link expira em 10 minutos. Abra-o no seu próprio WhatsApp e
              envie a mensagem preparada. Não compartilhe este link.
            </p>
            <a href={url} target="_blank" rel="noopener noreferrer">
              Vincular meu WhatsApp
            </a>
          </>
        )}
        {error && <p role="alert">{error}</p>}
      </div>
    </main>
  );
}
