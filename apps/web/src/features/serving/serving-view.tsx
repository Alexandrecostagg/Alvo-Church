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
  fetchServiceAssignments,
  fetchPeople,
  isFirebaseWebRuntimeConfigured,
  saveServiceAssignment,
  savePersonProfile
} from "@alvo/firebase";
import type { FormEvent } from "react";
import type { Person, ServiceAssignment, ServiceAssignmentStatus } from "@alvo/types";
import { useAppAuth } from "../../../app/providers";

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

const initialAssignments: ServiceAssignment[] = [
  {
    id: "scale_reception_1",
    organizationId: "demo_org",
    serviceTeamId: "reception",
    ministryCode: "reception",
    personId: "person_1",
    role: "Recepcao principal",
    serviceDate: "2026-05-03T08:30:00.000Z",
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
    role: "Mesa de som",
    serviceDate: "2026-05-03T08:00:00.000Z",
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
    role: "Vocal",
    serviceDate: "2026-05-03T07:45:00.000Z",
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
    role: "Sala 4-7 anos",
    serviceDate: "2026-05-03T08:45:00.000Z",
    status: "pending",
    createdAt: "2026-04-29T08:30:00.000Z",
    updatedAt: "2026-04-29T08:30:00.000Z"
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

export function ServingView() {
  const { configured, firebaseReady, user, organizationId, firebaseConfig } = useAppAuth();
  const [people, setPeople] = useState<Person[]>([]);
  const [assignments, setAssignments] = useState<ServiceAssignment[]>(initialAssignments);
  const [assignmentNoteDrafts, setAssignmentNoteDrafts] = useState<Record<string, string>>({});
  const [assignMode, setAssignMode] = useState<"members" | "new">("members");
  const [selectedMinistryCode, setSelectedMinistryCode] = useState<(typeof ministryTeams)[number]["code"]>("reception");
  const [servantDraft, setServantDraft] = useState({
    email: "",
    name: "",
    phone: "",
    role: "Apoio"
  });
  const [status, setStatus] = useState("Carregando escalas...");

  useEffect(() => {
    if (!configured || !firebaseReady || !user || !isFirebaseWebRuntimeConfigured(firebaseConfig)) {
      setStatus("Entre no Firebase para carregar pessoas reais da igreja.");
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

        if (cancelled) {
          return;
        }

        setPeople(nextPeople);
        if (nextAssignments.length) {
          setAssignments(nextAssignments);
        }
        setStatus(
          nextAssignments.length
            ? `${nextAssignments.length} escala(s) sincronizada(s) com ${nextPeople.length} pessoa(s).`
            : `${nextPeople.length} pessoa(s) disponiveis. Crie a primeira escala real.`
        );
      } catch (error) {
        if (!cancelled) {
          setStatus(error instanceof Error ? error.message : "Nao foi possivel carregar pessoas.");
        }
      }
    }

    void loadServingData();

    return () => {
      cancelled = true;
    };
  }, [configured, firebaseConfig, firebaseReady, organizationId, user]);

  const selectedMinistry = ministryTeams.find((team) => team.code === selectedMinistryCode) ?? ministryTeams[0];
  const selectedAssignments = assignments.filter(
    (assignment) => assignment.ministryCode === selectedMinistry.code
  );
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
  const candidatePeople = availablePeople.length ? availablePeople : people;
  const nextActionLabel =
    selectedAssignments.length === 0
      ? "Monte a primeira escala deste ministerio"
      : selectedPendingCount > 0
        ? "Acompanhe quem ainda precisa responder"
        : "Registre presenca no dia da celebracao";

  async function handleAssignmentStatus(
    assignmentId: string,
    nextStatus: ServiceAssignmentStatus,
    responseNote?: string
  ) {
    const currentAssignment = assignments.find((assignment) => assignment.id === assignmentId);

    if (!currentAssignment) {
      setStatus("Nao encontramos essa escala para atualizar.");
      return;
    }

    const updatedAssignment = applyAssignmentStatus(currentAssignment, nextStatus, responseNote);

    setAssignments((currentAssignments) =>
      currentAssignments.map((assignment) =>
        assignment.id === assignmentId ? updatedAssignment : assignment
      )
    );
    setStatus(`Escala marcada como ${getAssignmentStatusLabel(nextStatus)}.`);

    if (configured && firebaseReady && user && isFirebaseWebRuntimeConfigured(firebaseConfig)) {
      try {
        await saveServiceAssignment(firebaseConfig, { organizationId }, updatedAssignment);
        setStatus(`Escala marcada como ${getAssignmentStatusLabel(nextStatus)} e sincronizada.`);
      } catch (error) {
        setStatus(
          error instanceof Error
            ? `Escala atualizada localmente, mas o Firebase retornou: ${error.message}`
            : "Escala atualizada localmente, mas nao foi possivel sincronizar."
        );
      }
    }
  }

  async function handleQuickAssign(person: Person, role = "Apoio") {
    const now = new Date().toISOString();
    const newAssignment: ServiceAssignment = {
      id: `service_assignment_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      organizationId,
      serviceTeamId: selectedMinistry.code,
      ministryCode: selectedMinistry.code,
      personId: person.id,
      role,
      serviceDate: now,
      status: "pending",
      createdAt: now,
      updatedAt: now
    };
    setAssignments((currentAssignments) => [newAssignment, ...currentAssignments]);
    setStatus(`${getFullName(person)} escalado em ${selectedMinistry.name}.`);

    if (configured && firebaseReady && user && isFirebaseWebRuntimeConfigured(firebaseConfig)) {
      try {
        await saveServiceAssignment(firebaseConfig, { organizationId }, newAssignment);
        setStatus(`${getFullName(person)} escalado em ${selectedMinistry.name} e salvo no Firebase.`);
      } catch (error) {
        setStatus(
          error instanceof Error
            ? `Escala local criada, mas o Firebase retornou: ${error.message}`
            : "Escala local criada, mas nao foi possivel salvar no Firebase."
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
    await handleQuickAssign(servant, role);
    setServantDraft({ email: "", name: "", phone: "", role: "Apoio" });
  }

  return (
    <main className="form-page serving-page">
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

      <section className="serving-flow-card" aria-label="Fluxo recomendado para escalas">
        <div>
          <span>1</span>
          <strong>Escolha o ministerio</strong>
          <p>Recepcao, midia, louvor, criancas ou operacao.</p>
        </div>
        <div>
          <span>2</span>
          <strong>Adicione pessoas</strong>
          <p>Puxe membros da base ou cadastre um novo servo.</p>
        </div>
        <div>
          <span>3</span>
          <strong>Confirme respostas</strong>
          <p>Quem aceitou, justificou ou ainda esta pendente.</p>
        </div>
        <div>
          <span>4</span>
          <strong>Registre presenca</strong>
          <p>No dia, marque presenca, falta ou observacao.</p>
        </div>
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

          <div className="serving-next-step">
            <div>
              <span>Proximo passo</span>
              <strong>{nextActionLabel}</strong>
              <p>{selectedMinistry.summary}</p>
            </div>
            <button
              className="primary-button compact-button"
              onClick={() => setAssignMode(selectedAssignments.length ? "members" : "new")}
              type="button"
            >
              Adicionar servo
            </button>
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
                      {assignment.responseNote ? <small>{assignment.responseNote}</small> : null}
                      <input
                        className="scale-note-input"
                        onChange={(event) =>
                          setAssignmentNoteDrafts((currentDrafts) => ({
                            ...currentDrafts,
                            [assignment.id]: event.target.value
                          }))
                        }
                        placeholder="Justificativa ou observacao"
                        value={assignmentNoteDrafts[assignment.id] ?? ""}
                      />
                    </div>
                    <div className="scale-actions">
                      <button className="ghost-button" onClick={() => void handleAssignmentStatus(assignment.id, "confirmed")} type="button">
                        Confirmar
                      </button>
                      <button
                        className="ghost-button"
                        onClick={() =>
                          void handleAssignmentStatus(
                            assignment.id,
                            "declined",
                            assignmentNoteDrafts[assignment.id] || "Impossibilidade justificada."
                          )
                        }
                        type="button"
                      >
                        Justificar
                      </button>
                      <button className="primary-button compact-button" onClick={() => void handleAssignmentStatus(assignment.id, "present")} type="button">
                        Presenca
                      </button>
                      <button
                        className="ghost-button"
                        onClick={() =>
                          void handleAssignmentStatus(
                            assignment.id,
                            "absent",
                            assignmentNoteDrafts[assignment.id] || "Falta registrada."
                          )
                        }
                        type="button"
                      >
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
          <div className="serving-mode-switch" role="tablist" aria-label="Forma de adicionar servo">
            <button
              aria-selected={assignMode === "members"}
              className={assignMode === "members" ? "is-active" : ""}
              onClick={() => setAssignMode("members")}
              type="button"
            >
              Puxar membro
            </button>
            <button
              aria-selected={assignMode === "new"}
              className={assignMode === "new" ? "is-active" : ""}
              onClick={() => setAssignMode("new")}
              type="button"
            >
              Novo servo
            </button>
          </div>

          {assignMode === "new" ? (
            <form className="servant-intake-form" onSubmit={handleServantRegistration}>
              <strong>Novo servo</strong>
              <p>Use quando a pessoa ainda nao existe na base de membros.</p>
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
          ) : (
            <div className="volunteer-list">
              {candidatePeople.slice(0, 10).map((person) => (
                <button className="volunteer-card" key={person.id} onClick={() => void handleQuickAssign(person)} type="button">
                  <strong>{getFullName(person)}</strong>
                  <p>{getMemberStatusLabel(person.memberStatus)}</p>
                  <small>Escalar em {selectedMinistry.name}</small>
                </button>
              ))}
              {candidatePeople.length === 0 ? (
                <div className="empty-state">
                  <strong>Nenhum membro carregado</strong>
                  <p>Entre no Firebase ou cadastre um novo servo para continuar.</p>
                </div>
              ) : null}
            </div>
          )}
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
