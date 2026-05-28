"use client";

import { useState, useEffect, useMemo, type FormEvent } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Handshake,
  ShieldCheck,
  ShieldAlert,
  ChevronRight,
  Plus,
  Search,
  Users,
  UsersRound,
  Calendar,
  MessageSquare,
  Sparkles,
  ChevronLeft,
  X,
  FileText,
  Send,
  UserCheck
} from "lucide-react";
import {
  saveServiceAssignment,
  savePersonProfile,
  fetchServiceAssignments,
  fetchPeople,
  isFirebaseWebRuntimeConfigured
} from "@alvo/firebase";
import { getTribeDisplayLabel } from "@alvo/domain";
import { recentPeople } from "../../lib/mock-data";
import type { Person, ServiceAssignment, ServiceAssignmentStatus } from "@alvo/types";
import { useAppAuth } from "../../../app/providers";

const ministryTeams = [
  {
    code: "reception",
    name: "Recepção e Portaria",
    summary: "Primeira impressão, visitantes, segurança e acolhimento.",
    target: 6
  },
  {
    code: "media",
    name: "Mídia, Som e Transmissão",
    summary: "Slides, áudio, vídeo, lives e apoio técnico da celebração.",
    target: 5
  },
  {
    code: "worship",
    name: "Louvor e Banda",
    summary: "Vocal, instrumentos, ensaio, repertório e passagem de som.",
    target: 8
  },
  {
    code: "kids",
    name: "Crianças",
    summary: "Sala infantil, check-in, cuidado e atividades por faixa etária.",
    target: 7
  },
  {
    code: "operations",
    name: "Limpeza e Organização",
    summary: "Montagem, limpeza, café, cadeiras e apoio em eventos.",
    target: 10
  }
] as const;

const initialAssignments: ServiceAssignment[] = [
  {
    id: "scale_reception_1",
    organizationId: "demo_org",
    serviceTeamId: "reception",
    ministryCode: "reception",
    personId: "person_1",
    role: "Recepção Principal",
    serviceDate: "2026-05-24T08:30:00.000Z",
    status: "confirmed",
    createdAt: "2026-04-29T08:30:00.000Z",
    updatedAt: "2026-04-29T08:30:00.000Z"
  },
  {
    id: "scale_media_1",
    organizationId: "demo_org",
    serviceTeamId: "media",
    ministryCode: "media",
    personId: "person_2",
    role: "Mesa de Som",
    serviceDate: "2026-05-24T08:00:00.000Z",
    status: "pending",
    createdAt: "2026-04-29T08:30:00.000Z",
    updatedAt: "2026-04-29T08:30:00.000Z"
  },
  {
    id: "scale_worship_1",
    organizationId: "demo_org",
    serviceTeamId: "worship",
    ministryCode: "worship",
    personId: "person_3",
    role: "Vocal Principal",
    serviceDate: "2026-05-24T07:45:00.000Z",
    status: "confirmed",
    createdAt: "2026-04-29T08:30:00.000Z",
    updatedAt: "2026-04-29T08:30:00.000Z"
  },
  {
    id: "scale_kids_1",
    organizationId: "demo_org",
    serviceTeamId: "kids",
    ministryCode: "kids",
    personId: "person_4",
    role: "Sala 4-7 Anos",
    serviceDate: "2026-05-24T08:45:00.000Z",
    status: "pending",
    createdAt: "2026-04-29T08:30:00.000Z",
    updatedAt: "2026-04-29T08:30:00.000Z"
  }
];

