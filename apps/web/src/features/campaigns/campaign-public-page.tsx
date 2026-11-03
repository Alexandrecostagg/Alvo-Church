"use client";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { campaignCadence } from "@alvo/domain";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { TurnstileWidget } from "../../../app/_components/turnstile-widget";
import { campaignDate, campaignStatus } from "./campaign-client";
import "./campaigns.css";
export function CampaignPublicPage({
  token,
  guest = false,
}: {
  token: string;
  guest?: boolean;
}) {
  const router = useRouter();
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [captcha, setCaptcha] = useState(""),
    [reset, setReset] = useState(0);
  const messageRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (error || notice) messageRef.current?.focus();
  }, [error, notice]);
  const attempt = useRef({ fingerprint: "", id: "" });
  const load = useCallback(async () => {
    try {
      const r = await fetch(
        `/api/public/campaigns?${guest ? "guest" : "invite"}=${encodeURIComponent(token)}`,
        { cache: "no-store" },
      );
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setData(d);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, [token, guest]);
  useEffect(() => {
    void load();
  }, [load]);
  async function post(body: object) {
    const r = await fetch("/api/public/campaigns", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });
    const d = await r.json();
    if (!r.ok) throw Error(d.error || "Não foi possível concluir.");
    return d;
  }
  async function register(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      body = {
        name: String(f.get("name") || ""),
        phone: String(f.get("phone") || ""),
        acceptRegistration: f.get("acceptRegistration") === "on",
        consent: f.get("consent") === "on",
        allowInviterView: f.get("allowInviterView") === "on",
        companyWebsite: f.get("companyWebsite"),
      };
    const fingerprint = JSON.stringify(body);
    if (attempt.current.fingerprint !== fingerprint)
      attempt.current = { fingerprint, id: crypto.randomUUID() };
    setBusy(true);
    setError("");
    try {
      const d = await post({
        action: "register",
        invite: token,
        ...body,
        turnstileToken: captcha,
        requestId: attempt.current.id,
      });
      if (d.manageToken) router.replace(`/convite/pessoa/${d.manageToken}`);
      else
        setNotice(
          d.alreadyRegistered
            ? "Este número já tem uma inscrição nesta campanha. Use o convite que você salvou ou procure a equipe da igreja para receber ajuda."
            : "Solicitação recebida.",
        );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      setReset((n) => n + 1);
    }
  }
  async function respond(operation: string) {
    setBusy(true);
    setError("");
    try {
      await post({ action: "respond", token, operation });
      await load();
      setNotice(
        operation === "stop"
          ? "As mensagens desta campanha foram interrompidas."
          : operation === "handoff"
            ? "Seu pedido foi registrado. A equipe acompanhará sua solicitação; os lembretes ficam pausados."
            : "Sua resposta foi salva.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="campaign-page campaign-public">
      <span className="campaign-eyebrow">Um convite para você</span>
      {data ? (
        <>
          <h1>{data.campaignName}</h1>
          <section className="campaign-card">
            <h2>{data.event.name}</h2>
            <p>
              {campaignDate(data.event.startsAt, data.timezone)}
              <br />
              {data.event.location}
            </p>
            {!guest && (
              <p>
                {data.inviterName} convidou você para estar com a{" "}
                {data.churchName}.
              </p>
            )}
          </section>
        </>
      ) : (
        <p role="status">
          {error
            ? "Não conseguimos abrir este convite."
            : "Abrindo seu convite…"}
        </p>
      )}
      {error && (
        <p
          ref={messageRef}
          tabIndex={-1}
          role="alert"
          className="campaign-notice campaign-error"
        >
          {error} <button onClick={() => void load()}>Tentar novamente</button>
        </p>
      )}
      {notice && (
        <p
          ref={error ? undefined : messageRef}
          tabIndex={-1}
          role="status"
          className="campaign-notice"
        >
          {notice}
        </p>
      )}
      {data && !guest && !notice && (
        <form onSubmit={(e) => void register(e)}>
          <h2>Como podemos receber você?</h2>
          <label className="campaign-field">
            Seu nome
            <input name="name" autoComplete="name" required maxLength={120} />
          </label>
          <label className="campaign-field">
            Seu WhatsApp, com DDD
            <input
              name="phone"
              type="tel"
              autoComplete="tel"
              required
              placeholder="(00) 00000-0000"
              maxLength={25}
            />
          </label>
          <div className="campaign-honeypot" aria-hidden="true">
            <label>
              Empresa
              <input name="companyWebsite" tabIndex={-1} autoComplete="off" />
            </label>
          </div>
          <label className="campaign-check">
            <input type="checkbox" name="acceptRegistration" required />
            <span>
              Autorizo usar meu nome e telefone para organizar minha inscrição e
              acolhida neste evento. Isso não me torna membro da igreja.{" "}
              <a href="/privacy" target="_blank" rel="noopener noreferrer">
                Privacidade
              </a>
            </span>
          </label>
          <label className="campaign-check">
            <input type="checkbox" name="consent" />
            <span>
              Quero receber até {data.days} mensagens pelo WhatsApp,{" "}
              {campaignCadence(data.intervalDays || 1)}
              {data.messageStartDate
                ? `, de ${data.messageStartDate.split("-").reverse().join("/")} até ${data.lastMessageDate.split("-").reverse().join("/")}`
                : ", nos dias anteriores ao evento"}
              , a partir de {data.hour}. Quem se inscrever depois do início
              recebe apenas as próximas mensagens. Posso responder SAIR a
              qualquer momento.{" "}
              {data.deliveryMode === "manual"
                ? "A equipe envia manualmente e atende as respostas no WhatsApp. Também posso cancelar pelo meu convite pessoal."
                : "A confirmação do meu número será solicitada na próxima tela."}
            </span>
          </label>
          <label className="campaign-check">
            <input type="checkbox" name="allowInviterView" />
            <span>
              Permito que {data.inviterName} veja meu primeiro nome e minha
              resposta ao convite. Meu telefone não será exibido.
            </span>
          </label>
          <TurnstileWidget
            action="public_campaign"
            onTokenChange={setCaptcha}
            resetKey={reset}
          />
          <button
            className="primary"
            style={{ marginTop: 18, width: "100%" }}
            type="submit"
            disabled={busy || !captcha}
          >
            {busy ? "Salvando sua inscrição…" : "Receber meu convite"}
          </button>
          <p className="campaign-muted">
            Você pode participar sem autorizar lembretes e sem instalar
            aplicativo.
          </p>
        </form>
      )}
      {data && guest && (
        <>
          <h2>Olá, {data.name.split(" ")[0]}!</h2>
          <p>
            <span className="campaign-badge">
              {campaignStatus[data.status] || data.status}
            </span>
          </p>
          <div className="campaign-actions">
            <button
              className="primary"
              disabled={busy || data.status === "attended"}
              onClick={() => void respond("confirmed")}
            >
              Confirmar presença
            </button>
            <button
              disabled={busy || data.status === "attended"}
              onClick={() => void respond("declined")}
            >
              Não poderei ir
            </button>
            <button disabled={busy} onClick={() => void respond("handoff")}>
              Pedir contato da equipe
            </button>
          </div>
          {data.deliveryMode === "manual" && (
            <section className="campaign-notice">
              <h3>Contato pelo WhatsApp da igreja</h3>
              <p>
                A equipe lê e responde às mensagens manualmente. Você pode usar
                os botões deste convite para confirmar, pedir atendimento ou
                interromper lembretes, sem depender de uma resposta no WhatsApp.
              </p>
              {data.whatsappUrl && (
                <a
                  className="campaign-button"
                  href={data.whatsappUrl}
                  rel="noopener noreferrer"
                >
                  Conversar com a equipe
                </a>
              )}
            </section>
          )}
          {data.deliveryMode !== "manual" &&
            data.consent &&
            !data.optOut &&
            !data.verified && (
              <section className="campaign-notice">
                <h3>Confirme seu número para receber os lembretes</h3>
                {data.whatsappUrl ? (
                  <>
                    <p>
                      Abra o WhatsApp e envie a mensagem que já estará
                      preenchida. A igreja só enviará lembretes depois dessa
                      confirmação.
                    </p>
                    <a
                      className="campaign-button primary"
                      href={data.whatsappUrl}
                      rel="noopener noreferrer"
                    >
                      Confirmar pelo WhatsApp
                    </a>
                    <button onClick={() => void load()}>
                      Já enviei · atualizar
                    </button>
                  </>
                ) : (
                  <p>
                    A igreja está preparando a conexão com o WhatsApp. Seu
                    convite já está salvo; nenhum lembrete será enviado enquanto
                    a conexão e a confirmação do número estiverem pendentes.
                  </p>
                )}
              </section>
            )}
          {data.deliveryMode !== "manual" && data.verified && !data.optOut && (
            <p className="campaign-notice">
              Número confirmado.{" "}
              {data.handoff
                ? "Os lembretes estão pausados para atendimento pela equipe."
                : "Os lembretes dependem da ativação pela igreja e da data prevista."}
            </p>
          )}
          <section className="campaign-card">
            <h2>Seu convite e sua pulseira</h2>
            <p>
              Mostre este QR à recepção no dia do evento. A pulseira impressa
              serve para identificar seu convite.
            </p>
            <div className="campaign-ticket">
              <img
                src={`/api/qr?data=${encodeURIComponent(data.ticketCode)}`}
                alt="QR de identificação para a recepção"
                width={160}
                height={160}
              />
              <div>
                <strong>{data.name}</strong>
                <p>{data.event.name}</p>
                <span className="campaign-code">{data.ticketCode}</span>
              </div>
            </div>
            <button style={{ marginTop: 16 }} onClick={() => window.print()}>
              Imprimir pulseira
            </button>
            <p className="campaign-muted">
              Salve esta página nos favoritos. Este endereço é pessoal e permite
              alterar sua resposta; compartilhe apenas o QR de identificação.
            </p>
          </section>
          {data.consent && !data.optOut && (
            <button disabled={busy} onClick={() => void respond("stop")}>
              Parar mensagens desta campanha
            </button>
          )}
          {data.optOut && (
            <p className="campaign-muted">
              Você optou por não receber mensagens desta campanha.
            </p>
          )}
          {createPortal(
            <div className="campaign-wristband">
              <img
                src={`/api/qr?data=${encodeURIComponent(data.ticketCode)}`}
                alt=""
              />
              <div>
                <p>
                  <strong>{data.name} · CONVIDADO</strong>
                </p>
                <p>
                  {data.event.name} ·{" "}
                  {campaignDate(data.event.startsAt, data.timezone)}
                </p>
                <small>{data.ticketCode}</small>
              </div>
            </div>,
            document.body,
          )}
        </>
      )}
    </main>
  );
}
