"use client";

import Link from "next/link";
import {
  CheckCircle2,
  ClipboardList,
  Megaphone,
  MessageSquareText,
  QrCode,
  Smartphone,
  UserPlus
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  createFirebaseWebRuntimeConfigFromEnv,
  createVisitorIntakeWorkflow,
  fetchVisitorIntakes,
  fetchVisitorJourneys,
  isFirebaseWebRuntimeConfigured
} from "@alvo/firebase";
import type { VisitorIntake, VisitorJourney } from "@alvo/types";
import { useAppAuth } from "../../../app/providers";

const organizationId = "org_alvo_demo";

type CapturedVisitor = {
  id: string;
  journeyId?: string;
  name: string;
  nextStep: string;
  personId?: string;
  phone?: string;
  source: string;
  status: string;
};

const demoVisitors: CapturedVisitor[] = [
  {
    id: "visitor_demo_1",
    name: "Visitante exemplo",
    nextStep: "Enviar boas-vindas no WhatsApp",
    phone: "(00) 90000-0000",
    source: "Convite de membro",
    status: "Na fila"
  }
];

export function ReceptionView() {
  const { configured, firebaseReady, user } = useAppAuth();
  const [visitorDraft, setVisitorDraft] = useState({
    name: "",
    phone: "",
    source: "WhatsApp"
  });
  const [capturedVisitors, setCapturedVisitors] = useState<CapturedVisitor[]>(demoVisitors);
  const [visitorJourneys, setVisitorJourneys] = useState<VisitorJourney[]>([]);
  const [visitorIntakes, setVisitorIntakes] = useState<VisitorIntake[]>([]);
  const [preparedCommunicationIds, setPreparedCommunicationIds] = useState<string[]>([]);
  const [greetedVisitorIds, setGreetedVisitorIds] = useState<string[]>([]);
  const [status, setStatus] = useState("Pronto para receber visitantes.");
  const [lastCreated, setLastCreated] = useState<CapturedVisitor | null>(null);

  const firebaseConfig = useMemo(
    () =>
      createFirebaseWebRuntimeConfigFromEnv({
        NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:
          process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:
          process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:
          process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
      }),
    []
  );

  useEffect(() => {
    if (!configured || !firebaseReady || !user || !isFirebaseWebRuntimeConfigured(firebaseConfig)) {
      return;
    }

    let cancelled = false;

    async function loadVisitors() {
      try {
        const [nextJourneys, nextIntakes] = await Promise.all([
          fetchVisitorJourneys(firebaseConfig, { organizationId }, 20),
          fetchVisitorIntakes(firebaseConfig, { organizationId }, 20)
        ]);

        if (cancelled) {
          return;
        }

        setVisitorJourneys(nextJourneys);
        setVisitorIntakes(nextIntakes);
        setStatus(
          `${nextIntakes.length} entrada(s) e ${nextJourneys.length} jornada(s) sincronizadas.`
        );
      } catch (error) {
        if (!cancelled) {
          setStatus(error instanceof Error ? error.message : "Nao foi possivel carregar visitantes.");
        }
      }
    }

    void loadVisitors();

    return () => {
      cancelled = true;
    };
  }, [configured, firebaseConfig, firebaseReady, user]);

  async function handleVisitorCapture(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = visitorDraft.name.trim();
    const phone = visitorDraft.phone.trim();

    if (!name) {
      setStatus("Informe pelo menos o nome do visitante.");
      setLastCreated(null);
      return;
    }

    const localVisitor: CapturedVisitor = {
      id: `visitor_intake_${Date.now()}`,
      name,
      nextStep: "Enviar boas-vindas no WhatsApp",
      phone: phone || undefined,
      source: visitorDraft.source,
      status: "Jornada local"
    };

    setCapturedVisitors((currentVisitors) => [localVisitor, ...currentVisitors]);
    setVisitorDraft({ name: "", phone: "", source: "WhatsApp" });
    setStatus("Visitante capturado localmente. Preparando jornada e comunicacao.");
    setLastCreated(localVisitor);

    if (!configured || !user || !isFirebaseWebRuntimeConfigured(firebaseConfig)) {
      setStatus(
        "Visitante capturado localmente. Conecte o Firebase para criar pessoa, jornada e follow-ups."
      );
      return;
    }

    try {
      const created = await createVisitorIntakeWorkflow(
        firebaseConfig,
        { organizationId },
        {
          capturedByUserId: user.uid,
          name,
          phone,
          source: localVisitor.source
        }
      );
      const savedVisitor = {
        ...localVisitor,
        id: created.intakeId,
        journeyId: created.journeyId,
        personId: created.personId,
        status: "Salvo no Firestore"
      };

      setCapturedVisitors((currentVisitors) =>
        currentVisitors.map((visitor) =>
          visitor.id === localVisitor.id ? savedVisitor : visitor
        )
      );
      setLastCreated(savedVisitor);
      setStatus("Visitante salvo no Firestore com pessoa, jornada e follow-ups criados.");
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Nao foi possivel salvar o visitante no Firestore."
      );
    }
  }

  function handlePrepareVisitorCommunication(visitorId: string) {
    setPreparedCommunicationIds((currentIds) =>
      currentIds.includes(visitorId) ? currentIds : [...currentIds, visitorId]
    );
    setStatus("Mensagem preparada para a equipe de acolhimento revisar.");
  }

  function handleMarkGreetingComplete(visitorId: string) {
    setGreetedVisitorIds((currentIds) =>
      currentIds.includes(visitorId) ? currentIds : [...currentIds, visitorId]
    );
    setStatus("Cumprimento marcado como realizado na celebracao.");
  }

  const pendingCommunicationVisitors = capturedVisitors.filter(
    (visitor) => !preparedCommunicationIds.includes(visitor.id)
  );
  const celebrationGreetingVisitors = capturedVisitors.filter(
    (visitor) => !greetedVisitorIds.includes(visitor.id)
  );

  return (
    <main className="form-page reception-page">
      <section className="reception-hero">
        <div>
          <Link className="back-link" href="/">
            Voltar ao painel
          </Link>
          <p className="eyebrow">Portaria inteligente</p>
          <h1>Recepcao de visitantes</h1>
          <p>
            Uma tela rapida para tablet, celular ou notebook na entrada: captura o
            visitante, cria a jornada e prepara comunicacao e cumprimentos da celebracao.
          </p>
          <div className="module-return-links">
            <Link className="ghost-button" href="/">
              Painel geral
            </Link>
            <Link className="ghost-button" href="/members">
              Base de membros
            </Link>
            <Link className="ghost-button" href="/members/new">
              Cadastrar membro
            </Link>
          </div>
        </div>
        <aside className="reception-live-card">
          <ClipboardList size={22} />
          <strong>{capturedVisitors.length + visitorIntakes.length}</strong>
          <span>visitantes em operacao</span>
          <p>{status}</p>
        </aside>
      </section>

      <section className="reception-command-grid">
        <form className="visitor-form reception-capture-card" onSubmit={handleVisitorCapture}>
          <p className="eyebrow">Entrada rapida</p>
          <h2>Registrar visitante</h2>
          <label>
            Nome do visitante
            <input
              aria-label="Nome do visitante"
              onChange={(event) =>
                setVisitorDraft((draft) => ({ ...draft, name: event.target.value }))
              }
              placeholder="Ex: Joao Pereira"
              value={visitorDraft.name}
            />
          </label>
          <label>
            WhatsApp ou telefone
            <input
              aria-label="WhatsApp ou telefone"
              onChange={(event) =>
                setVisitorDraft((draft) => ({ ...draft, phone: event.target.value }))
              }
              placeholder="(00) 90000-0000"
              value={visitorDraft.phone}
            />
          </label>
          <label>
            Origem
            <select
              aria-label="Origem do visitante"
              onChange={(event) =>
                setVisitorDraft((draft) => ({ ...draft, source: event.target.value }))
              }
              value={visitorDraft.source}
            >
              <option>WhatsApp</option>
              <option>Instagram</option>
              <option>Convite de membro</option>
              <option>Passando na rua</option>
              <option>Evento especial</option>
            </select>
          </label>
          <button className="primary-button compact" type="submit">
            <UserPlus size={17} />
            Criar jornada
          </button>
          <p className="form-status">{status}</p>
        </form>

        <article className="reception-route-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Fluxo automatico</p>
              <h2>Da porta ao cuidado</h2>
            </div>
            <span className="soft-pill">4 etapas</span>
          </div>
          <div className="reception-step-lane">
            <div>
              <QrCode size={20} />
              <strong>Capturar</strong>
              <p>Nome, origem e telefone entram uma unica vez.</p>
            </div>
            <div>
              <Megaphone size={20} />
              <strong>Cumprimentar</strong>
              <p>Equipe sabe quem apresentar e acolher no culto.</p>
            </div>
            <div>
              <Smartphone size={20} />
              <strong>Comunicar</strong>
              <p>Follow-up prepara boas-vindas no canal certo.</p>
            </div>
            <div>
              <MessageSquareText size={20} />
              <strong>Convidar</strong>
              <p>Proximo passo conecta com celula, classe ou retorno.</p>
            </div>
          </div>
          {lastCreated ? (
            <div className="reception-success-card antigravity-float animate-entrance">
              <div className="success-icon">
                <CheckCircle2 size={24} strokeWidth={3} />
              </div>
              <div className="success-content">
                <strong>{lastCreated.name}</strong>
                <p>
                  {lastCreated.status === "Salvo no Firestore" 
                    ? "Jornada pastoral iniciada com sucesso!" 
                    : lastCreated.status}
                </p>
                {lastCreated.personId ? (
                  <Link className="primary-pill compact" href={`/members/${lastCreated.personId}`}>
                    Ver perfil completo
                  </Link>
                ) : (
                  <span className="soft-pill">Sincronizando...</span>
                )}
              </div>
            </div>
          ) : null}
        </article>
      </section>

      <section className="reception-workbench page-workbench">
        <div className="queue-panel">
          <div className="queue-heading">
            <MessageSquareText size={18} />
            <strong>Fila de comunicacao</strong>
            <span>{pendingCommunicationVisitors.length}</span>
          </div>
          {capturedVisitors.map((visitor) => {
            const prepared = preparedCommunicationIds.includes(visitor.id);

            return (
              <div className="queue-item" key={`communication-${visitor.id}`}>
                <div>
                  <strong>{visitor.name}</strong>
                  <p>{visitor.source} - {visitor.nextStep}</p>
                </div>
                <button
                  className={prepared ? "queue-action is-done" : "queue-action"}
                  onClick={() => handlePrepareVisitorCommunication(visitor.id)}
                  type="button"
                >
                  <CheckCircle2 size={16} />
                  {prepared ? "Pronta" : "Preparar"}
                </button>
              </div>
            );
          })}
        </div>

        <div className="queue-panel">
          <div className="queue-heading">
            <Megaphone size={18} />
            <strong>Cumprimentos</strong>
            <span>{celebrationGreetingVisitors.length}</span>
          </div>
          {capturedVisitors.map((visitor) => {
            const greeted = greetedVisitorIds.includes(visitor.id);

            return (
              <div className="queue-item" key={`greeting-${visitor.id}`}>
                <div>
                  <strong>{visitor.name}</strong>
                  <p>Incluir nos cumprimentos da celebracao</p>
                </div>
                <button
                  className={greeted ? "queue-action is-done" : "queue-action"}
                  onClick={() => handleMarkGreetingComplete(visitor.id)}
                  type="button"
                >
                  <CheckCircle2 size={16} />
                  {greeted ? "Feito" : "Marcar"}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="reception-live-grid">
        <article className="directory-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Firestore</p>
              <h2>Entradas reais</h2>
            </div>
            <span className="soft-pill">{visitorIntakes.length}</span>
          </div>
          <div className="visitor-list">
            {visitorIntakes.length ? (
              visitorIntakes.map((intake) => (
                <div className="visitor-row" key={intake.id}>
                  <div className="avatar">{getInitials(intake.name)}</div>
                  <div>
                    <strong>{intake.name}</strong>
                    <p>{intake.source} - {intake.status}</p>
                    <small>{intake.greeting ?? "sem cumprimento registrado"}</small>
                  </div>
                  <span>Real</span>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <strong>Nenhuma entrada real carregada</strong>
                <p>Cadastre um visitante com Firebase conectado para popular esta lista.</p>
              </div>
            )}
          </div>
        </article>

        <article className="directory-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Jornadas</p>
              <h2>Acompanhamento</h2>
            </div>
            <span className="soft-pill">{visitorJourneys.length}</span>
          </div>
          <div className="visitor-list">
            {visitorJourneys.length ? (
              visitorJourneys.map((journey) => (
                <div className="visitor-row" key={journey.id}>
                  <div className="avatar">J</div>
                  <div>
                    <strong>{journey.personId}</strong>
                    <p>{journey.currentStage} - {journey.originChannel}</p>
                    <small>{journey.nextActionAt ?? "sem proxima acao"}</small>
                  </div>
                  <span>{journey.status}</span>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <strong>Nenhuma jornada carregada</strong>
                <p>As jornadas aparecem aqui depois da captura conectada ao Firestore.</p>
              </div>
            )}
          </div>
        </article>
      </section>
    </main>
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
