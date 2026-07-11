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
  isFirebaseWebRuntimeConfigured,
  fetchScheduleSwapRequests,
  saveScheduleSwapRequest,
  deleteServiceAssignment
} from "@alvo/firebase";
import { cachedFetchPeople } from "../../lib/org-data-cache";
import { getTribeDisplayLabel, checkScheduleConflict, processScheduleSwap } from "@alvo/domain";
import { recentPeople } from "../../lib/mock-data";
import type { Person, ServiceAssignment, ServiceAssignmentStatus, ScheduleSwapRequest } from "@alvo/types";
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
  
  // Dynamic calculation of the next 4 Sundays
  const nextSundays = useMemo(() => {
    const list = [];
    const today = new Date();
    const day = today.getDay();
    const diff = (7 - day) % 7;
    const nextSunday = new Date(today);
    nextSunday.setDate(today.getDate() + diff);
    
    for (let i = 0; i < 4; i++) {
      const d = new Date(nextSunday);
      d.setDate(nextSunday.getDate() + i * 7);
      
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const dateString = `${yyyy}-${mm}-${dd}`;
      
      const label = d.toLocaleDateString("pt-BR", { day: "numeric", month: "long" });
      list.push({ dateString, label, rawDate: d });
    }
    return list;
  }, []);

  const [assignments, setAssignments] = useState<ServiceAssignment[]>(() => {
    const nextSundayString = nextSundays[0]?.dateString ?? "2026-06-14";
    return initialAssignments.map(ass => ({
      ...ass,
      serviceDate: `${nextSundayString}T08:30:00.000Z`
    }));
  });
  
  const [swapRequests, setSwapRequests] = useState<ScheduleSwapRequest[]>([]);
  
  // Custom tracking for audit trail log
  const [auditLogs, setAuditLogs] = useState<Array<{ time: string; text: string; type: "success" | "info" | "warning" }>>([
    { time: "18:42", text: `Escala para o primeiro culto dinâmica inicializada.`, type: "info" },
    { time: "18:43", text: "Ana Silva confirmou recepção via link automático.", type: "success" }
  ]);

  const [assignMode, setAssignMode] = useState<"members" | "new">("members");
  const [selectedMinistryCode, setSelectedMinistryCode] = useState<(typeof ministryTeams)[number]["code"]>("reception");
  const [status, setStatus] = useState("Carregando escalas...");
  
  // Interactive Reminders
  const [selectedAssignmentForReminder, setSelectedAssignmentForReminder] = useState<ServiceAssignment | null>(null);
  const [whatsappTemplate, setWhatsappTemplate] = useState("Olá [Nome]! Confirmando a sua escala no ministério de [Ministerio] para o dia [Data] no papel de [Role]. Confirma sua presença?");

  // Schedule matrix selected day (Sunday 24/05/2026 or 31/05/2026)
  const [selectedDateFilter, setSelectedDateFilter] = useState(() => {
    return nextSundays[0]?.dateString ?? "2026-06-14";
  });
  
  // Search state and custom role selection
  const [customRoleInput, setCustomRoleInput] = useState("");
  
  // Search state for members
  const [memberSearch, setMemberSearch] = useState("");

  const [servantDraft, setServantDraft] = useState({
    email: "",
    name: "",
    phone: "",
    role: "Apoio"
  });

  // Swap Form States
  const [requestingSwapForAssignmentId, setRequestingSwapForAssignmentId] = useState<string | null>(null);
  const [swapReplacementPersonId, setSwapReplacementPersonId] = useState<string>("");
  const [swapNote, setSwapNote] = useState<string>("");

  useEffect(() => {
    if (!configured || !firebaseReady || !user || !isFirebaseWebRuntimeConfigured(firebaseConfig)) {
      setPeople(recentPeople as unknown as Person[]);
      setStatus("Modo demonstração — alterações não serão salvas.");
      return;
    }

    let cancelled = false;

    async function loadServingData() {
      setStatus("Sincronizando pessoas para montar escalas...");

      try {
        const [nextPeople, nextAssignments, nextSwaps] = await Promise.all([
          cachedFetchPeople(firebaseConfig, { organizationId }, 160),
          fetchServiceAssignments(firebaseConfig, { organizationId }, 160),
          fetchScheduleSwapRequests(firebaseConfig, { organizationId }).catch(() => [] as ScheduleSwapRequest[])
        ]);

        if (cancelled) return;

        const finalPeople = nextPeople.length > 0 ? nextPeople : (recentPeople as unknown as Person[]);
        const finalAssignments = nextAssignments.length > 0 ? nextAssignments : (assignments as unknown as ServiceAssignment[]);

        setPeople(finalPeople);
        setAssignments(finalAssignments);
        setSwapRequests(nextSwaps);
        
        setStatus(
          nextAssignments.length
            ? `${nextAssignments.length} escala(s) sincronizada(s) com ${nextPeople.length} pessoa(s).`
            : `${finalPeople.length} pessoa(s) disponíveis (modo hibrido/mock).`
        );
      } catch (error) {
        if (!cancelled) {
          setStatus("Não foi possível carregar pessoas. Verifique sua conexão e tente novamente.");
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
            ? "Escala atualizada aqui, mas não foi possível salvar. Verifique sua conexão."
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

    const conflict = checkScheduleConflict(assignments, newAssignment);
    if (conflict) {
      const conflictingTeam = ministryTeams.find(t => t.code === conflict.ministryCode)?.name || conflict.ministryCode;
      const confirmAssign = window.confirm(
        `ALERTA DE CONFLITO: ${getFullName(person)} já está escalado(a) no ministério "${conflictingTeam}" nesta mesma data (${selectedDateFilter}). Deseja escalar mesmo assim?`
      );
      if (!confirmAssign) {
        return;
      }
    }

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
        setStatus(`${getFullName(person)} escalado em ${selectedMinistry.name}.`);
      } catch (error) {
        setStatus(
          error instanceof Error
            ? "Escala criada aqui, mas não foi possível salvar. Verifique sua conexão."
            : "Escala criada aqui, mas não foi possível salvar. Verifique sua conexão."
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
            ? "Cadastro feito aqui, mas não foi possível salvar. Verifique sua conexão."
            : "Cadastro feito aqui, mas não foi possível salvar. Verifique sua conexão."
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

  async function handleRequestSwap(assignmentId: string, replacementPersonId: string, note?: string) {
    if (!assignmentId || !replacementPersonId) return;

    const assignment = assignments.find(a => a.id === assignmentId);
    if (!assignment) return;

    const newSwap: ScheduleSwapRequest = {
      id: `swap_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      organizationId: organizationId || "demo_org",
      assignmentId,
      requestorPersonId: assignment.personId,
      proposedReplacementPersonId: replacementPersonId,
      status: "pending",
      note,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setSwapRequests(prev => [newSwap, ...prev]);

    const requestor = people.find(p => p.id === assignment.personId);
    const replacement = people.find(p => p.id === replacementPersonId);
    const requestorName = requestor ? getFullName(requestor) : "Voluntário";
    const replacementName = replacement ? getFullName(replacement) : "Substituto";

    const timeString = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    setAuditLogs(prev => [
      { time: timeString, text: `Solicitada troca: ${requestorName} por ${replacementName}.`, type: "info" },
      ...prev
    ]);

    setStatus(`Solicitação de troca enviada para aprovação.`);

    if (configured && firebaseReady && user && isFirebaseWebRuntimeConfigured(firebaseConfig)) {
      try {
        await saveScheduleSwapRequest(firebaseConfig, { organizationId }, newSwap);
      } catch (err) {
        console.error(err);
        setStatus("Solicitação salva apenas localmente.");
      }
    }

    setRequestingSwapForAssignmentId(null);
    setSwapReplacementPersonId("");
    setSwapNote("");
  }

  async function handleAcceptSwap(swapId: string) {
    const swap = swapRequests.find(s => s.id === swapId);
    if (!swap) return;

    try {
      const { requestorAssignment } = processScheduleSwap(swap, assignments);

      setAssignments(current => current.map(a => a.id === requestorAssignment.id ? requestorAssignment : a));

      const updatedSwap: ScheduleSwapRequest = {
        ...swap,
        status: "accepted",
        updatedAt: new Date().toISOString()
      };
      setSwapRequests(current => current.map(s => s.id === swapId ? updatedSwap : s));

      const requestor = people.find(p => p.id === swap.requestorPersonId);
      const replacement = people.find(p => p.id === (swap.proposedReplacementPersonId || swap.targetPersonId));
      const requestorName = requestor ? getFullName(requestor) : "Voluntário";
      const replacementName = replacement ? getFullName(replacement) : "Substituto";
      const timeString = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

      setAuditLogs(prev => [
        { time: timeString, text: `Troca aprovada: ${replacementName} assume o lugar de ${requestorName}.`, type: "success" },
        ...prev
      ]);
      setStatus("Troca aprovada com sucesso.");

      if (configured && firebaseReady && user && isFirebaseWebRuntimeConfigured(firebaseConfig)) {
        await Promise.all([
          saveServiceAssignment(firebaseConfig, { organizationId }, requestorAssignment),
          saveScheduleSwapRequest(firebaseConfig, { organizationId }, updatedSwap)
        ]);
        setStatus("Troca aprovada e salva.");
      }
    } catch (error) {
      console.error(error);
      setStatus("Não foi possível processar a troca. Tente novamente.");
    }
  }

  async function handleDeclineSwap(swapId: string) {
    const swap = swapRequests.find(s => s.id === swapId);
    if (!swap) return;

    const updatedSwap: ScheduleSwapRequest = {
      ...swap,
      status: "declined",
      updatedAt: new Date().toISOString()
    };
    setSwapRequests(current => current.map(s => s.id === swapId ? updatedSwap : s));

    const requestor = people.find(p => p.id === swap.requestorPersonId);
    const requestorName = requestor ? getFullName(requestor) : "Voluntário";
    const timeString = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    setAuditLogs(prev => [
      { time: timeString, text: `Troca recusada para a escala de ${requestorName}.`, type: "warning" },
      ...prev
    ]);
    setStatus("Troca recusada.");

    if (configured && firebaseReady && user && isFirebaseWebRuntimeConfigured(firebaseConfig)) {
      try {
        await saveScheduleSwapRequest(firebaseConfig, { organizationId }, updatedSwap);
      } catch (err) {
        console.error(err);
      }
    }
  }

  async function handleRemoveAssignment(assignmentId: string) {
    const confirmRemove = window.confirm("Deseja realmente remover este voluntário desta escala?");
    if (!confirmRemove) return;

    const currentAssignment = assignments.find((assignment) => assignment.id === assignmentId);
    if (!currentAssignment) return;

    const person = people.find(p => p.id === currentAssignment.personId);
    const personName = person ? getFullName(person) : "Voluntário";

    setAssignments(current => current.filter(a => a.id !== assignmentId));

    const timeString = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    setAuditLogs(prev => [
      { time: timeString, text: `${personName} foi removido(a) da escala.`, type: "warning" },
      ...prev
    ]);

    setStatus(`${personName} removido da escala.`);

    if (configured && firebaseReady && user && isFirebaseWebRuntimeConfigured(firebaseConfig)) {
      try {
        await deleteServiceAssignment(firebaseConfig, { organizationId }, assignmentId);
        setStatus(`${personName} removido da escala.`);
      } catch (error) {
        setStatus(
          error instanceof Error
            ? "Escala removida aqui, mas não foi possível salvar. Verifique sua conexão."
            : "Escala removida aqui, mas não foi possível salvar. Verifique sua conexão."
        );
      }
    }
  }

  return (
    <div className="page-root serving-page">
      <header className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Escalas & Voluntários</h1>
          <p className="page-subtitle">Gerencie equipes, confirme presenças e acompanhe cobertura em tempo real</p>
        </div>
        <div className="page-header-actions">
          <span style={{ fontSize: 12, color: "var(--alvo-ink-soft)", background: "var(--alvo-surface-muted)", padding: "4px 10px", borderRadius: 8 }}>
            {status}
          </span>
        </div>
      </header>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "rgba(22,163,74,0.1)", color: "#16a34a" }}><CheckCircle2 size={20} /></div>
          <div className="stat-body"><span className="stat-label">Confirmados</span><span className="stat-value">{confirmedCount}</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><Clock3 size={20} /></div>
          <div className="stat-body"><span className="stat-label">Aguardando</span><span className="stat-value">{pendingCount}</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "rgba(220,38,38,0.1)", color: "#dc2626" }}><AlertTriangle size={20} /></div>
          <div className="stat-body"><span className="stat-label">Justificados</span><span className="stat-value">{declinedCount}</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><Users size={20} /></div>
          <div className="stat-body"><span className="stat-label">Banco de voluntários</span><span className="stat-value">{availablePeople.length || people.length}</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "var(--alvo-accent-soft)", color: "var(--alvo-accent-dark)" }}><Handshake size={20} /></div>
          <div className="stat-body"><span className="stat-label">Cobertura</span><span className="stat-value">{coverage}%</span></div>
        </div>
      </div>

      {/* SOLICITAÇÕES DE TROCA DE ESCALAS PENDENTES */}
      {swapRequests.filter(s => s.status === "pending").length > 0 && (
        <section style={{ background: "rgba(139, 92, 246, 0.1)", border: "1px solid rgba(139, 92, 246, 0.3)", borderRadius: "24px", padding: "1.5rem", marginBottom: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1rem" }}>
            <Sparkles size={20} style={{ color: "#8b5cf6" }} />
            <h3 style={{ fontSize: "1.1rem", color: "var(--alvo-ink)", margin: 0, fontWeight: 800 }}>Solicitações de Troca Pendentes</h3>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {swapRequests.filter(s => s.status === "pending").map((swap) => {
              const requestor = people.find(p => p.id === swap.requestorPersonId);
              const replacement = people.find(p => p.id === (swap.proposedReplacementPersonId || swap.targetPersonId));
              const assignment = assignments.find(a => a.id === swap.assignmentId);
              
              const requestorName = requestor ? getFullName(requestor) : swap.requestorPersonId;
              const replacementName = replacement ? getFullName(replacement) : "Substituto";
              const teamName = assignment ? (ministryTeams.find(t => t.code === assignment.ministryCode)?.name || assignment.ministryCode) : "Ministério";

              return (
                <div key={swap.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "white", padding: "1rem", borderRadius: "16px", border: "1px solid var(--alvo-line)" }}>
                  <div>
                    <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--alvo-ink)", fontWeight: 700 }}>
                      {requestorName} solicita substituição por {replacementName}
                    </p>
                    <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "var(--alvo-ink-soft)" }}>
                      Ministério: {teamName} {assignment ? `| Função: ${assignment.role}` : ""}
                    </p>
                    {swap.note && (
                      <p style={{ margin: "4px 0 0", fontSize: "0.8rem", fontStyle: "italic", color: "var(--alvo-ink-soft)" }}>
                        Motivo: "{swap.note}"
                      </p>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button 
                      onClick={() => void handleAcceptSwap(swap.id)}
                      style={{ background: "#10b981", border: "none", color: "white", borderRadius: "10px", padding: "8px 16px", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}
                    >
                      Aprovar Troca
                    </button>
                    <button 
                      onClick={() => void handleDeclineSwap(swap.id)}
                      style={{ background: "#ef4444", border: "none", color: "white", borderRadius: "10px", padding: "8px 16px", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}
                    >
                      Recusar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* MATRIX DE DATAS E CULTOS INTERATIVA */}
      <section style={{ background: "rgba(255, 255, 255, 0.35)", border: "1px solid var(--alvo-line)", borderRadius: "24px", padding: "1.5rem", marginBottom: "2.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Calendar size={20} style={{ color: "var(--alvo-accent)" }} />
            <h3 style={{ fontSize: "1.1rem", color: "var(--alvo-ink)", margin: 0, fontWeight: 800 }}>Matriz de Escalas por Culto</h3>
          </div>
          <span style={{ fontSize: "0.8rem", color: "var(--alvo-ink-soft)" }}>Clique em um domingo para ver e gerenciar a escala respectiva</span>
        </div>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          {nextSundays.map((sunday, index) => {
            const isSelected = selectedDateFilter === sunday.dateString;
            return (
              <button 
                key={sunday.dateString}
                onClick={() => setSelectedDateFilter(sunday.dateString)}
                style={{ 
                  flex: 1, 
                  minWidth: "160px",
                  padding: "1rem", 
                  borderRadius: "16px", 
                  border: isSelected ? "2.5px solid var(--alvo-accent)" : "1px solid var(--alvo-line)",
                  background: isSelected ? "var(--alvo-accent-soft)" : "rgba(255, 255, 255, 0.35)",
                  color: "var(--alvo-ink)",
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                <span style={{ display: "block", fontSize: "0.75rem", color: isSelected ? "var(--alvo-accent)" : "var(--alvo-ink-soft)", fontWeight: 800 }}>
                  {index === 0 ? "PRÓXIMO DOMINGO" : index === 1 ? "DOMINGO SEGUINTE" : `DOMINGO +${index}`}
                </span>
                <strong style={{ display: "block", fontSize: "1.1rem", marginTop: 4, color: "var(--alvo-ink)" }}>
                  {sunday.label}
                </strong>
                <span style={{ fontSize: "0.7rem", color: "var(--alvo-ink-soft)", display: "block", marginTop: 2 }}>
                  Culto Geral às 18:30
                </span>
              </button>
            );
          })}

          <div 
            style={{ 
              flex: 1, 
              minWidth: "160px",
              padding: "1rem", 
              borderRadius: "16px", 
              border: !nextSundays.some(s => s.dateString === selectedDateFilter) ? "2.5px solid var(--alvo-accent)" : "1px solid var(--alvo-line)",
              background: !nextSundays.some(s => s.dateString === selectedDateFilter) ? "var(--alvo-accent-soft)" : "rgba(255, 255, 255, 0.35)",
              color: "var(--alvo-ink)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: 4
            }}
          >
            <span style={{ display: "block", fontSize: "0.75rem", color: "var(--alvo-ink-soft)", fontWeight: 800 }}>OUTRA DATA</span>
            <input 
              type="date"
              value={selectedDateFilter}
              onChange={(e) => {
                if (e.target.value) {
                  setSelectedDateFilter(e.target.value);
                }
              }}
              style={{
                width: "100%",
                padding: "6px 10px",
                border: "1px solid var(--alvo-line)",
                borderRadius: "10px",
                background: "white",
                color: "var(--alvo-ink)",
                outline: "none",
                fontSize: "0.85rem",
                fontWeight: 700
              }}
            />
          </div>
        </div>
      </section>

      {/* PAINEL PRINCIPAL DE TRABALHO */}
      <section className="serving-workbench" style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr", gap: "1.5rem", alignItems: "start" }}>
        
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
                    background: isSelected ? "var(--alvo-accent-soft)" : "transparent",
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
                      flexDirection: "column",
                      alignItems: "stretch",
                      gap: "0.75rem"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
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
                            style={{ background: "var(--alvo-accent-soft)", border: "none", color: "var(--alvo-accent)", padding: "8px 12px", borderRadius: "10px", fontSize: "0.75rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}
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
                          style={{ background: "var(--alvo-green)", border: "none", color: "white", padding: "8px 12px", borderRadius: "10px", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}
                        >
                          Presença
                        </button>

                        <button 
                          onClick={() => setRequestingSwapForAssignmentId(assignment.id)}
                          style={{ background: "rgba(139, 92, 246, 0.15)", border: "none", color: "#8b5cf6", padding: "8px 12px", borderRadius: "10px", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}
                        >
                          Trocar
                        </button>

                        <button 
                          onClick={() => void handleRemoveAssignment(assignment.id)}
                          style={{ background: "rgba(239, 68, 68, 0.1)", border: "none", color: "#ef4444", padding: "8px 12px", borderRadius: "10px", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}
                          title="Remover da escala"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </div>

                    {requestingSwapForAssignmentId === assignment.id && (
                      <div style={{ padding: "1rem", backgroundColor: "rgba(255, 255, 255, 0.5)", borderRadius: "12px", border: "1px solid var(--alvo-line)", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--alvo-ink)" }}>Solicitar Troca Assistida</span>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--alvo-ink-soft)" }}>Selecione o Voluntário de Substituição:</label>
                          <select 
                            value={swapReplacementPersonId}
                            onChange={(e) => setSwapReplacementPersonId(e.target.value)}
                            style={{ padding: "8px 12px", borderRadius: "10px", border: "1px solid var(--alvo-line)", outline: "none", fontSize: "0.85rem", background: "white", color: "var(--alvo-ink)" }}
                          >
                            <option value="">Escolha um voluntário...</option>
                            {people.filter(p => p.id !== assignment.personId).map(p => (
                              <option key={p.id} value={p.id}>{getFullName(p)}</option>
                            ))}
                          </select>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--alvo-ink-soft)" }}>Observação / Motivo:</label>
                          <input 
                            placeholder="Ex: Viajará no final de semana."
                            value={swapNote}
                            onChange={(e) => setSwapNote(e.target.value)}
                            style={{ padding: "8px 12px", borderRadius: "10px", border: "1px solid var(--alvo-line)", outline: "none", fontSize: "0.85rem", background: "white", color: "var(--alvo-ink)" }}
                          />
                        </div>
                        <div style={{ display: "flex", gap: "0.5rem", marginTop: 4 }}>
                          <button 
                            onClick={() => void handleRequestSwap(assignment.id, swapReplacementPersonId, swapNote)}
                            style={{ background: "#8b5cf6", border: "none", color: "white", borderRadius: "10px", padding: "8px 16px", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}
                          >
                            Confirmar Solicitação
                          </button>
                          <button 
                            onClick={() => setRequestingSwapForAssignmentId(null)}
                            style={{ background: "white", border: "1px solid var(--alvo-line)", color: "var(--alvo-ink)", borderRadius: "10px", padding: "8px 16px", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
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
                      onClick={() => handleQuickAssign(p, customRoleInput.trim() || undefined)}
                      style={{ background: "var(--alvo-accent)", border: "none", color: "white", borderRadius: "8px", padding: "6px", fontSize: "0.7rem", fontWeight: 700, cursor: "pointer", marginTop: 10 }}
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
            <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" }}>
              <div style={{ position: "relative", flex: 2, minWidth: "200px" }}>
                <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--alvo-ink-soft)" }} />
                <input 
                  placeholder="Buscar voluntário pelo nome..." 
                  value={memberSearch}
                  onChange={e => setMemberSearch(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px 10px 36px", background: "white", border: "1px solid var(--alvo-line)", borderRadius: "12px", color: "var(--alvo-ink)", outline: "none", fontSize: "0.85rem" }}
                />
              </div>
              <div style={{ flex: 1, minWidth: "120px" }}>
                <input 
                  placeholder="Função (Ex: Som)" 
                  value={customRoleInput}
                  onChange={e => setCustomRoleInput(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", background: "white", border: "1px solid var(--alvo-line)", borderRadius: "12px", color: "var(--alvo-ink)", outline: "none", fontSize: "0.85rem" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", maxHeight: "150px", overflowY: "auto", paddingRight: 4 }}>
              {filteredCandidatePeople.slice(0, 15).map((p) => (
                <button 
                  key={p.id} 
                  onClick={() => handleQuickAssign(p, customRoleInput.trim() || undefined)}
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
                style={{ background: "var(--alvo-accent)", color: "white", border: "none", borderRadius: "10px", padding: "10px", fontWeight: 800, cursor: "pointer", marginTop: 6 }}
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
                style={{ flex: 1, background: "var(--alvo-green)", color: "white", border: "none", padding: "10px", borderRadius: "10px", fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
              >
                <Send size={15} /> Disparar WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
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
