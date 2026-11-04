"use client";
import { useCallback, useEffect, useState } from "react";
import { useCampaignClient } from "./campaign-client";

export function CampaignManualQueue({
  campaign,
  onChanged,
}: {
  campaign: any;
  onChanged: () => Promise<void>;
}) {
  const call = useCampaignClient();
  const [queue, setQueue] = useState<any>(null),
    [cursor, setCursor] = useState<string | undefined>();
  const [job, setJob] = useState<any>(null),
    [senderReady, setSenderReady] = useState(false);
  const [prepared, setPrepared] = useState(false),
    [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    setQueue(
      await call({ action: "manual-queue", campaignId: campaign.id, cursor }),
    );
  }, [call, campaign.id, campaign.status, cursor]);
  useEffect(() => {
    void load().catch((e) => setError(e.message));
  }, [load, campaign]);
  async function run(work: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await work();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function reserve(guestId: string) {
    await run(async () => {
      setJob(
        await call({
          action: "manual-claim",
          campaignId: campaign.id,
          guestId,
          stepIndex: queue.stepIndex,
          requestId: crypto.randomUUID(),
        }),
      );
      setSenderReady(false);
      setPrepared(false);
      setSent(false);
    });
  }
  async function finish(outcome?: "sent" | "skipped") {
    await run(async () => {
      await call({
        action: outcome ? "manual-complete" : "manual-release",
        campaignId: campaign.id,
        guestId: job.guestId,
        stepIndex: job.stepIndex,
        claimToken: job.claimToken,
        outcome,
        acknowledgeManualSend: sent,
      });
      setJob(null);
      await load();
      await onChanged();
      setNotice(
        outcome === "sent"
          ? "Envio informado por você. O sistema não confirma entrega ou leitura."
          : outcome === "skipped"
            ? "Contato pulado apenas na etapa de hoje."
            : "Reserva liberada. Nenhum envio foi registrado.",
      );
    });
  }
  return (
    <section className="campaign-card" id="envios-manuais">
      <span className="campaign-badge">Sem tarifa da API da Meta</span>
      <h2 style={{ marginTop: 12 }}>Envios manuais · fila do dia</h2>
      <p>
        1. Prepare o contato. 2. Confira o WhatsApp da igreja e toque em Enviar
        no WhatsApp. 3. Volte e registre “Já enviei”. O Esdras não envia
        automaticamente.
      </p>
      <p className="campaign-muted">
        Número da igreja:{" "}
        <strong>
          +{campaign.manualSenderPhone || "a definir no rascunho"}
        </strong>
        . O link usa a conta aberta no aparelho ou WhatsApp Web; ele não escolhe
        o remetente. As respostas são lidas pela equipe e registradas em
        Acompanhamento dos convidados.
      </p>
      {error && (
        <p role="alert" className="campaign-notice campaign-error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="campaign-notice">
          {notice}
        </p>
      )}
      {job ? (
        <div className="campaign-manual-job">
          <h3>Mensagem para {job.name}</h3>
          <p>
            Destinatário: +{job.phone} · reservado por até 10 minutos para
            evitar trabalho simultâneo.
          </p>
          <label className="campaign-field">
            Mensagem pronta
            <textarea readOnly value={job.text} rows={7} />
          </label>
          <label className="campaign-check">
            <input
              type="checkbox"
              checked={senderReady}
              onChange={(e) => setSenderReady(e.target.checked)}
            />
            <span>
              Conferi que o WhatsApp está aberto com o número da igreja: +
              {job.senderPhone}.
            </span>
          </label>
          <div className="campaign-actions">
            {senderReady && (
              <a
                className="campaign-button primary"
                href={job.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setPrepared(true)}
              >
                Abrir conversa com texto
              </a>
            )}
            <button
              disabled={busy || !senderReady}
              onClick={() =>
                void run(async () => {
                  await navigator.clipboard.writeText(job.text);
                  setPrepared(true);
                  setNotice(
                    "Mensagem copiada. Cole na conversa e envie pelo WhatsApp da igreja.",
                  );
                })
              }
            >
              Copiar mensagem
            </button>
          </div>
          <label className="campaign-check">
            <input
              type="checkbox"
              disabled={!prepared || busy}
              checked={sent}
              onChange={(e) => setSent(e.target.checked)}
            />
            <span>
              Confirmo que já toquei em Enviar no WhatsApp para este
              destinatário.
            </span>
          </label>
          <div className="campaign-actions">
            <button
              className="primary"
              disabled={busy || !prepared || !sent}
              onClick={() => void finish("sent")}
            >
              Já enviei · registrar
            </button>
            <button disabled={busy} onClick={() => void finish("skipped")}>
              Pular hoje
            </button>
            <button disabled={busy} onClick={() => void finish()}>
              Voltar sem registrar envio
            </button>
          </div>
        </div>
      ) : (
        <>
          {!queue ? (
            <p role="status">Carregando fila…</p>
          ) : (
            <>
              <p>
                <strong>{queue.date.split("-").reverse().join("/")}</strong> ·
                envios informados hoje: <strong>{queue.reportedSent}</strong> ·
                pulados hoje: {queue.skipped}
              </p>
              <p className="campaign-muted">{queue.message}</p>
              {queue.rows.length > 0 ? (
                <ol className="campaign-manual-list">
                  {queue.rows.map((g: any) => (
                    <li key={g.id}>
                      <div>
                        <strong>{g.name}</strong>
                        <p>
                          +{g.phone} · convite de {g.inviterName} ·{" "}
                          {g.status === "confirmed"
                            ? "já confirmou"
                            : "aguardando resposta"}
                        </p>
                      </div>
                      <button
                        disabled={busy || g.reserved}
                        onClick={() => void reserve(g.id)}
                      >
                        {g.reserved
                          ? g.reservedByYou
                            ? "Reservado na sua sessão"
                            : "Em atendimento"
                          : "Preparar mensagem"}
                      </button>
                    </li>
                  ))}
                </ol>
              ) : (
                <p>
                  Nenhum contato disponível neste lote. Quem não autorizou,
                  pediu atendimento, desistiu ou cancelou fica fora da fila.
                </p>
              )}
              <div className="campaign-actions">
                <button disabled={busy} onClick={() => void run(load)}>
                  Atualizar fila
                </button>
                {queue.nextCursor && (
                  <button
                    disabled={busy}
                    onClick={() => setCursor(queue.nextCursor)}
                  >
                    Próximo lote
                  </button>
                )}
                {cursor && (
                  <button disabled={busy} onClick={() => setCursor(undefined)}>
                    Voltar ao primeiro lote
                  </button>
                )}
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}

export function ManualGuestResponse({
  disabled,
  save,
}: {
  disabled: boolean;
  save: (response: string) => Promise<void>;
}) {
  const [response, setResponse] = useState("");
  return (
    <div className="campaign-manual-response">
      <label className="campaign-field">
        Resposta recebida no WhatsApp
        <select
          value={response}
          disabled={disabled}
          onChange={(e) => setResponse(e.target.value)}
        >
          <option value="">Selecione a resposta</option>
          <option value="confirmed">Confirmou presença</option>
          <option value="declined">Não poderá ir</option>
          <option value="handoff">Pediu atendimento</option>
          <option value="stop">Pediu para parar · SAIR</option>
        </select>
      </label>
      <button
        disabled={disabled || !response}
        onClick={() => void save(response).then(() => setResponse(""))}
      >
        Registrar resposta recebida
      </button>
    </div>
  );
}