export function ServingView() {
  const { configured, firebaseReady, user, organizationId, firebaseConfig } = useAppAuth();
  const [people, setPeople] = useState<Person[]>([]);
  const [assignments, setAssignments] = useState<ServiceAssignment[]>(initialAssignments);
  
  // Custom tracking for audit trail log
  const [auditLogs, setAuditLogs] = useState<Array<{ time: string; text: string; type: "success" | "info" | "warning" }>>([
    { time: "18:42", text: "Escala para o culto de 24/05/2026 inicializada.", type: "info" },
    { time: "18:43", text: "Ana Silva confirmou recepção via link automático.", type: "success" }
  ]);

  const [assignMode, setAssignMode] = useState<"members" | "new">("members");
  const [selectedMinistryCode, setSelectedMinistryCode] = useState<(typeof ministryTeams)[number]["code"]>("reception");
  const [status, setStatus] = useState("Carregando escalas...");
  
  // Interactive Reminders
  const [selectedAssignmentForReminder, setSelectedAssignmentForReminder] = useState<ServiceAssignment | null>(null);
  const [whatsappTemplate, setWhatsappTemplate] = useState("Olá [Nome]! Confirmando a sua escala no ministério de [Ministerio] para o dia [Data] no papel de [Role]. Confirma sua presença?");

  // Schedule matrix selected day (Sunday 24/05/2026 or 31/05/2026)
  const [selectedDateFilter, setSelectedDateFilter] = useState("2026-05-24");
  
  // Search state for members
  const [memberSearch, setMemberSearch] = useState("");

  const [servantDraft, setServantDraft] = useState({
    email: "",
    name: "",
    phone: "",
    role: "Apoio"
  });

  useEffect(() => {
    if (!configured || !firebaseReady || !user || !isFirebaseWebRuntimeConfigured(firebaseConfig)) {
      setPeople(recentPeople as unknown as Person[]);
      setStatus("Demonstração (Firebase offline). Pessoas locais carregadas.");
      return;
    }

    let cancelled = false;

    async function loadServingData() {
      setStatus("Sincronizando pessoas para montar escalas...");

      try {
        const [nextPeople, nextAssignments] = await Promise.all([
          fetchPeople(firebaseConfig, { organizationId }, 160),
          fetchServiceAssignments(firebaseConfig, { organizationId }, 160)
        ]);

        if (cancelled) return;

        const finalPeople = nextPeople.length > 0 ? nextPeople : (recentPeople as unknown as Person[]);
        const finalAssignments = nextAssignments.length > 0 ? nextAssignments : (assignments as unknown as ServiceAssignment[]);

        setPeople(finalPeople);
        setAssignments(finalAssignments);
        
        setStatus(
          nextAssignments.length
            ? `${nextAssignments.length} escala(s) sincronizada(s) com ${nextPeople.length} pessoa(s).`
            : `${finalPeople.length} pessoa(s) disponíveis (modo hibrido/mock).`
        );
      } catch (error) {
        if (!cancelled) {
          setStatus(error instanceof Error ? error.message : "Não foi possível carregar pessoas.");
        }
      }
    }

    void loadServingData();

    return () => {
      cancelled = true;
    };
  }, [configured, firebaseConfig, firebaseReady, organizationId, user]);

  const selectedMinistry = ministryTeams.find((team) => team.code === selectedMinistryCode) ?? ministryTeams[0];
  
  // Filter assignments by selected ministry AND selected date filter
  const selectedAssignments = useMemo(() => {
    return assignments.filter(
      (assignment) => 
        assignment.ministryCode === selectedMinistry.code &&
        assignment.serviceDate.startsWith(selectedDateFilter)
    );
  }, [assignments, selectedMinistry.code, selectedDateFilter]);

  const selectedPendingCount = selectedAssignments.filter(
    (assignment) => assignment.status === "pending"
  ).length;

  const pendingCount = assignments.filter((assignment) => assignment.status === "pending").length;
  const confirmedCount = assignments.filter((assignment) =>
    ["confirmed", "present"].includes(assignment.status)
  ).length;
  const declinedCount = assignments.filter((assignment) =>
    ["declined", "absent"].includes(assignment.status)
  ).length;
  
  const coverage = Math.round((confirmedCount / Math.max(assignments.length, 1)) * 100);
  
  const availablePeople = people.filter((person) =>
    ["member", "leader", "volunteer"].includes(person.memberStatus)
  );

  // Filtered available people for manual picker
  const filteredCandidatePeople = useMemo(() => {
    const list = availablePeople.length ? availablePeople : people;
    if (!memberSearch) return list;
    return list.filter(p => 
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(memberSearch.toLowerCase())
    );
  }, [people, availablePeople, memberSearch]);

  const nextActionLabel =
    selectedAssignments.length === 0
      ? "Monte a primeira escala deste ministério"
      : selectedPendingCount > 0
        ? "Acompanhe quem ainda precisa responder"
        : "Registre presença no dia da celebração";

  async function handleAssignmentStatus(
    assignmentId: string,
    nextStatus: ServiceAssignmentStatus,
    responseNote?: string
  ) {
    const currentAssignment = assignments.find((assignment) => assignment.id === assignmentId);

    if (!currentAssignment) {
      setStatus("Não encontramos essa escala para atualizar.");
      return;
    }

    const updatedAssignment = applyAssignmentStatus(currentAssignment, nextStatus, responseNote);
    const person = people.find(p => p.id === currentAssignment.personId);
    const personName = person ? getFullName(person) : "Voluntário";

    setAssignments((currentAssignments) =>
      currentAssignments.map((assignment) =>
        assignment.id === assignmentId ? updatedAssignment : assignment
      )
    );

    const timeString = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const statusLabel = getAssignmentStatusLabel(nextStatus);
    setAuditLogs(prev => [
      { time: timeString, text: `${personName} foi marcado como ${statusLabel}.`, type: nextStatus === "confirmed" ? "success" : "info" },
      ...prev
    ]);

    setStatus(`Escala marcada como ${statusLabel}.`);

    if (configured && firebaseReady && user && isFirebaseWebRuntimeConfigured(firebaseConfig)) {
      try {
        await saveServiceAssignment(firebaseConfig, { organizationId }, updatedAssignment);
        setStatus(`Escala marcada como ${statusLabel} e sincronizada.`);
      } catch (error) {
        setStatus(
          error instanceof Error
            ? `Escala atualizada localmente, mas o Firebase retornou: ${error.message}`
            : "Escala atualizada localmente, mas não foi possível sincronizar."
        );
      }
    }
  }

  async function handleQuickAssign(person: Person, role = "Apoio") {
    const serviceDateTime = `${selectedDateFilter}T08:30:00.000Z`;
    const now = new Date().toISOString();
    const newAssignment: ServiceAssignment = {
      id: `service_assignment_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      organizationId,
      serviceTeamId: selectedMinistry.code,
      ministryCode: selectedMinistry.code,
      personId: person.id,
      role,
      serviceDate: serviceDateTime,
      status: "pending",
      createdAt: now,
      updatedAt: now
    };
    setAssignments((currentAssignments) => [newAssignment, ...currentAssignments]);
    
    const timeString = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    setAuditLogs(prev => [
      { time: timeString, text: `${getFullName(person)} foi escalado(a) como ${role} em ${selectedMinistry.name}.`, type: "info" },
      ...prev
    ]);

    setStatus(`${getFullName(person)} escalado em ${selectedMinistry.name}.`);

    if (configured && firebaseReady && user && isFirebaseWebRuntimeConfigured(firebaseConfig)) {
      try {
        await saveServiceAssignment(firebaseConfig, { organizationId }, newAssignment);
        setStatus(`${getFullName(person)} escalado em ${selectedMinistry.name} e salvo no Firebase.`);
      } catch (error) {
        setStatus(
          error instanceof Error
            ? `Escala local criada, mas o Firebase retornou: ${error.message}`
            : "Escala local criada, mas não foi possível salvar no Firebase."
        );
      }
    }

    return newAssignment;
  }

  async function handleServantRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const fullName = servantDraft.name.trim();
    const role = servantDraft.role.trim() || "Apoio";

    if (!fullName) {
      setStatus("Informe o nome do servo antes de cadastrar.");
      return;
    }

    const [firstName, ...lastNameParts] = fullName.split(/\s+/);
    const servant: Person = {
      id: `person_servant_${Date.now()}`,
      organizationId,
      firstName,
      lastName: lastNameParts.join(" "),
      preferredName: firstName,
      email: servantDraft.email.trim() || undefined,
      mobilePhone: servantDraft.phone.trim() || undefined,
      whatsappPhone: servantDraft.phone.trim() || undefined,
      partnerBenefitsEnabled: false,
      personType: "adult",
      memberStatus: "volunteer",
      status: "active"
    };

    if (configured && firebaseReady && user && isFirebaseWebRuntimeConfigured(firebaseConfig)) {
      try {
        await savePersonProfile(firebaseConfig, { organizationId }, servant);
        setStatus(`${getFullName(servant)} cadastrado como voluntário e escalado em ${selectedMinistry.name}.`);
      } catch (error) {
        setStatus(
          error instanceof Error
            ? `Cadastro local feito, mas o Firebase retornou: ${error.message}`
            : "Cadastro local feito, mas não foi possível salvar no Firebase."
        );
      }
    } else {
      setStatus(`${getFullName(servant)} cadastrado localmente e escalado em ${selectedMinistry.name}.`);
    }

    setPeople((currentPeople) => [servant, ...currentPeople]);
    await handleQuickAssign(servant, role);
    setServantDraft({ email: "", name: "", phone: "", role: "Apoio" });
  }

  // Tribes mapping for smart suggestions
  const tribeMinistryMap: Record<string, string[]> = {
    LEVI: ["worship"],
    JUDAH: ["worship", "reception"],
    ISSACHAR: ["operations"],
    JOSEPH: ["operations"],
    ASHER: ["reception", "kids"],
    NAPHTALI: ["media"],
    ZEBULUN: ["operations"],
    GAD: ["operations"],
    MANASSEH: ["kids"],
    EPHRAIM: ["reception"],
    BENJAMIN: ["reception"],
    REUBEN: ["operations"],
  };

  const suggestedPeople = useMemo(() => {
    return people.filter(p => {
      if (!p.tribePrimaryCode) return false;
      const targetMinistries = tribeMinistryMap[p.tribePrimaryCode] || [];
      return targetMinistries.includes(selectedMinistry.code);
    }).slice(0, 5);
  }, [people, selectedMinistry.code]);

  // Open WhatsApp Reminders API
  const handleSendReminder = (assignment: ServiceAssignment) => {
    const person = people.find(p => p.id === assignment.personId);
    if (!person) return;
    
    const formattedDate = new Date(assignment.serviceDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    const text = whatsappTemplate
      .replace("[Nome]", getFullName(person))
      .replace("[Ministerio]", selectedMinistry.name)
      .replace("[Data]", formattedDate)
      .replace("[Role]", assignment.role);

    const phone = person.whatsappPhone || person.mobilePhone || "";
    const cleanPhone = phone.replace(/\D/g, "");
    
    const timeString = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    setAuditLogs(prev => [
      { time: timeString, text: `Lembrete via WhatsApp disparado para ${getFullName(person)}.`, type: "success" },
      ...prev
    ]);

    setSelectedAssignmentForReminder(null);
    window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <main className="form-page serving-page" style={{ padding: "2rem" }}>
      
      {/* HEADER CONTROLE CENTRAL */}
      <section className="serving-hero" style={{ borderBottom: "1px solid var(--alvo-line)", paddingBottom: "2.5rem", marginBottom: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "2rem" }}>
          <div>
            <Link className="back-link" href="/" style={{ color: "var(--alvo-accent)", textDecoration: "none", fontSize: "0.85rem", fontWeight: 800 }}>
              ← Voltar ao painel principal
            </Link>
            <p className="eyebrow" style={{ color: "var(--alvo-accent)", marginTop: "1rem" }}>Controle Central de Escalas</p>
            <h1 style={{ color: "var(--alvo-ink)", fontSize: "2.5rem", fontWeight: 950, letterSpacing: "-0.04em", margin: "8px 0" }}>
              Quem serve também precisa de clareza.
            </h1>
            <p style={{ color: "var(--alvo-ink-soft)", fontSize: "1.05rem", maxWidth: "750px", lineHeight: "1.6rem" }}>
              Gerencie voluntários com inteligência baseada em Tribos, envie lembretes rápidos via WhatsApp e acompanhe a cobertura de voluntários em tempo real.
            </p>
          </div>
          
          <aside className="panel serving-status-card" style={{ padding: "1.5rem", width: "260px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Handshake size={28} style={{ color: "var(--alvo-accent)" }} />
              <div>
                <strong style={{ display: "block", fontSize: "1.75rem", color: "var(--alvo-ink)" }}>{coverage}%</strong>
                <span style={{ fontSize: "0.75rem", color: "var(--alvo-ink-soft)" }}>cobertura confirmada</span>
              </div>
            </div>
            <p style={{ fontSize: "0.75rem", color: "var(--alvo-ink-soft)", marginTop: "12px", borderTop: "1px solid var(--alvo-line)", paddingTop: "8px" }}>
              {status}
            </p>
          </aside>
        </div>
      </section>

      {/* KPI METRICAS */}
      <section className="serving-metric-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
        <article style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "20px", padding: "1.25rem", borderLeft: "4px solid #f97316" }}>
          <span style={{ color: "var(--alvo-ink-soft)", fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700 }}>Confirmados</span>
          <strong style={{ display: "block", fontSize: "2rem", color: "var(--alvo-ink)", marginTop: 4 }}>{confirmedCount}</strong>
          <p style={{ color: "var(--alvo-ink-soft)", fontSize: "0.7rem", marginTop: 4 }}>presença garantida nos cultos</p>
        </article>
        <article style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "20px", padding: "1.25rem", borderLeft: "4px solid #94a3b8" }}>
          <span style={{ color: "var(--alvo-ink-soft)", fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700 }}>Aguardando</span>
          <strong style={{ display: "block", fontSize: "2rem", color: "var(--alvo-ink)", marginTop: 4 }}>{pendingCount}</strong>
          <p style={{ color: "var(--alvo-ink-soft)", fontSize: "0.7rem", marginTop: 4 }}>lembretes prontos para envio</p>
        </article>
        <article style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "20px", padding: "1.25rem", borderLeft: "4px solid #ef4444" }}>
          <span style={{ color: "var(--alvo-ink-soft)", fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700 }}>Justificados/Riscos</span>
          <strong style={{ display: "block", fontSize: "2rem", color: "var(--alvo-ink)", marginTop: 4 }}>{declinedCount}</strong>
          <p style={{ color: "var(--alvo-ink-soft)", fontSize: "0.7rem", marginTop: 4 }}>impossibilidades ou faltas declaradas</p>
        </article>
        <article style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "20px", padding: "1.25rem", borderLeft: "4px solid #10b981" }}>
          <span style={{ color: "var(--alvo-ink-soft)", fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700 }}>Banco de Voluntários</span>
          <strong style={{ display: "block", fontSize: "2rem", color: "var(--alvo-ink)", marginTop: 4 }}>{availablePeople.length || people.length}</strong>
          <p style={{ color: "var(--alvo-ink-soft)", fontSize: "0.7rem", marginTop: 4 }}>membros ativos elegíveis</p>
        </article>
      </section>

      {/* MATRIX DE DATAS E CULTOS INTERATIVA */}
      <section style={{ background: "rgba(255, 255, 255, 0.35)", border: "1px solid var(--alvo-line)", borderRadius: "24px", padding: "1.5rem", marginBottom: "2.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Calendar size={20} style={{ color: "var(--alvo-accent)" }} />
            <h3 style={{ fontSize: "1.1rem", color: "var(--alvo-ink)", margin: 0, fontWeight: 800 }}>Matriz de Escalas por Culto</h3>
          </div>
          <span style={{ fontSize: "0.8rem", color: "var(--alvo-ink-soft)" }}>Clique em um domingo para ver e gerenciar a escala respectiva</span>
        </div>
        <div style={{ display: "flex", gap: "1rem" }}>
          <button 
            onClick={() => setSelectedDateFilter("2026-05-24")}
            style={{ 
              flex: 1, 
              padding: "1rem", 
              borderRadius: "16px", 
              border: selectedDateFilter === "2026-05-24" ? "2.5px solid var(--alvo-accent)" : "1px solid var(--alvo-line)",
              background: selectedDateFilter === "2026-05-24" ? "rgba(249, 115, 22, 0.08)" : "rgba(255, 255, 255, 0.35)",
              color: "var(--alvo-ink)",
              textAlign: "left",
              cursor: "pointer"
            }}
          >
            <span style={{ display: "block", fontSize: "0.75rem", color: "var(--alvo-accent)", fontWeight: 800 }}>PRÓXIMO DOMINGO</span>
            <strong style={{ display: "block", fontSize: "1.1rem", marginTop: 4, color: "var(--alvo-ink)" }}>24 de Maio</strong>
            <span style={{ fontSize: "0.7rem", color: "var(--alvo-ink-soft)", display: "block", marginTop: 2 }}>Culto Geral às 18:30</span>
          </button>

          <button 
            onClick={() => setSelectedDateFilter("2026-05-31")}
            style={{ 
              flex: 1, 
              padding: "1rem", 
              borderRadius: "16px", 
              border: selectedDateFilter === "2026-05-31" ? "2.5px solid var(--alvo-accent)" : "1px solid var(--alvo-line)",
              background: selectedDateFilter === "2026-05-31" ? "rgba(249, 115, 22, 0.08)" : "rgba(255, 255, 255, 0.35)",
              color: "var(--alvo-ink)",
              textAlign: "left",
              cursor: "pointer"
            }}
          >
            <span style={{ display: "block", fontSize: "0.75rem", color: "var(--alvo-ink-soft)", fontWeight: 800 }}>DOMINGO SEGUINTE</span>
            <strong style={{ display: "block", fontSize: "1.1rem", marginTop: 4, color: "var(--alvo-ink)" }}>31 de Maio</strong>
            <span style={{ fontSize: "0.7rem", color: "var(--alvo-ink-soft)", display: "block", marginTop: 2 }}>Culto de Missões às 18:30</span>
          </button>
        </div>
      </section>

      {/* PAINEL PRINCIPAL DE TRABALHO */}
      <section style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr", gap: "1.5rem", alignItems: "start" }}>
        
        {/* COLUNA ESQUERDA: LISTA DE MINISTÉRIOS */}
        <aside className="panel" style={{ padding: "1.5rem" }}>
          <h2 style={{ fontSize: "1.1rem", color: "var(--alvo-ink)", fontWeight: 800, marginBottom: "1rem" }}>Ministérios</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {ministryTeams.map((team) => {
              const teamAssignments = assignments.filter((assignment) => assignment.ministryCode === team.code && assignment.serviceDate.startsWith(selectedDateFilter));
              const teamConfirmed = teamAssignments.filter((assignment) =>
                ["confirmed", "present"].includes(assignment.status)
              ).length;
              const isSelected = selectedMinistry.code === team.code;

              return (
                <button
                  key={team.code}
                  onClick={() => setSelectedMinistryCode(team.code)}
                  style={{
                    background: isSelected ? "rgba(249, 115, 22, 0.06)" : "transparent",
                    border: isSelected ? "1px solid var(--alvo-accent)" : "1px solid var(--alvo-line)",
                    borderRadius: "16px",
                    padding: "1rem",
                    textAlign: "left",
                    color: "var(--alvo-ink)",
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong style={{ fontSize: "0.95rem", color: isSelected ? "var(--alvo-accent)" : "var(--alvo-ink)" }}>{team.name}</strong>
                    <span style={{ fontSize: "0.75rem", background: "rgba(255,255,255,0.35)", border: "1px solid var(--alvo-line)", padding: "2px 8px", borderRadius: "8px", color: "var(--alvo-ink-soft)" }}>
                      {teamConfirmed}/{team.target}
                    </span>
                  </div>
                  <p style={{ fontSize: "0.75rem", color: "var(--alvo-ink-soft)", marginTop: 4, lineHeight: "1.1rem" }}>{team.summary}</p>
                </button>
              );
            })}
          </div>
        </aside>

        {/* COLUNA CENTRAL: DETALHE DA ESCALA SELECIONADA */}
        <article className="panel" style={{ padding: "2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--alvo-line)", paddingBottom: "1rem", marginBottom: "1.5rem" }}>
            <div>
              <span style={{ fontSize: "0.75rem", color: "var(--alvo-accent)", textTransform: "uppercase", fontWeight: 800 }}>Escala de Serviço</span>
              <h2 style={{ fontSize: "1.5rem", color: "var(--alvo-ink)", fontWeight: 900, marginTop: 4 }}>{selectedMinistry.name}</h2>
            </div>
            {selectedMinistry.code === "worship" && (
              <Link href="/serving/worship" style={{ background: "#8b5cf6", color: "white", padding: "6px 12px", borderRadius: "10px", textDecoration: "none", fontSize: "0.8rem", fontWeight: 700 }}>
                🎵 Repertório & Cifras
              </Link>
            )}
          </div>

          <div style={{ background: "rgba(255, 255, 255, 0.35)", border: "1px solid var(--alvo-line)", borderRadius: "16px", padding: "1rem", marginBottom: "1.5rem", fontSize: "0.85rem" }}>
            <span style={{ color: "var(--alvo-accent)", fontWeight: 800, display: "block" }}>Ação Recomendada:</span>
            <p style={{ color: "var(--alvo-ink-soft)", margin: "4px 0 0" }}>{nextActionLabel}</p>
          </div>

          {/* LISTA DE ESCALADOS NA GRID PREMIUM */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {selectedAssignments.length ? (
              selectedAssignments.map((assignment) => {
                const person = people.find((item) => item.id === assignment.personId);
                const isPending = assignment.status === "pending";
                
                return (
                  <div 
                    key={assignment.id} 
                    style={{ 
                      background: "rgba(255, 255, 255, 0.35)", 
                      border: "1px solid var(--alvo-line)", 
                      borderRadius: "16px", 
                      padding: "1.25rem",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <strong style={{ color: "var(--alvo-ink)", fontSize: "1.05rem" }}>
                          {person ? getFullName(person) : assignment.personId}
                        </strong>
                        
                        {/* Glow status dot instead of heavy badge */}
                        <span style={{ 
                          width: 8, 
                          height: 8, 
                          borderRadius: "50%", 
                          backgroundColor: assignment.status === "confirmed" || assignment.status === "present" ? "#10b981" : assignment.status === "declined" ? "#ef4444" : "#f59e0b",
                          display: "inline-block" 
                        }} />

                        <span style={{ fontSize: "0.7rem", color: "var(--alvo-ink-soft)" }}>
                          ({getAssignmentStatusLabel(assignment.status)})
                        </span>
                      </div>
                      
                      <p style={{ color: "var(--alvo-accent)", fontSize: "0.8rem", margin: "4px 0 0" }}>
                        Função: {assignment.role}
                      </p>

                      {person?.tribePrimaryCode && (
                        <span style={{ display: "inline-block", background: "rgba(255,255,255,0.35)", border: "1px solid var(--alvo-line)", fontSize: "0.7rem", padding: "2px 8px", borderRadius: "6px", color: "var(--alvo-ink-soft)", marginTop: 6 }}>
                          Tribo: {getTribeDisplayLabel(person.tribePrimaryCode)}
                        </span>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      {isPending && (
                        <button 
                          onClick={() => setSelectedAssignmentForReminder(assignment)}
                          style={{ background: "rgba(249, 115, 22, 0.15)", border: "none", color: "var(--alvo-accent)", padding: "8px 12px", borderRadius: "10px", fontSize: "0.75rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}
                        >
                          <MessageSquare size={13} /> Lembrar
                        </button>
                      )}
                      
                      <button 
                        onClick={() => void handleAssignmentStatus(assignment.id, "confirmed")}
                        style={{ background: "white", border: "1px solid var(--alvo-line)", color: "var(--alvo-ink)", padding: "8px 12px", borderRadius: "10px", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}
                      >
                        Confirmar
                      </button>

                      <button 
                        onClick={() => void handleAssignmentStatus(assignment.id, "present")}
                        style={{ background: "#f97316", border: "none", color: "white", padding: "8px 12px", borderRadius: "10px", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}
                      >
                        Presença
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ textAlign: "center", padding: "3rem", background: "rgba(255, 255, 255, 0.35)", border: "2px dashed var(--alvo-line)", borderRadius: "20px" }}>
                <Handshake size={36} style={{ color: "var(--alvo-ink-soft)", opacity: 0.5, margin: "0 auto 12px" }} />
                <strong style={{ display: "block", color: "var(--alvo-ink)" }}>Nenhum escalado para este dia</strong>
                <p style={{ color: "var(--alvo-ink-soft)", fontSize: "0.8rem", marginTop: 4 }}>Selecione sugestões por Tribo de Dons abaixo para escalar voluntários.</p>
              </div>
            )}
          </div>

          {/* SUGESTÕES POR TRIBO DE DONS */}
          {suggestedPeople.length > 0 && (
            <div style={{ marginTop: "2rem", borderTop: "1px solid var(--alvo-line)", paddingTop: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "1rem" }}>
                <Sparkles size={16} style={{ color: "var(--alvo-accent)" }} />
                <h4 style={{ fontSize: "0.95rem", color: "var(--alvo-ink)", margin: 0, fontWeight: 800 }}>Sugestões Inteligentes por Tribos</h4>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.75rem" }}>
                {suggestedPeople.map((p) => (
                  <div key={p.id} style={{ background: "rgba(255, 255, 255, 0.35)", border: "1px solid var(--alvo-line)", borderRadius: "12px", padding: "10px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div>
                      <strong style={{ display: "block", fontSize: "0.85rem", color: "var(--alvo-ink)" }}>{getFullName(p)}</strong>
                      <span style={{ fontSize: "0.7rem", color: "var(--alvo-accent)", fontWeight: 700 }}>
                        Tribo {getTribeDisplayLabel(p.tribePrimaryCode!)}
                      </span>
                    </div>
                    <button 
                      onClick={() => handleQuickAssign(p)}
                      style={{ background: "#f97316", border: "none", color: "white", borderRadius: "8px", padding: "6px", fontSize: "0.7rem", fontWeight: 700, cursor: "pointer", marginTop: 10 }}
                    >
                      Escalar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* BUSCA MANUAL NA BASE */}
          <div style={{ marginTop: "2rem", borderTop: "1px solid var(--alvo-line)", paddingTop: "1.5rem" }}>
            <h4 style={{ fontSize: "0.95rem", color: "var(--alvo-ink)", fontWeight: 800, marginBottom: "1rem" }}>Buscar e Escalar da Base</h4>
            <div style={{ position: "relative", marginBottom: "1rem" }}>
              <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--alvo-ink-soft)" }} />
              <input 
                placeholder="Buscar voluntário pelo nome..." 
                value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
                style={{ width: "100%", padding: "10px 12px 10px 36px", background: "white", border: "1px solid var(--alvo-line)", borderRadius: "12px", color: "var(--alvo-ink)", outline: "none", fontSize: "0.85rem" }}
              />
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", maxHeight: "150px", overflowY: "auto", paddingRight: 4 }}>
              {filteredCandidatePeople.slice(0, 15).map((p) => (
                <button 
                  key={p.id} 
                  onClick={() => handleQuickAssign(p)}
                  style={{ background: "white", border: "1px solid var(--alvo-line)", padding: "6px 12px", borderRadius: "20px", color: "var(--alvo-ink)", fontSize: "0.75rem", cursor: "pointer", display: "flex", gap: 6, alignItems: "center" }}
                >
                  + {getFullName(p)}
                </button>
              ))}
            </div>
          </div>
        </article>

        {/* COLUNA DIREITA: CADASTRO E AUDITORIA */}
        <aside style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          {/* PAINEL DE ADICIONAR PESSOA */}
          <div className="panel" style={{ padding: "1.5rem" }}>
            <h3 style={{ fontSize: "1.1rem", color: "var(--alvo-ink)", fontWeight: 800, marginBottom: "1rem" }}>Novo Voluntário</h3>
            <form onSubmit={handleServantRegistration} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.8rem", color: "var(--alvo-ink-soft)" }}>
                Nome Completo
                <input
                  required
                  placeholder="Nome do voluntário"
                  value={servantDraft.name}
                  onChange={e => setServantDraft(prev => ({ ...prev, name: e.target.value }))}
                  style={{ padding: "8px 12px", background: "white", border: "1px solid var(--alvo-line)", borderRadius: "10px", color: "var(--alvo-ink)", outline: "none" }}
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.8rem", color: "var(--alvo-ink-soft)" }}>
                WhatsApp
                <input
                  required
                  placeholder="(00) 00000-0000"
                  value={servantDraft.phone}
                  onChange={e => setServantDraft(prev => ({ ...prev, phone: e.target.value }))}
                  style={{ padding: "8px 12px", background: "white", border: "1px solid var(--alvo-line)", borderRadius: "10px", color: "var(--alvo-ink)", outline: "none" }}
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.8rem", color: "var(--alvo-ink-soft)" }}>
                Função da Escala
                <input
                  placeholder="Ex: Recepção Lateral"
                  value={servantDraft.role}
                  onChange={e => setServantDraft(prev => ({ ...prev, role: e.target.value }))}
                  style={{ padding: "8px 12px", background: "white", border: "1px solid var(--alvo-line)", borderRadius: "10px", color: "var(--alvo-ink)", outline: "none" }}
                />
              </label>

              <button 
                type="submit"
                style={{ background: "#f97316", color: "white", border: "none", borderRadius: "10px", padding: "10px", fontWeight: 800, cursor: "pointer", marginTop: 6 }}
              >
                Cadastrar e Escalar
              </button>
            </form>
          </div>

          {/* HISTÓRICO DE AUDITORIA DE ESCALAS (Scale Activity Audit Trail) */}
          <div className="panel" style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "1rem" }}>
              <FileText size={16} style={{ color: "var(--alvo-accent)" }} />
              <h3 style={{ fontSize: "1.1rem", color: "var(--alvo-ink)", fontWeight: 800, margin: 0 }}>Histórico da Escala</h3>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxHeight: "250px", overflowY: "auto", paddingRight: 4 }}>
              {auditLogs.map((log, idx) => (
                <div key={idx} style={{ fontSize: "0.75rem", borderBottom: "1px solid var(--alvo-line)", paddingBottom: "6px" }}>
                  <span style={{ color: "var(--alvo-accent)", fontWeight: 800 }}>{log.time}</span> - <span style={{ color: "var(--alvo-ink-soft)" }}>{log.text}</span>
                </div>
              ))}
            </div>
          </div>

        </aside>
      </section>

      {/* WHATSAPP REMINDER DRAWER / MODAL SIMULATOR */}
      {selectedAssignmentForReminder && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15, 23, 42, 0.35)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "2rem" }}>
          <div style={{ background: "rgba(255, 255, 255, 0.8)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.5)", borderRadius: "24px", padding: "2rem", maxWidth: "500px", width: "100%", margin: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h3 style={{ color: "var(--alvo-ink)", fontSize: "1.25rem", fontWeight: 800, margin: 0 }}>
                Disparador de Lembrete WhatsApp
              </h3>
              <button 
                onClick={() => setSelectedAssignmentForReminder(null)}
                style={{ background: "white", border: "1px solid var(--alvo-line)", color: "var(--alvo-ink)", cursor: "pointer", borderRadius: "8px", padding: "4px" }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ color: "var(--alvo-ink-soft)", fontSize: "0.85rem", marginBottom: "1.25rem" }}>
              Personalize a mensagem abaixo antes de disparar o WhatsApp automático para o voluntário pendente.
            </p>

            <label style={{ display: "flex", flexDirection: "column", gap: 6, color: "var(--alvo-ink)", fontSize: "0.8rem", marginBottom: "1.5rem" }}>
              Template da Mensagem
              <textarea 
                value={whatsappTemplate}
                onChange={e => setWhatsappTemplate(e.target.value)}
                rows={4}
                style={{ width: "100%", padding: "10px", background: "white", border: "1px solid var(--alvo-line)", borderRadius: "10px", color: "var(--alvo-ink)", outline: "none", resize: "none" }}
              />
            </label>

            <div style={{ display: "flex", gap: "1rem" }}>
              <button 
                onClick={() => setSelectedAssignmentForReminder(null)}
                style={{ flex: 1, background: "white", border: "1px solid var(--alvo-line)", color: "var(--alvo-ink)", padding: "10px", borderRadius: "10px", fontWeight: 700, cursor: "pointer" }}
              >
                Cancelar
              </button>

              <button 
                onClick={() => handleSendReminder(selectedAssignmentForReminder)}
                style={{ flex: 1, background: "#f97316", color: "white", border: "none", padding: "10px", borderRadius: "10px", fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
              >
                <Send size={15} /> Disparar WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}

function applyAssignmentStatus(
  assignment: ServiceAssignment,
  nextStatus: ServiceAssignmentStatus,
  responseNote?: string
): ServiceAssignment {
  const now = new Date().toISOString();
  const nextAssignment: ServiceAssignment = {
    ...assignment,
    responseNote: responseNote?.trim() || assignment.responseNote,
    status: nextStatus,
    updatedAt: now
  };

  if (nextStatus === "confirmed") {
    nextAssignment.confirmedAt = now;
  }

  if (nextStatus === "declined") {
    nextAssignment.declinedAt = now;
  }

  if (nextStatus === "present") {
    nextAssignment.checkedInAt = now;
  }

  if (nextStatus === "absent") {
    nextAssignment.absentAt = now;
  }

  return nextAssignment;
}

function getFullName(person: Person) {
  return `${person.preferredName || person.firstName} ${person.lastName}`.trim();
}

function getAssignmentStatusLabel(status: ServiceAssignmentStatus) {
  switch (status) {
    case "pending":
      return "Pendente";
    case "confirmed":
      return "Confirmado";
    case "declined":
      return "Justificado";
    case "present":
      return "Presente";
    case "absent":
      return "Falta";
  }
}
