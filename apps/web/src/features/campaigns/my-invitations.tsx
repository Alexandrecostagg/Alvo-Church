"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  useCampaignClient,
  campaignDate,
  campaignStatus,
} from "./campaign-client";
import "./campaigns.css";
export function MyInvitations() {
  const call = useCampaignClient();
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setError("");
    try {
      setData(await call({ action: "missions" }));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [call]);
  useEffect(() => {
    void load();
  }, [load]);
  async function create(id: string) {
    setBusy(true);
    setError("");
    try {
      await call({ action: "my-link", campaignId: id });
      await load();
      setNotice(
        "Seu convite está pronto. Copie o link e envie pessoalmente para quem deseja convidar.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function copy(link: string) {
    try {
      await navigator.clipboard.writeText(new URL(link, location.origin).href);
      setNotice(
        "Link copiado. O convidado poderá se cadastrar sem baixar aplicativo.",
      );
    } catch {
      setNotice("Selecione e copie o endereço exibido abaixo.");
    }
  }
  return (
    <main className="campaign-page">
      <Link href="/events">← Eventos</Link>
      <header>
        <div>
          <span className="campaign-eyebrow">Missão de acolhimento</span>
          <h1>Meus convidados</h1>
          <p className="campaign-muted">
            Compartilhe seu convite e acompanhe quem autorizou compartilhar a
            resposta com você.
          </p>
        </div>
        <button onClick={() => void load()} disabled={busy}>
          Atualizar
        </button>
      </header>
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
      {!data && !error && <p role="status">Carregando campanhas…</p>}
      {data?.campaigns.length === 0 && (
        <section className="campaign-card">
          <h2>Nenhuma campanha aberta</h2>
          <p>A igreja publicará aqui a próxima missão de convites.</p>
        </section>
      )}
      {data?.campaigns.map((c: any) => (
        <section className="campaign-card" key={c.id}>
          <span className="campaign-badge">
            Sua missão: convidar {c.goal} pessoa(s)
          </span>
          <h2>{c.name}</h2>
          {c.invitesOpen === false && (
            <p className="campaign-notice">
              Os convites abrem em{" "}
              {c.inviteStartDate.split("-").reverse().join("/")}. Seu link
              poderá ser criado nessa data.
            </p>
          )}
          <p>
            {c.event.name} · {campaignDate(c.event.startsAt, c.timezone)}
            <br />
            {c.event.location}
          </p>
          {c.link ? (
            <>
              <label className="campaign-field">
                Seu link de convite
                <input
                  readOnly
                  value={
                    typeof location !== "undefined"
                      ? new URL(c.link, location.origin).href
                      : c.link
                  }
                  onFocus={(e) => e.target.select()}
                />
              </label>
              <div className="campaign-actions">
                <button className="primary" onClick={() => void copy(c.link)}>
                  Copiar convite
                </button>
                <Link
                  className="campaign-button"
                  href={c.link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Ver convite
                </Link>
              </div>
            </>
          ) : (
            <button
              className="primary"
              disabled={busy || c.invitesOpen === false}
              onClick={() => void create(c.id)}
            >
              Criar meu convite
            </button>
          )}
          <h3 style={{ marginTop: 24 }}>
            Inscrições pelo seu convite: {c.guests.length}
            {c.hasMore ? "+" : ""}
          </h3>
          {c.guests.length === 0 ? (
            <p className="campaign-muted">
              As inscrições aparecerão aqui depois que os convidados preencherem
              o formulário.
            </p>
          ) : (
            <ul>
              {c.guests.map((g: any) => (
                <li key={g.id}>
                  {g.name} · {campaignStatus[g.status] || g.status}
                </li>
              ))}
            </ul>
          )}
          <p className="campaign-muted">
            O telefone fica com a equipe responsável. Cada pessoa escolhe se
            deseja mostrar o primeiro nome e a resposta a você.
          </p>
        </section>
      ))}
    </main>
  );
}
