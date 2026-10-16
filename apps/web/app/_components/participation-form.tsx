"use client";
import { useRef, useState } from "react";
import { TurnstileWidget } from "./turnstile-widget";

export function ParticipationForm({
  orgSlug,
  kind,
  eventId,
  isPaid = false,
}: {
  orgSlug: string;
  kind: "care" | "event";
  eventId?: string;
  isPaid?: boolean;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [token, setToken] = useState("");
  const [reset, setReset] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Record<string, any> | null>(null);
  const attempt = useRef("");
  const fingerprint = useRef("");
  const inputStyle = {
    width: "100%",
    padding: 12,
    border: "1px solid #94a3b8",
    borderRadius: 8,
    font: "inherit",
    boxSizing: "border-box" as const,
    color: "#1c2433",
    background: "white",
  };
  if (result)
    return (
      <section
        role="status"
        style={{
          padding: 18,
          borderRadius: 12,
          background: "#f0fdf4",
          color: "#14532d",
        }}
      >
        <h3 style={{ marginTop: 0 }}>
          {kind === "care"
            ? "Pedido recebido com privacidade"
            : result.alreadyRegistered
              ? "Este contato já possui inscrição"
              : "Inscrição registrada"}
        </h3>
        {kind === "care" ? (
          <p>
            A equipe da igreja poderá acompanhar seu pedido. Ele não será
            publicado no mural.
          </p>
        ) : (
          <>
            {result.registrationCode && (
              <p>
                Guarde seu comprovante:{" "}
                <strong style={{ overflowWrap: "anywhere" }}>
                  {result.registrationCode}
                </strong>
              </p>
            )}
            {result.paymentStatus === "pending" && (
              <p>
                O pagamento está pendente. Combine com a organização do evento;
                este comprovante não confirma o pagamento.
              </p>
            )}
            {result.alreadyRegistered && (
              <p>
                Para consultar o comprovante ou alterar os dados, fale com a
                organização do evento.
              </p>
            )}
          </>
        )}
      </section>
    );
  return (
    <form
      style={{ display: "grid", gap: 14, marginTop: 18 }}
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy || !token) return;
        const values = {
          orgSlug,
          kind,
          eventId,
          name,
          phone,
          message,
          consent,
          companyWebsite: website,
        };
        const nextFingerprint = JSON.stringify(values);
        if (fingerprint.current !== nextFingerprint) {
          attempt.current = crypto.randomUUID();
          fingerprint.current = nextFingerprint;
        }
        setBusy(true);
        setError("");
        try {
          const response = await fetch("/api/public/participation", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              ...values,
              requestId: attempt.current,
              turnstileToken: token,
            }),
          });
          const data = await response.json();
          if (!response.ok)
            throw new Error(data.error || "Não foi possível concluir.");
          setResult(data);
        } catch (cause) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Verifique sua conexão e tente novamente.",
          );
          setReset((v) => v + 1);
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        Seu nome
        <input
          required
          maxLength={160}
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={inputStyle}
        />
      </label>
      <label>
        WhatsApp com DDD {kind === "care" && "(opcional)"}
        <input
          type="tel"
          required={kind === "event"}
          maxLength={30}
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={inputStyle}
        />
      </label>
      {kind === "care" && (
        <label>
          Como podemos cuidar de você?
          <textarea
            required
            maxLength={2000}
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            style={inputStyle}
          />
        </label>
      )}
      <label
        style={{
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
          lineHeight: 1.5,
        }}
      >
        <input
          type="checkbox"
          required
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />
        Autorizo a igreja a usar estes dados para{" "}
        {kind === "care"
          ? "acompanhar este pedido e entrar em contato comigo."
          : "organizar minha inscrição e entrar em contato sobre este evento."}
      </label>
      <label
        aria-hidden="true"
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          overflow: "hidden",
          clipPath: "inset(50%)",
        }}
      >
        Website
        <input
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </label>
      {isPaid && (
        <p>
          Este evento é pago. A inscrição ficará com pagamento pendente até a
          conferência pela organização.
        </p>
      )}
      <TurnstileWidget
        action={kind === "care" ? "public_care" : "public_event"}
        resetKey={reset}
        onTokenChange={setToken}
      />
      {error && (
        <p role="alert" style={{ color: "#b91c1c" }}>
          {error}
        </p>
      )}
      <button
        disabled={busy || !token || !consent}
        type="submit"
        style={{
          background: "#7c2d12",
          color: "white",
          padding: 14,
          border: 0,
          borderRadius: 10,
          font: "inherit",
          cursor: "pointer",
          opacity: busy || !token || !consent ? 0.6 : 1,
        }}
      >
        {busy
          ? "Enviando…"
          : kind === "care"
            ? "Enviar pedido privado"
            : "Confirmar inscrição"}
      </button>
    </form>
  );
}
