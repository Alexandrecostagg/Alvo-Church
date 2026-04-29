"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Handshake,
  ShieldCheck,
  UsersRound
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  createFirebaseWebRuntimeConfigFromEnv,
  fetchPeople,
  isFirebaseWebRuntimeConfigured,
  savePersonProfile
} from "@alvo/firebase";
import type { FormEvent } from "react";
import type { Person } from "@alvo/types";
import { ModuleNav } from "../module-nav";
import { useAppAuth } from "../providers";

const organizationId = "org_alvo_demo";

const ministryTeams = [
  {
    code: "reception",
    name: "Recepcao e portaria",
    summary: "Primeira impressao, visitantes, seguranca e acolhimento.",
    target: 6
  },
  {
    code: "media",
    name: "Midia, som e transmissao",
    summary: "Slides, audio, video, lives e apoio tecnico da celebracao.",
    target: 5
  },
  {
    code: "worship",
    name: "Louvor e banda",
    summary: "Vocal, instrumentos, ensaio, repertorio e passagem de som.",
    target: 8
  },
  {
    code: "kids",
    name: "Criancas",
    summary: "Sala infantil, check-in, cuidado e atividades por faixa etaria.",
    target: 7
  },
  {
    code: "operations",
    name: "Limpeza e organizacao",
    summary: "Montagem, limpeza, cafe, cadeiras e apoio em eventos.",
    target: 10
  }
] as const;

type AssignmentStatus = "pending" | "confirmed" | "declined" | "present" | "absent";

type Assignment = {
  id: string;
  ministryCode: (typeof ministryTeams)[number]["code"];
  personId: string;
  role: string;
  serviceDate: string;
  status: AssignmentStatus;
};

const initialAssignments: Assignment[] = [
  {
    id: "scale_reception_1",
    ministryCode: "reception",
    personId: "person_1",
    role: "Recepcao principal",
    serviceDate: "2026-05-03T08:30:00.000Z",
    status: "confirmed"
  },
  {
    id: "scale_media_1",
    ministryCode: "media",
    personId: "person_2",
    role: "Mesa de som",
    serviceDate: "2026-05-03T08:00:00.000Z",
    status: "pending"
  },
  {
    id: "scale_worship_1",
    ministryCode: "worship",
    personId: "person_3",
    role: "Vocal",
    serviceDate: "2026-05-03T07:45:00.000Z",
    status: "confirmed"
  },
  {
    id: "scale_kids_1",
    ministryCode: "kids",
    personId: "person_4",
    role: "Sala 4-7 anos",
    serviceDate: "2026-05-03T08:45:00.000Z",
    status: "pending"
  }
];

const employeeRecords = [
  {
    name: "Zeladoria semanal",
    role: "Funcionario contratado",
    status: "Contrato ativo",
    nextAction: "Conferir ponto e escala de limpeza"
  },
  {
    name: "Administrativo",
    role: "Secretaria",
    status: "Carga horaria fixa",
    nextAction: "Validar demandas da semana"
  }
];

