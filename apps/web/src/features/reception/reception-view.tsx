"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Megaphone,
  MessageSquareText,
  QrCode,
  Smartphone,
  UserPlus,
  Tv,
  Smartphone as TabletIcon,
  X,
  Send,
  MessageSquare,
  ArrowRight,
  Award
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import {
  createVisitorIntakeWorkflow,
  fetchVisitorIntakes,
  fetchVisitorJourneys,
  isFirebaseWebRuntimeConfigured,
  updateVisitorIntakeStatus,
  updateVisitorJourneyStage
} from "@alvo/firebase";
import type { VisitorIntake, VisitorJourney } from "@alvo/types";
import { useAppAuth } from "../../../app/providers";

type CapturedVisitor = {
  id: string;
  journeyId?: string;
  name: string;
  nextStep: string;
  personId?: string;
  phone?: string;
  source: string;
  status: string;
  note?: string;
};

const demoVisitors: CapturedVisitor[] = [
  {
    id: "visitor_demo_1",
    name: "Gabriela Fernandes",
    nextStep: "Enviar boas-vindas no WhatsApp",
    phone: "(11) 98765-4321",
    source: "Convite de membro",
    status: "Aguardando Contato",
    note: "Convidada por Patrícia do Grupo de Jovens"
  },
  {
    id: "visitor_demo_2",
    name: "Marcos Paulo Silveira",
    nextStep: "Enviar convite de célula",
    phone: "(21) 99876-5432",
    source: "Passando na rua",
    status: "Aguardando Contato",
    note: "Se interessou pelo ministério infantil"
  }
];

function mapIntakeToCapturedVisitor(
  intake: VisitorIntake,
  journey?: VisitorJourney
): CapturedVisitor {
  return {
    id: intake.id,
    journeyId: intake.journeyId || journey?.id,
    name: intake.name,
    nextStep: getVisitorNextStep(journey),
    personId: intake.personId,
    phone: intake.phone || undefined,
    source: intake.source,
    status: getVisitorIntakeStatusLabel(intake.status),
    note: intake.greeting || undefined
  };
}

function getVisitorNextStep(journey?: VisitorJourney) {
  switch (journey?.currentStage) {
    case "welcomed":
      return "Convidar para célula";
    case "invited_to_group":
      return "Acompanhar presença no grupo";
    case "attending_class":
      return "Acompanhar classe de integração";
    case "ready_for_membership":
      return "Preparar cadastro como membro";
    case "completed":
      return "Jornada concluída";
    case "new_visitor":
    default:
      return "Enviar boas-vindas no WhatsApp";
  }
}

function getVisitorIntakeStatusLabel(status: VisitorIntake["status"]) {
  switch (status) {
    case "captured":
      return "Capturado";
    case "journey_created":
      return "Jornada iniciada";
    case "greeting_scheduled":
      return "Pronto para saudação";
    case "archived":
      return "Arquivado";
    default:
      return "Jornada iniciada";
  }
}