export default function ServingPage() {
  const { configured, firebaseReady, user } = useAppAuth();
  const [people, setPeople] = useState<Person[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments);
  const [selectedMinistryCode, setSelectedMinistryCode] = useState<(typeof ministryTeams)[number]["code"]>("reception");
  const [servantDraft, setServantDraft] = useState({
    email: "",
    name: "",
    phone: "",
    role: "Apoio"
  });
  const [status, setStatus] = useState("Carregando escalas...");

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
      setStatus("Entre no Firebase para carregar pessoas reais da igreja.");
      return;
    }

    let cancelled = false;

    async function loadPeople() {
      setStatus("Sincronizando pessoas para montar escalas...");

      try {
        const nextPeople = await fetchPeople(firebaseConfig, { organizationId }, 160);

        if (cancelled) {
          return;
        }

        setPeople(nextPeople);
        setStatus(`${nextPeople.length} pessoa(s) disponiveis para escalas.`);
      } catch (error) {
        if (!cancelled) {
          setStatus(error instanceof Error ? error.message : "Nao foi possivel carregar pessoas.");
        }
      }
    }

    void loadPeople();

    return () => {
      cancelled = true;
    };
  }, [configured, firebaseConfig, firebaseReady, user]);

  const selectedMinistry = ministryTeams.find((team) => team.code === selectedMinistryCode) ?? ministryTeams[0];
  const selectedAssignments = assignments.filter(
    (assignment) => assignment.ministryCode === selectedMinistry.code
  );
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
  const candidatePeople = availablePeople.length ? availablePeople : people;

  function handleAssignmentStatus(assignmentId: string, nextStatus: AssignmentStatus) {
    setAssignments((currentAssignments) =>
      currentAssignments.map((assignment) =>
        assignment.id === assignmentId ? { ...assignment, status: nextStatus } : assignment
      )
    );
    setStatus(`Escala marcada como ${getAssignmentStatusLabel(nextStatus)}.`);
  }

  function handleQuickAssign(person: Person, role = "Apoio") {
    const newAssignment: Assignment = {
      id: `scale_local_${Date.now()}`,
      ministryCode: selectedMinistry.code,
      personId: person.id,
      role,
      serviceDate: new Date().toISOString(),
      status: "pending"
    };
    setAssignments((currentAssignments) => [newAssignment, ...currentAssignments]);
    setStatus(`${getFullName(person)} escalado em ${selectedMinistry.name}.`);
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
        setStatus(`${getFullName(servant)} cadastrado como voluntario e escalado em ${selectedMinistry.name}.`);
      } catch (error) {
        setStatus(
          error instanceof Error
            ? `Cadastro local feito, mas o Firebase retornou: ${error.message}`
            : "Cadastro local feito, mas nao foi possivel salvar no Firebase."
        );
      }
    } else {
      setStatus(`${getFullName(servant)} cadastrado localmente e escalado em ${selectedMinistry.name}.`);
    }

    setPeople((currentPeople) => [servant, ...currentPeople]);
    handleQuickAssign(servant, role);
    setServantDraft({ email: "", name: "", phone: "", role: "Apoio" });
  }

  return (
    <main className="form-page serving-page">
      <ModuleNav />
      <section className="serving-hero">
        <div>
          <Link className="back-link" href="/">
            Voltar ao painel
          </Link>
          <p className="eyebrow">Escalas e equipes</p>
          <h1>Quem serve tambem precisa de cuidado e clareza.</h1>
          <p>
            Organize voluntarios, confirme escalas, registre presenca, trate
            justificativas e separe a gestao de funcionarios contratados.
          </p>
        </div>
        <aside className="serving-status-card">
          <Handshake size={24} />
          <strong>{coverage}%</strong>
          <span>cobertura confirmada</span>
          <p>{status}</p>
        </aside>
      </section>

      <section className="serving-metric-grid">
        <ServingMetric detail="confirmados ou presentes" icon={CheckCircle2} label="Confirmados" value={confirmedCount} />
        <ServingMetric detail="aguardando resposta" icon={Clock3} label="Pendentes" value={pendingCount} />
        <ServingMetric detail="faltas ou impossibilidade" icon={AlertTriangle} label="Riscos" value={declinedCount} />
        <ServingMetric detail="pessoas elegiveis" icon={UsersRound} label="Base" value={availablePeople.length || people.length} />
      </section>

      <section className="serving-workbench">
        <aside className="serving-panel">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">Ministerios</p>
              <h2>Frentes de servico</h2>
            </div>
          </div>
          <div className="ministry-list">
            {ministryTeams.map((team) => {
              const teamAssignments = assignments.filter((assignment) => assignment.ministryCode === team.code);
              const teamConfirmed = teamAssignments.filter((assignment) =>
                ["confirmed", "present"].includes(assignment.status)
              ).length;

              return (
                <button
                  className={selectedMinistry.code === team.code ? "ministry-card is-selected" : "ministry-card"}
                  key={team.code}
                  onClick={() => setSelectedMinistryCode(team.code)}
                  type="button"
                >
                  <span>{teamConfirmed}/{team.target}</span>
                  <strong>{team.name}</strong>
                  <p>{team.summary}</p>
                </button>
              );
            })}
          </div>
        </aside>

        <article className="serving-panel span-2">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Escala selecionada</p>
              <h2>{selectedMinistry.name}</h2>
            </div>
            <span className="soft-pill">{selectedAssignments.length} pessoa(s)</span>
          </div>

          <div className="scale-list">
            {selectedAssignments.length ? (
              selectedAssignments.map((assignment) => {
                const person = people.find((item) => item.id === assignment.personId);

                return (
                  <div className={`scale-card is-${assignment.status}`} key={assignment.id}>
                    <div>
                      <span>{getAssignmentStatusLabel(assignment.status)}</span>
                      <strong>{person ? getFullName(person) : assignment.personId}</strong>
                      <p>{assignment.role} - {formatDateTime(assignment.serviceDate)}</p>
                    </div>
                    <div className="scale-actions">
                      <button className="ghost-button" onClick={() => handleAssignmentStatus(assignment.id, "confirmed")} type="button">
                        Confirmar
                      </button>
                      <button className="ghost-button" onClick={() => handleAssignmentStatus(assignment.id, "declined")} type="button">
                        Justificar
                      </button>
                      <button className="primary-button compact-button" onClick={() => handleAssignmentStatus(assignment.id, "present")} type="button">
                        Presenca
                      </button>
                      <button className="ghost-button" onClick={() => handleAssignmentStatus(assignment.id, "absent")} type="button">
                        Falta
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="empty-state">
                <strong>Ninguem escalado</strong>
                <p>Use a fila de pessoas para montar a escala deste ministerio.</p>
              </div>
            )}
          </div>
        </article>

        <aside className="serving-panel">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">Adicionar pessoa</p>
              <h2>Cadastrar ou puxar</h2>
            </div>
          </div>
          <form className="servant-intake-form" onSubmit={handleServantRegistration}>
            <strong>Novo servo</strong>
            <p>Cadastre quem ainda nao esta na base e ja coloque na escala.</p>
            <label>
              Nome
              <input
                onChange={(event) =>
                  setServantDraft((currentDraft) => ({ ...currentDraft, name: event.target.value }))
                }
                placeholder="Nome completo"
                value={servantDraft.name}
              />
            </label>
            <label>
              Telefone / WhatsApp
              <input
                onChange={(event) =>
                  setServantDraft((currentDraft) => ({ ...currentDraft, phone: event.target.value }))
                }
                placeholder="(00) 00000-0000"
                value={servantDraft.phone}
              />
            </label>
            <label>
              Funcao na escala
              <input
                onChange={(event) =>
                  setServantDraft((currentDraft) => ({ ...currentDraft, role: event.target.value }))
                }
                placeholder="Ex: Recepcao lateral"
                value={servantDraft.role}
              />
            </label>
            <label>
              E-mail opcional
              <input
                onChange={(event) =>
                  setServantDraft((currentDraft) => ({ ...currentDraft, email: event.target.value }))
                }
                placeholder="email@igreja.com"
                value={servantDraft.email}
              />
            </label>
            <button className="primary-button full" type="submit">
              Cadastrar e escalar
            </button>
          </form>
          <div className="serving-divider">
            <span>Puxar dos membros</span>
          </div>
          <div className="volunteer-list">
            {candidatePeople.slice(0, 10).map((person) => (
              <button className="volunteer-card" key={person.id} onClick={() => handleQuickAssign(person)} type="button">
                <strong>{getFullName(person)}</strong>
                <p>{getMemberStatusLabel(person.memberStatus)}</p>
                <small>Escalar em {selectedMinistry.name}</small>
              </button>
            ))}
          </div>
        </aside>
      </section>

      <section className="staff-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Area separada</p>
            <h2>Funcionarios contratados</h2>
          </div>
          <span className="soft-pill">RH e operacao</span>
        </div>
        <div className="staff-grid">
          {employeeRecords.map((employee) => (
            <article className="staff-card" key={employee.name}>
              <ShieldCheck size={18} />
              <strong>{employee.name}</strong>
              <p>{employee.role}</p>
              <span>{employee.status}</span>
              <small>{employee.nextAction}</small>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function ServingMetric({
  detail,
  icon: Icon,
  label,
  value
}: {
  detail: string;
  icon: typeof CheckCircle2;
  label: string;
  value: number | string;
}) {
  return (
    <article className="serving-metric-card">
      <Icon size={19} />
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

function getFullName(person: Person) {
  return `${person.preferredName || person.firstName} ${person.lastName}`.trim();
}

function getMemberStatusLabel(status: Person["memberStatus"]) {
  switch (status) {
    case "visitor":
      return "Visitante";
    case "congregant":
      return "Congregado / aspirante";
    case "new_believer":
      return "Novo convertido";
    case "member":
      return "Membro";
    case "leader":
      return "Lider";
    case "volunteer":
      return "Voluntario";
  }
}

function getAssignmentStatusLabel(status: AssignmentStatus) {
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

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit"
  }).format(date);
}