export function ReceptionView() {
  const searchParams = useSearchParams();
  const { configured, firebaseReady, user, organizationId, firebaseConfig } = useAppAuth();
  
  // Estado básico
  const [visitorDraft, setVisitorDraft] = useState({
    name: "",
    phone: "",
    source: "Convite de membro",
    note: ""
  });
  const [capturedVisitors, setCapturedVisitors] = useState<CapturedVisitor[]>(demoVisitors);
  const [visitorJourneys, setVisitorJourneys] = useState<VisitorJourney[]>([]);
  const [visitorIntakes, setVisitorIntakes] = useState<VisitorIntake[]>([]);
  const [preparedCommunicationIds, setPreparedCommunicationIds] = useState<string[]>([]);
  const [greetedVisitorIds, setGreetedVisitorIds] = useState<string[]>([]);
  const [status, setStatus] = useState("Pronto para receber visitantes.");
  const [lastCreated, setLastCreated] = useState<CapturedVisitor | null>(null);

  // Estados Interativos Adicionais
  const [kioskMode, setKioskMode] = useState(false);
  const [pulpitMode, setPulpitMode] = useState(false);
  const [kioskStep, setKioskStep] = useState<"form" | "success">("form");

  useEffect(() => {
    if (searchParams.get("pastor") === "1") {
      setPulpitMode(true);
    }
  }, [searchParams]);
  
  // Template de comunicação por WhatsApp
  const [activeTemplateVisitor, setActiveTemplateVisitor] = useState<CapturedVisitor | null>(null);
  const [customMsg, setCustomMsg] = useState("");

  // Sync real-time do Firestore
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

        if (cancelled) return;

        setVisitorJourneys(nextJourneys);
        setVisitorIntakes(nextIntakes);
        if (nextIntakes.length > 0) {
          const journeyById = new Map(nextJourneys.map((journey) => [journey.id, journey]));
          setCapturedVisitors(
            nextIntakes.filter((intake) => intake.status !== "archived").map((intake) =>
              mapIntakeToCapturedVisitor(
                intake,
                intake.journeyId ? journeyById.get(intake.journeyId) : undefined
              )
            )
          );
        }
        setStatus(`${nextIntakes.length} entrada(s) e ${nextJourneys.length} jornada(s) sincronizadas.`);
      } catch (error) {
        if (!cancelled) {
          setStatus("Exibindo dados simulados de recepção.");
        }
      }
    }

    void loadVisitors();

    return () => {
      cancelled = true;
    };
  }, [configured, firebaseConfig, firebaseReady, organizationId, user]);

  // Função central para capturar visitante
  async function registerVisitor(name: string, phone: string, source: string, note?: string) {
    const localVisitor: CapturedVisitor = {
      id: `visitor_intake_${Date.now()}`,
      name,
      nextStep: "Enviar boas-vindas no WhatsApp",
      phone: phone || undefined,
      source,
      status: "Jornada iniciada",
      note: note || undefined
    };

    setCapturedVisitors((current) => [localVisitor, ...current]);
    setLastCreated(localVisitor);

    if (!configured || !user || !isFirebaseWebRuntimeConfigured(firebaseConfig)) {
      setStatus("Visitante cadastrado localmente no painel de recepção.");
      return localVisitor;
    }

    try {
      const created = await createVisitorIntakeWorkflow(
        firebaseConfig,
        { organizationId },
        {
          capturedByUserId: user.uid,
          name,
          note,
          phone,
          source
        }
      );
      const savedVisitor = {
        ...localVisitor,
        id: created.intakeId,
        journeyId: created.journeyId,
        personId: created.personId,
        status: "Sincronizado no Firestore"
      };

      setCapturedVisitors((current) =>
        current.map((v) => (v.id === localVisitor.id ? savedVisitor : v))
      );
      setLastCreated(savedVisitor);
      setStatus("Visitante salvo no Firestore com fluxo de jornada iniciado!");
      return savedVisitor;
    } catch (error) {
      setStatus("Cadastrado localmente.");
      return localVisitor;
    }
  }

  // Submit do formulário do painel
  const handleVisitorCaptureSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!visitorDraft.name.trim()) {
      setStatus("Por favor, preencha o nome do visitante.");
      return;
    }

    await registerVisitor(
      visitorDraft.name.trim(),
      visitorDraft.phone.trim(),
      visitorDraft.source,
      visitorDraft.note.trim()
    );

    setVisitorDraft({ name: "", phone: "", source: "Convite de membro", note: "" });
  };

  // Submit do formulário do Totem de Autoatendimento
  const handleKioskSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const name = (formData.get("kiosk_name") as string || "").trim();
    const phone = (formData.get("kiosk_phone") as string || "").trim();
    const source = (formData.get("kiosk_source") as string || "Passando na rua");

    if (!name) return;

    await registerVisitor(name, phone, source, "Autoatendimento Totem Entrada");
    setKioskStep("success");

    // Volta para o formulário após 5 segundos
    setTimeout(() => {
      setKioskStep("form");
      form.reset();
    }, 5500);
  };

  // Prepara WhatsApp Follow-up com Templates Reativos
  const openWhatsAppTemplateModal = (visitor: CapturedVisitor) => {
    setActiveTemplateVisitor(visitor);
    const templateText = `Olá, ${visitor.name}! Que alegria enorme ter você hoje conosco na Plataforma Esdras! ⛪✨\n\nQueremos que se sinta muito bem-vindo. Se precisar de qualquer ajuda, oração ou informação sobre nossas células, estou à disposição por aqui! Que Deus te abençoe!`;
    setCustomMsg(templateText);
  };

  const handleSendWhatsAppMessage = async () => {
    if (!activeTemplateVisitor) return;

    const phoneClean = (activeTemplateVisitor.phone || "").replace(/\D/g, "");
    if (!phoneClean) {
      alert("Este visitante não possui telefone cadastrado!");
      return;
    }

    const textEncoded = encodeURIComponent(customMsg);
    window.open(`https://web.whatsapp.com/send?phone=55${phoneClean}&text=${textEncoded}`, "_blank");

    // Marca como completado reativamente no painel
    setPreparedCommunicationIds((current) =>
      current.includes(activeTemplateVisitor.id) ? current : [...current, activeTemplateVisitor.id]
    );
    setCapturedVisitors((current) =>
      current.map((visitor) =>
        visitor.id === activeTemplateVisitor.id
          ? { ...visitor, status: "WhatsApp preparado" }
          : visitor
      )
    );

    if (firebaseConnected) {
      try {
        await updateVisitorIntakeStatus(firebaseConfig, { organizationId }, {
          intakeId: activeTemplateVisitor.id,
          status: "greeting_scheduled",
          updatedByUserId: user.uid
        });
      } catch (error) {
        setStatus("WhatsApp preparado localmente. Não foi possível atualizar o status na nuvem agora.");
        setActiveTemplateVisitor(null);
        return;
      }
    }

    setStatus(`WhatsApp de boas-vindas preparado para ${activeTemplateVisitor.name}.`);
    setActiveTemplateVisitor(null);
  };

  const handleMarkGreetingComplete = async (visitorId: string) => {
    const visitor = capturedVisitors.find((item) => item.id === visitorId);
    setGreetedVisitorIds((currentIds) =>
      currentIds.includes(visitorId) ? currentIds : [...currentIds, visitorId]
    );
    setCapturedVisitors((current) =>
      current.map((item) =>
        item.id === visitorId ? { ...item, status: "Saudado no altar" } : item
      )
    );

    if (visitor && firebaseConnected) {
      try {
        await Promise.all([
          updateVisitorIntakeStatus(firebaseConfig, { organizationId }, {
            intakeId: visitor.id,
            status: "archived",
            updatedByUserId: user.uid
          }),
          visitor.journeyId
            ? updateVisitorJourneyStage(firebaseConfig, { organizationId }, {
                journeyId: visitor.journeyId,
                stage: "welcomed",
                updatedByUserId: user.uid
              })
            : Promise.resolve()
        ]);
      } catch (error) {
        setStatus(
          visitor
            ? `${visitor.name} foi marcado localmente, mas a nuvem não atualizou agora.`
            : "Visitante marcado localmente, mas a nuvem não atualizou agora."
        );
        return;
      }
    }

    setStatus(visitor ? `${visitor.name} marcado como saudado no altar.` : "Visitante marcado como saudado.");
  };

  // Filtros
  const pendingCommunicationVisitors = capturedVisitors.filter(
    (visitor) => !preparedCommunicationIds.includes(visitor.id)
  );

  const celebrationGreetingVisitors = capturedVisitors.filter(
    (visitor) => !greetedVisitorIds.includes(visitor.id)
  );

  const cloudVisitorCount = visitorIntakes.length;
  const localVisitorCount = cloudVisitorCount ? 0 : capturedVisitors.length;
  const totalVisitorCount = cloudVisitorCount || localVisitorCount;
  const firebaseConnected = configured && firebaseReady && user && isFirebaseWebRuntimeConfigured(firebaseConfig);

  return (
    <main className="form-page reception-page animate-entrance">
      
      {/* 1. MODO TOTEM DE AUTOATENDIMENTO (Fullscreen Tablet/Kiosk Mode) */}
      {kioskMode && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "#090d16",
            zIndex: 300,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
            color: "white"
          }}
          className="animate-entrance"
        >
          {/* Botão de Fechar Totem */}
          <button
            onClick={() => setKioskMode(false)}
            style={{
              position: "absolute",
              top: 24,
              right: 24,
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "50%",
              width: 50,
              height: 50,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#94a3b8",
              cursor: "pointer"
            }}
          >
            <X size={24} />
          </button>

          {kioskStep === "form" ? (
            <div
              style={{
                width: "100%",
                maxWidth: 580,
                backgroundColor: "rgba(30, 41, 59, 0.4)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 32,
                padding: "3.5rem 3rem",
                textAlign: "center",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.6)",
                backdropFilter: "blur(8px)"
              }}
            >
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "1rem" }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", backgroundColor: "rgba(249, 115, 22, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#f97316" }}>
                  <Award size={32} />
                </div>
              </div>
              <h2 style={{ fontSize: "1.15rem", fontWeight: 800, marginBottom: "0.25rem" }}>Seja Bem-vindo! ⛪</h2>
              <p style={{ color: "#94a3b8", fontSize: "0.95rem", marginBottom: "2.5rem" }}>
                Ficamos muito contentes com sua presença. Preencha seus dados rápidos para podermos te acolher com carinho hoje!
              </p>

              <form onSubmit={handleKioskSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem", textAlign: "left" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <label style={{ fontSize: "0.9rem", color: "#f97316", fontWeight: 800 }}>Seu Nome Completo *</label>
                  <input
                    required
                    name="kiosk_name"
                    placeholder="Digite seu nome completo"
                    style={{ width: "100%", padding: "1rem 1.25rem", fontSize: "1.1rem", backgroundColor: "#0f172a", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: 16, color: "white", outline: "none" }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <label style={{ fontSize: "0.9rem", color: "#f97316", fontWeight: 800 }}>WhatsApp / Celular</label>
                  <input
                    name="kiosk_phone"
                    placeholder="(00) 90000-0000"
                    style={{ width: "100%", padding: "1rem 1.25rem", fontSize: "1.1rem", backgroundColor: "#0f172a", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: 16, color: "white", outline: "none" }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <label style={{ fontSize: "0.9rem", color: "#f97316", fontWeight: 800 }}>Como você conheceu a Plataforma Esdras?</label>
                  <select
                    name="kiosk_source"
                    style={{ width: "100%", padding: "1rem 1.25rem", fontSize: "1.1rem", backgroundColor: "#0f172a", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: 16, color: "white", outline: "none" }}
                  >
                    <option value="Convite de membro">Fui convidado por um amigo / familiar</option>
                    <option value="Instagram">Instagram / Redes Sociais</option>
                    <option value="Passando na rua">Moro perto / vi o templo</option>
                    <option value="Evento especial">Vim para um evento especial</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="primary-button"
                  style={{ width: "100%", padding: "1.1rem", fontSize: "1.15rem", backgroundColor: "#f97316", color: "white", borderRadius: 16, marginTop: "1rem", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                >
                  Confirmar Cadastro
                  <ArrowRight size={20} />
                </button>
              </form>
            </div>
          ) : (
            <div
              style={{
                textAlign: "center",
                maxWidth: 500
              }}
              className="animate-entrance"
            >
              <div
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: "50%",
                  backgroundColor: "#16a34a",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  margin: "0 auto 2rem",
                  boxShadow: "0 0 40px rgba(22, 163, 74, 0.4)"
                }}
              >
                <CheckCircle2 size={54} strokeWidth={3} />
              </div>
              <h1 style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: "0.5rem" }}>Cadastro Concluído! 🎉</h1>
              <p style={{ fontSize: "1.25rem", color: "#94a3b8", lineHeight: "1.8rem" }}>
                Muito obrigado, <strong>{lastCreated?.name}</strong>! Já registramos a sua chegada.
              </p>
              <p style={{ fontSize: "0.95rem", color: "#f97316", fontWeight: 700, marginTop: "1.5rem" }}>
                Procure nossa equipe de acolhimento na saída para retirar um presente especial! 🎁
              </p>
              <div style={{ marginTop: "3rem", fontSize: "0.85rem", color: "#64748b" }}>
                Esta tela reiniciará automaticamente em instantes...
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. MODO ALTAR / TELEPROMPTER DO PASTOR (Pulpit Live Feed Screen) */}
      {pulpitMode && (
        <div className="pulpit-live-feed animate-entrance">
          {/* Cabeçalho de Púlpito */}
          <div className="pulpit-header">
            <div>
              <span className="pulpit-eyebrow">
                <Tv size={16} />
                Painel do Pastor
              </span>
              <h1>Boas-vindas no Culto</h1>
              <p>Lista limpa para saudação pública, com observações importantes da recepção.</p>
            </div>
            <div className="pulpit-header-actions">
              <span className="pulpit-counter">
                <strong>{celebrationGreetingVisitors.length}</strong>
                <span>na lista</span>
              </span>
              <button
                onClick={() => setPulpitMode(false)}
                className="pulpit-back-btn"
              >
                Voltar
              </button>
            </div>
          </div>

          {/* Lista Teleprompter */}
          <div className="pulpit-card-grid">
            {celebrationGreetingVisitors.length > 0 ? (
              celebrationGreetingVisitors.map((visitor, idx) => (
                <div
                  key={visitor.id}
                  className="pulpit-card"
                >
                  <div>
                    <span className="pulpit-card-number">#{idx + 1}</span>
                    <h2 className="pulpit-card-title">
                      {visitor.name}
                    </h2>
                    {visitor.note && (
                      <p className="pulpit-card-note">
                        <Megaphone size={20} />
                        {visitor.note}
                      </p>
                    )}
                  </div>
                  
                  <div className="pulpit-card-footer">
                    <span className="pulpit-card-source">Origem: <strong>{visitor.source}</strong></span>
                    <button
                      onClick={() => handleMarkGreetingComplete(visitor.id)}
                      className="pulpit-card-btn"
                    >
                      <CheckCircle2 size={18} />
                      Cumprimentado
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="pulpit-empty-state">
                <Tv size={64} />
                <h3>Nenhum visitante pendente de boas-vindas no altar.</h3>
                <p>Quando a recepção preparar nomes para saudação, eles aparecerão aqui.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. MODAL / GAVETA DE TEMPLATE WHATSAPP */}
      {activeTemplateVisitor && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(9, 13, 22, 0.8)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(6px)"
          }}
          className="animate-entrance"
        >
          <div
            style={{
              background: "var(--alvo-surface)",
              border: "1px solid var(--alvo-line)",
              borderRadius: 24,
              padding: "2.5rem",
              width: "100%",
              maxWidth: 520,
              boxShadow: "var(--alvo-shadow-strong)",
              color: "var(--alvo-ink)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--alvo-ink)", display: "flex", alignItems: "center", gap: 8 }}>
                <MessageSquare size={20} style={{ color: "#25d366" }} />
                Disparar WhatsApp de Boas-vindas
              </h3>
              <button
                onClick={() => setActiveTemplateVisitor(null)}
                style={{ background: "none", border: "none", color: "var(--alvo-ink-soft)", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <p style={{ fontSize: "0.85rem", color: "var(--alvo-ink-soft)" }}>
                Selecione ou edite a mensagem abaixo para enviar diretamente ao celular de <strong>{activeTemplateVisitor.name}</strong> ({activeTemplateVisitor.phone}):
              </p>

              {/* Botões rápidos de alternar templates */}
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={() => {
                    const text = `Olá, ${activeTemplateVisitor.name}! Que alegria enorme ter você hoje conosco na Plataforma Esdras! ⛪✨\n\nQueremos que se sinta muito bem-vindo. Se precisar de qualquer ajuda, oração ou informação sobre nossas células, estou à disposição por aqui! Que Deus te abençoe!`;
                    setCustomMsg(text);
                  }}
                  style={{
                    backgroundColor: "var(--alvo-surface-muted)",
                    border: "1px solid var(--alvo-line)",
                    borderRadius: 8,
                    padding: "6px 12px",
                    fontSize: "0.75rem",
                    color: "var(--alvo-ink-soft)",
                    cursor: "pointer"
                  }}
                >
                  Template 1 (Geral)
                </button>
                <button
                  onClick={() => {
                    const text = `Olá, ${activeTemplateVisitor.name}! Ficamos muito felizes com a sua visita na Plataforma Esdras por convite de membro! 😊\n\nGostaríamos de te convidar para o nosso encontro de Célula de meio de semana. É um lugar descontraído para fazermos novos amigos e conversar sobre a bíblia. O que acha de nos fazer uma visita?`;
                    setCustomMsg(text);
                  }}
                  style={{
                    backgroundColor: "var(--alvo-surface-muted)",
                    border: "1px solid var(--alvo-line)",
                    borderRadius: 8,
                    padding: "6px 12px",
                    fontSize: "0.75rem",
                    color: "var(--alvo-ink-soft)",
                    cursor: "pointer"
                  }}
                >
                  Template 2 (Célula)
                </button>
              </div>

              {/* Textarea Editor */}
              <textarea
                value={customMsg}
                onChange={(e) => setCustomMsg(e.target.value)}
                style={{
                  width: "100%",
                  height: 180,
                  padding: "1rem",
                  backgroundColor: "var(--alvo-field-bg)",
                  border: "1px solid var(--alvo-line)",
                  borderRadius: 12,
                  color: "var(--alvo-ink)",
                  fontSize: "0.85rem",
                  lineHeight: "1.3rem",
                  outline: "none",
                  resize: "none"
                }}
              />

              <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                <button
                  type="button"
                  onClick={() => setActiveTemplateVisitor(null)}
                  className="secondary-button"
                  style={{ width: "50%", padding: "0.85rem", color: "var(--alvo-ink-soft)", borderColor: "var(--alvo-line)" }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSendWhatsAppMessage}
                  disabled={!activeTemplateVisitor.phone}
                  className="primary-button"
                  style={{ width: "50%", padding: "0.85rem", backgroundColor: "#25d366", color: "white", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, border: "none", opacity: activeTemplateVisitor.phone ? 1 : 0.55 }}
                >
                  <Send size={16} />
                  {activeTemplateVisitor.phone ? "Enviar WhatsApp" : "Sem telefone"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Header */}
      <header className="reception-header-container">
        <div className="reception-header-top-row">
          <Link className="back-link-premium" href="/">
            ← Voltar ao painel
          </Link>
        </div>
        
        <div className="reception-header-main-row">
          <div className="reception-header-left">
            <span className="eyebrow-premium">Recepção Inteligente</span>
            <h1 className="title-premium">Integração e Boas-vindas</h1>
            <p className="desc-premium">
              Uma tela rápida para tablet, celular ou notebook na entrada: captura o
              visitante, inicia a jornada pastoral e aciona follow-ups e altar.
            </p>
          </div>
          
          <div className="reception-header-right">
             <button
               onClick={() => setKioskMode(true)}
               className="reception-action-btn-ghost"
             >
               <TabletIcon size={16} />
               Modo Totem
             </button>
             <button
               onClick={() => setPulpitMode(true)}
               className="reception-action-btn-purple"
             >
               <Tv size={16} />
               Painel do Pastor
             </button>
          </div>
        </div>

        <nav className="reception-nav-tabs">
          <Link className="reception-tab-item is-active" href="/reception">
            Painel Geral
          </Link>
          <Link className="reception-tab-item" href="/members">
            Base de Membros
          </Link>
          <Link className="reception-tab-item" href="/members/new">
            Cadastrar Membro
          </Link>
        </nav>
      </header>

      {/* KPI Cards Strip */}
      <section className="reception-kpi-grid">
        <div className="reception-kpi-card">
          <span className="reception-kpi-label">Total de Visitantes</span>
          <strong className="reception-kpi-val val-blue">
            {totalVisitorCount}
          </strong>
          <small className="reception-kpi-desc text-green">
             {cloudVisitorCount ? `${cloudVisitorCount} sincronizados na nuvem` : `${localVisitorCount} no painel local`}
          </small>
        </div>
        <div className="reception-kpi-card">
          <span className="reception-kpi-label">Aguardando WhatsApp</span>
          <strong className="reception-kpi-val val-orange">
            {pendingCommunicationVisitors.length}
          </strong>
          <small className="reception-kpi-desc">
             Contatos ainda não iniciados
          </small>
        </div>
        <div className="reception-kpi-card">
          <span className="reception-kpi-label">Para Saudar no Altar</span>
          <strong className="reception-kpi-val val-purple">
            {celebrationGreetingVisitors.length}
          </strong>
          <small className="reception-kpi-desc">
             Nomes prontos no teleprompter
          </small>
        </div>
        <div className="reception-kpi-card">
          <span className="reception-kpi-label">Jornadas Ativas</span>
          <strong className="reception-kpi-val val-green">
            {visitorJourneys.length}
          </strong>
          <small className="reception-kpi-desc text-green">
             {firebaseConnected ? "Sincronizadas no Firebase" : "Aguardando conexão Firebase"}
          </small>
        </div>
      </section>

      {/* Main Grid: Ficha de Cadastro + Fluxo / Success Alert */}
      <section className="reception-command-grid">
        
        {/* Lado Esquerdo: Ficha de Entrada de Visitante */}
        <form className="visitor-form reception-capture-card" onSubmit={handleVisitorCaptureSubmit}>
          <p className="eyebrow">Entrada Rápida</p>
          <h2>Registrar Visitante</h2>
          
          <label style={{ color: "var(--alvo-ink)" }}>
            Nome Completo do Visitante *
            <input
              aria-label="Nome do visitante"
              required
              onChange={(event) =>
                setVisitorDraft((draft) => ({ ...draft, name: event.target.value }))
              }
              placeholder="Ex: João Pereira"
              value={visitorDraft.name}
              style={{ backgroundColor: "var(--alvo-field-bg)", border: "1px solid var(--alvo-line)", borderRadius: 12, color: "var(--alvo-ink)" }}
            />
          </label>
          <label style={{ color: "var(--alvo-ink)" }}>
            WhatsApp ou Telefone
            <input
              aria-label="WhatsApp ou telefone"
              onChange={(event) =>
                setVisitorDraft((draft) => ({ ...draft, phone: event.target.value }))
              }
              placeholder="(00) 90000-0000"
              value={visitorDraft.phone}
              style={{ backgroundColor: "var(--alvo-field-bg)", border: "1px solid var(--alvo-line)", borderRadius: 12, color: "var(--alvo-ink)" }}
            />
          </label>
          
          <div className="reception-form-row">
            <label style={{ color: "var(--alvo-ink)" }}>
              Origem do Contato
              <select
                aria-label="Origem do visitante"
                onChange={(event) =>
                  setVisitorDraft((draft) => ({ ...draft, source: event.target.value }))
                }
                value={visitorDraft.source}
                style={{ backgroundColor: "var(--alvo-field-bg)", border: "1px solid var(--alvo-line)", borderRadius: 12, color: "var(--alvo-ink)" }}
              >
                <option>Convite de membro</option>
                <option>WhatsApp</option>
                <option>Instagram</option>
                <option>Passando na rua</option>
                <option>Evento especial</option>
              </select>
            </label>
            <label style={{ color: "var(--alvo-ink)" }}>
              Anotação / Observação
              <input
                placeholder="Ex: Convidado por Patrícia"
                value={visitorDraft.note}
                onChange={(e) => setVisitorDraft(draft => ({ ...draft, note: e.target.value }))}
                style={{ backgroundColor: "var(--alvo-field-bg)", border: "1px solid var(--alvo-line)", borderRadius: 12, color: "var(--alvo-ink)" }}
              />
            </label>
          </div>

          <button className="primary-button compact" type="submit" style={{ color: "white", borderRadius: 12, height: 48, marginTop: "1rem" }}>
            <UserPlus size={17} />
            Iniciar Jornada Pastoral
          </button>
          <p className="form-status" style={{ color: "var(--alvo-blue)" }}>✨ {status}</p>
        </form>

        {/* Lado Direito: Banner de Fluxo e Success Alert */}
        <article className="reception-route-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Acolhimento Estruturado</p>
              <h2 style={{ color: "var(--alvo-ink)" }}>Fluxo da Porta ao Cuidado</h2>
            </div>
            <span className="soft-pill">4 etapas pastorais</span>
          </div>
          <div className="reception-step-lane">
            <div>
              <QrCode size={20} style={{ color: "var(--alvo-blue)" }} />
              <strong>1. Capturar</strong>
              <p>Voluntário ou Totem de entrada registra dados.</p>
            </div>
            <div>
              <Megaphone size={20} style={{ color: "#a855f7" }} />
              <strong>2. Saudar</strong>
              <p>Boas-vindas públicas no púlpito pelo pastor.</p>
            </div>
            <div>
              <Smartphone size={20} style={{ color: "var(--alvo-accent)" }} />
              <strong>3. Conectar</strong>
              <p>Acolhimento envia WhatsApp personalizado.</p>
            </div>
            <div>
              <MessageSquareText size={20} style={{ color: "var(--alvo-green)" }} />
              <strong>4. Integrar</strong>
              <p>Membro acompanha e encaminha para célula.</p>
            </div>
          </div>
          {lastCreated ? (
            <div className="reception-success-card animate-entrance" style={{ background: "rgba(6, 182, 212, 0.08)", border: "1px solid rgba(6, 182, 212, 0.25)" }}>
              <div className="success-icon" style={{ backgroundColor: "var(--alvo-blue)" }}>
                <CheckCircle2 size={24} strokeWidth={3} />
              </div>
              <div className="success-content">
                <strong style={{ color: "var(--alvo-ink)" }}>{lastCreated.name}</strong>
                <p style={{ color: "var(--alvo-ink-soft)" }}>
                  {lastCreated.status === "Sincronizado no Firestore" 
                    ? "Jornada pastoral iniciada com sucesso no banco de dados!" 
                    : lastCreated.status}
                </p>
                {lastCreated.personId ? (
                  <Link className="primary-pill compact" href={`/members/${lastCreated.personId}`} style={{ backgroundColor: "var(--alvo-blue)" }}>
                    Ver Perfil Completo
                  </Link>
                ) : (
                  <span className="soft-pill">Sincronizado localmente</span>
                )}
              </div>
            </div>
          ) : null}
        </article>
      </section>

      {/* Seção das Filas de Trabalho e Triagem */}
      <section className="reception-workbench page-workbench">
        
        {/* Fila de Mensagens WhatsApp */}
        <div className="queue-panel">
          <div className="queue-heading" style={{ borderBottomColor: "var(--alvo-line)" }}>
            <MessageSquareText size={18} style={{ color: "#25d366" }} />
            <strong style={{ color: "var(--alvo-ink)" }}>Fila de Comunicação</strong>
            <span style={{ backgroundColor: "rgba(37,211,102,0.15)", color: "#25d366" }}>{pendingCommunicationVisitors.length}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
            {pendingCommunicationVisitors.length ? (
              pendingCommunicationVisitors.map((visitor) => (
                <div className="queue-item" key={`communication-${visitor.id}`}>
                  <div>
                    <strong style={{ color: "var(--alvo-ink)" }}>{visitor.name}</strong>
                    <p style={{ color: "var(--alvo-ink-soft)" }}>{visitor.source} · {visitor.phone || "Sem telefone"}</p>
                  </div>
                  <button
                    className="queue-action"
                    disabled={!visitor.phone}
                    onClick={() => openWhatsAppTemplateModal(visitor)}
                    type="button"
                    title={visitor.phone ? "Preparar mensagem de WhatsApp" : "Cadastre um telefone para disparar WhatsApp"}
                  >
                    <CheckCircle2 size={16} />
                    {visitor.phone ? "Disparar" : "Sem telefone"}
                  </button>
                </div>
              ))
            ) : (
              <div className="empty-state compact">
                <strong>Comunicação em dia</strong>
                <p>Todos os visitantes da fila local já receberam o encaminhamento de boas-vindas.</p>
              </div>
            )}
          </div>
        </div>

        {/* Fila de Cumprimentos do Altar */}
        <div className="queue-panel">
          <div className="queue-heading" style={{ borderBottomColor: "var(--alvo-line)" }}>
            <Megaphone size={18} style={{ color: "#8b5cf6" }} />
            <strong style={{ color: "var(--alvo-ink)" }}>Fila de Boas-vindas Altar</strong>
            <span style={{ backgroundColor: "rgba(139,92,246,0.15)", color: "#8b5cf6" }}>{celebrationGreetingVisitors.length}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
            {celebrationGreetingVisitors.length ? (
              celebrationGreetingVisitors.map((visitor) => (
                <div className="queue-item" key={`greeting-${visitor.id}`}>
                  <div>
                    <strong style={{ color: "var(--alvo-ink)" }}>{visitor.name}</strong>
                    <p style={{ color: "var(--alvo-ink-soft)" }}>{visitor.note || "Visitante da celebração de hoje"}</p>
                  </div>
                  <button
                    className="queue-action"
                    onClick={() => handleMarkGreetingComplete(visitor.id)}
                    type="button"
                  >
                    <CheckCircle2 size={16} />
                    Saudar
                  </button>
                </div>
              ))
            ) : (
              <div className="empty-state compact">
                <strong>Altar em dia</strong>
                <p>Todos os visitantes da fila local já foram marcados como saudados.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Sincronização do Banco de Dados Real */}
      <section className="reception-live-grid">
        
        {/* Entradas Reais do Firestore */}
        <article className="directory-panel">
          <div className="section-heading" style={{ borderBottomColor: "var(--alvo-line)", paddingBottom: "1rem", marginBottom: "1rem" }}>
            <div>
              <p className="eyebrow" style={{ color: "#0ea5e9" }}>Nuvem Firestore</p>
              <h2 style={{ color: "var(--alvo-ink)" }}>Entradas em Tempo Real</h2>
            </div>
            <span className="soft-pill">{visitorIntakes.length} cadastradas</span>
          </div>
          <div className="visitor-list">
            {visitorIntakes.length ? (
              visitorIntakes.map((intake) => (
                <div className="visitor-row" key={intake.id} style={{ borderBottomColor: "var(--alvo-line)", padding: "10px 0" }}>
                  <div className="avatar" style={{ backgroundColor: "#0ea5e9", color: "white", fontWeight: 700 }}>
                    {getInitials(intake.name)}
                  </div>
                  <div>
                    <strong style={{ color: "var(--alvo-ink)" }}>{intake.name}</strong>
                    <p style={{ color: "var(--alvo-ink-soft)" }}>{intake.source} - {intake.status || "Ativo"}</p>
                    <small style={{ color: "var(--alvo-ink-soft)", opacity: 0.8 }}>{intake.greeting ?? "Acolhimento pastoral pendente"}</small>
                  </div>
                  <span style={{ fontSize: "0.75rem", background: "rgba(16,185,129,0.15)", color: "#10b981", padding: "4px 8px", borderRadius: 8 }}>Firestore</span>
                </div>
              ))
            ) : (
              <div className="empty-state" style={{ padding: "3rem 1rem" }}>
                <strong style={{ color: "var(--alvo-ink-soft)", display: "block", marginBottom: 4 }}>Nenhuma Entrada Cloud Encontrada</strong>
                <p style={{ color: "var(--alvo-ink-soft)", opacity: 0.8 }}>O simulador local está pronto. Conecte o Firebase para carregar registros dinâmicos.</p>
              </div>
            )}
          </div>
        </article>

        {/* Jornadas Pastorais Ativas */}
        <article className="directory-panel">
          <div className="section-heading" style={{ borderBottomColor: "var(--alvo-line)", paddingBottom: "1rem", marginBottom: "1rem" }}>
            <div>
              <p className="eyebrow" style={{ color: "#10b981" }}>Monitor de Funil</p>
              <h2 style={{ color: "var(--alvo-ink)" }}>Acompanhamento Pastoral</h2>
            </div>
            <span className="soft-pill">{visitorJourneys.length} ativas</span>
          </div>
          <div className="visitor-list">
            {visitorJourneys.length ? (
              visitorJourneys.map((journey) => (
                <div className="visitor-row" key={journey.id} style={{ borderBottomColor: "var(--alvo-line)", padding: "10px 0" }}>
                  <div className="avatar" style={{ backgroundColor: "#10b981", color: "white", fontWeight: 700 }}>J</div>
                  <div>
                    <strong style={{ color: "var(--alvo-ink)" }}>{journey.personId}</strong>
                    <p style={{ color: "var(--alvo-ink-soft)" }}>Estágio: {journey.currentStage} · Origem: {journey.originChannel}</p>
                    <small style={{ color: "var(--alvo-ink-soft)", opacity: 0.8 }}>Próximo passo planejado em: {journey.nextActionAt ?? "Imediato"}</small>
                  </div>
                  <span style={{ fontSize: "0.75rem", background: "var(--alvo-surface-muted)", color: "var(--alvo-ink-soft)", padding: "4px 8px", borderRadius: 8 }}>{journey.status}</span>
                </div>
              ))
            ) : (
              <div className="empty-state" style={{ padding: "3rem 1rem" }}>
                <strong style={{ color: "var(--alvo-ink-soft)", display: "block", marginBottom: 4 }}>Nenhuma Jornada Ativa Carregada</strong>
                <p style={{ color: "var(--alvo-ink-soft)", opacity: 0.8 }}>As jornadas pastorais ajudam a consolidar os novos convertidos em membros ativos.</p>
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
