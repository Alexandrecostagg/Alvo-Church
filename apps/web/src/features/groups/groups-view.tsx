"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  UserPlus,
  UsersRound,
  Waypoints
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  assignPersonToGroup,
  createGroup,
  createGroupMeeting,
  createFirebaseWebRuntimeConfigFromEnv,
  fetchGroupAttendance,
  fetchGroupMeetings,
  fetchGroupMembers,
  fetchGroups,
  fetchPeople,
  isFirebaseWebRuntimeConfigured,
  recordGroupAttendance,
  updateGroupMeetingStatus
} from "@alvo/firebase";
import type { Group, GroupAttendance, GroupMeeting, GroupMember, Person } from "@alvo/types";
import { useAppAuth } from "../../../app/providers";

const weekdayOptions = [
  { label: "Domingo", value: 0 },
  { label: "Segunda", value: 1 },
  { label: "Terca", value: 2 },
  { label: "Quarta", value: 3 },
  { label: "Quinta", value: 4 },
  { label: "Sexta", value: 5 },
  { label: "Sabado", value: 6 }
];

type GroupFollowUpItem = {
  level: "attention" | "risk";
  message: string;
  personId: string;
  personName: string;
  reason: string;
  whatsappHref: string | null;
};

export function GroupsView() {
  const { configured, firebaseReady, user, organizationId, firebaseConfig } = useAppAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [meetings, setMeetings] = useState<GroupMeeting[]>([]);
  const [attendance, setAttendance] = useState<GroupAttendance[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [status, setStatus] = useState("Carregando celulas...");
  const [copiedFollowUpPersonId, setCopiedFollowUpPersonId] = useState<string | null>(null);
  const [copiedMeetingSummaryId, setCopiedMeetingSummaryId] = useState<string | null>(null);
  const [groupForm, setGroupForm] = useState({
    capacity: "12",
    city: "",
    meetingDayOfWeek: "3",
    meetingTime: "19:30",
    name: "",
    state: "",
    tribeCode: "",
    type: "cell",
    leaderPersonId: ""
  });
  const [groupFormError, setGroupFormError] = useState("");
  const [groupFormSuccess, setGroupFormSuccess] = useState("");
  const [groupFormSaving, setGroupFormSaving] = useState(false);

  useEffect(() => {
    if (!configured || !firebaseReady || !user || !isFirebaseWebRuntimeConfigured(firebaseConfig)) {
      setStatus("Entre no Firebase para carregar celulas reais.");
      return;
    }

    let cancelled = false;

    async function loadGroupsCenter() {
      setStatus("Sincronizando celulas, membros e presencas...");

      try {
        const [nextGroups, nextPeople] = await Promise.all([
          fetchGroups(firebaseConfig, { organizationId }, 80),
          fetchPeople(firebaseConfig, { organizationId }, 160)
        ]);
        const [nextMembers, nextMeetings] = nextGroups.length
          ? await Promise.all([
              fetchGroupMembers(firebaseConfig, { organizationId }, nextGroups, 60),
              fetchGroupMeetings(firebaseConfig, { organizationId }, nextGroups, 8)
            ])
          : [[], []];
        const nextAttendance = nextMeetings.length
          ? await fetchGroupAttendance(firebaseConfig, { organizationId }, nextMeetings, 80)
          : [];

        if (cancelled) {
          return;
        }

        setGroups(nextGroups);
        setPeople(nextPeople);
        setGroupMembers(nextMembers);
        setMeetings(nextMeetings);
        setAttendance(nextAttendance);
        setSelectedGroupId((currentId) => currentId ?? nextGroups[0]?.id ?? null);
        setStatus(
          `${nextGroups.length} celula(s), ${nextMembers.length} vinculo(s), ${nextMeetings.length} encontro(s) e ${nextAttendance.length} presenca(s).`
        );
      } catch (error) {
        if (!cancelled) {
          setStatus(error instanceof Error ? error.message : "Nao foi possivel carregar celulas.");
        }
      }
    }

    void loadGroupsCenter();

    return () => {
      cancelled = true;
    };
  }, [configured, firebaseConfig, firebaseReady, organizationId, user]);

  const selectedGroup = groups.find((group) => group.id === selectedGroupId) ?? null;
  const selectedMembers = selectedGroup
    ? groupMembers.filter((member) => member.groupId === selectedGroup.id)
    : [];
  const selectedMeetings = selectedGroup
    ? meetings.filter((meeting) => meeting.groupId === selectedGroup.id)
    : [];
  const selectedAttendance = selectedGroup
    ? attendance.filter((item) => item.groupId === selectedGroup.id)
    : [];
  const selectedActiveMeeting =
    selectedMeetings.find((meeting) => meeting.meetingStatus === "scheduled") ?? null;
  const selectedReportMeeting =
    selectedActiveMeeting ??
    [...selectedMeetings].sort(
      (firstMeeting, secondMeeting) =>
        new Date(secondMeeting.scheduledStartAt).getTime() -
        new Date(firstMeeting.scheduledStartAt).getTime()
    )[0] ??
    null;
  const peopleWithoutGroup = people.filter(
    (person) => !groupMembers.some((member) => member.personId === person.id)
  );
  const totalCapacity = groups.reduce((sum, group) => sum + (group.capacity ?? 0), 0);
  const activeGroups = groups.filter((group) => group.status === "active");
  const presentCount = attendance.filter((item) =>
    ["present", "first_time_guest"].includes(item.attendanceStatus)
  ).length;
  const attendanceRate = attendance.length
    ? Math.round((presentCount / attendance.length) * 100)
    : 0;
  const groupHealth = selectedGroup
    ? getGroupHealth(selectedGroup, selectedMembers, selectedAttendance)
    : null;
  const selectedMeetingSummary = selectedGroup && selectedReportMeeting
    ? getMeetingSummary({
        attendance: selectedAttendance,
        group: selectedGroup,
        meeting: selectedReportMeeting,
        members: selectedMembers
      })
    : null;
  const selectedFollowUpQueue = selectedGroup && selectedReportMeeting
    ? getGroupFollowUpQueue({
        attendance: selectedAttendance,
        meeting: selectedReportMeeting,
        members: selectedMembers,
        people
      })
    : [];

  async function handleAssignPerson(person: Person) {
    if (!selectedGroup) {
      setStatus("Selecione uma celula antes de vincular uma pessoa.");
      return;
    }

    const localMember: GroupMember = {
      id: `${selectedGroup.id}_${person.id}`,
      organizationId,
      groupId: selectedGroup.id,
      personId: person.id,
      roleInGroup: person.memberStatus === "visitor" ? "visitor" : "member",
      joinedAt: new Date().toISOString()
    };
    setGroupMembers((currentMembers) => [
      localMember,
      ...currentMembers.filter((member) => member.id !== localMember.id)
    ]);
    setStatus(`${getFullName(person)} vinculado a ${selectedGroup.name}.`);

    if (!configured || !user || !isFirebaseWebRuntimeConfigured(firebaseConfig)) {
      setStatus("Vinculo criado localmente. Conecte o Firebase para persistir.");
      return;
    }

    try {
      const savedMember = await assignPersonToGroup(firebaseConfig, { organizationId }, {
        assignedByUserId: user.uid,
        groupId: selectedGroup.id,
        personId: person.id,
        roleInGroup: person.memberStatus === "visitor" ? "visitor" : "member"
      });
      setGroupMembers((currentMembers) =>
        currentMembers.map((member) => (member.id === localMember.id ? savedMember : member))
      );
      setStatus("Vinculo com celula salvo no Firestore.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Nao foi possivel vincular a celula.");
    }
  }

  async function handleCreateGroup() {
    const name = groupForm.name.trim();
    setGroupFormError("");
    setGroupFormSuccess("");

    if (!name) {
      setGroupFormError("Digite o nome da célula para continuar.");
      return;
    }

    setGroupFormSaving(true);
    const capacity = Number.parseInt(groupForm.capacity, 10);
    const localGroup: Group = {
      id: `group_local_${Date.now()}`,
      organizationId,
      name,
      slug: slugifyLocal(name),
      type: groupForm.type as Group["type"],
      status: "active",
      visibility: "internal",
      meetingDayOfWeek: Number.parseInt(groupForm.meetingDayOfWeek, 10),
      meetingTime: groupForm.meetingTime || undefined,
      city: groupForm.city.trim() || undefined,
      state: groupForm.state.trim() || undefined,
      capacity: Number.isNaN(capacity) ? undefined : capacity,
      tribeCode: (groupForm.tribeCode || undefined) as Group["tribeCode"]
    };
    setGroups((currentGroups) => [localGroup, ...currentGroups]);
    setSelectedGroupId(localGroup.id);
    setGroupForm((currentForm) => ({ ...currentForm, name: "", city: "", state: "", tribeCode: "", capacity: "12" }));

    if (!configured || !user || !isFirebaseWebRuntimeConfigured(firebaseConfig)) {
      setGroupFormSuccess(`✅ "${localGroup.name}" criada! Conecte o Firebase para salvar permanentemente.`);
      setGroupFormSaving(false);
      return;
    }

    try {
      const savedGroup = await createGroup(firebaseConfig, { organizationId }, {
        capacity: localGroup.capacity,
        city: localGroup.city,
        createdByUserId: user.uid,
        meetingDayOfWeek: localGroup.meetingDayOfWeek,
        meetingTime: localGroup.meetingTime,
        name: localGroup.name,
        state: localGroup.state,
        type: localGroup.type,
        tribeCode: localGroup.tribeCode
      } as any);
      setGroups((currentGroups) =>
        currentGroups.map((group) => (group.id === localGroup.id ? savedGroup : group))
      );
      setSelectedGroupId(savedGroup.id);
      setGroupFormSuccess(`✅ "${savedGroup.name}" salva no Firestore!`);
    } catch (error) {
      setGroupFormError(error instanceof Error ? error.message : "Não foi possível salvar a célula.");
    } finally {
      setGroupFormSaving(false);
    }
  }

  async function handleCreateMeeting() {
    if (!selectedGroup) {
      setStatus("Selecione uma celula antes de abrir um encontro.");
      return;
    }

    const localMeeting: GroupMeeting = {
      id: `meeting_local_${Date.now()}`,
      organizationId,
      groupId: selectedGroup.id,
      scheduledStartAt: new Date().toISOString(),
      meetingStatus: "scheduled"
    };
    setMeetings((currentMeetings) => [localMeeting, ...currentMeetings]);
    setStatus(`Encontro aberto para ${selectedGroup.name}.`);

    if (!configured || !user || !isFirebaseWebRuntimeConfigured(firebaseConfig)) {
      setStatus("Encontro criado localmente. Conecte o Firebase para persistir.");
      return;
    }

    try {
      const savedMeeting = await createGroupMeeting(firebaseConfig, { organizationId }, {
        createdByUserId: user.uid,
        groupId: selectedGroup.id,
        scheduledStartAt: localMeeting.scheduledStartAt
      });
      setMeetings((currentMeetings) =>
        currentMeetings.map((meeting) =>
          meeting.id === localMeeting.id ? savedMeeting : meeting
        )
      );
      setStatus("Encontro salvo no Firestore.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Nao foi possivel abrir o encontro.");
    }
  }

  async function handleAttendance(
    member: GroupMember,
    attendanceStatus: GroupAttendance["attendanceStatus"]
  ) {
    if (!selectedGroup || !selectedActiveMeeting) {
      setStatus("Abra um encontro antes de registrar presenca.");
      return;
    }

    const localAttendance: GroupAttendance = {
      id: `${selectedActiveMeeting.id}_${member.personId}`,
      organizationId,
      groupId: selectedGroup.id,
      groupMeetingId: selectedActiveMeeting.id,
      personId: member.personId,
      attendanceStatus
    };
    setAttendance((currentAttendance) => [
      localAttendance,
      ...currentAttendance.filter((item) => item.id !== localAttendance.id)
    ]);
    setStatus(`Presenca marcada como ${getAttendanceLabel(attendanceStatus)}.`);

    if (!configured || !user || !isFirebaseWebRuntimeConfigured(firebaseConfig)) {
      setStatus("Presenca registrada localmente. Conecte o Firebase para persistir.");
      return;
    }

    try {
      const savedAttendance = await recordGroupAttendance(firebaseConfig, { organizationId }, {
        groupId: selectedGroup.id,
        groupMeetingId: selectedActiveMeeting.id,
        personId: member.personId,
        recordedByUserId: user.uid,
        status: attendanceStatus
      });
      setAttendance((currentAttendance) =>
        currentAttendance.map((item) =>
          item.id === localAttendance.id ? savedAttendance : item
        )
      );
      setStatus("Presenca salva no Firestore.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Nao foi possivel registrar presenca.");
    }
  }

  async function handleCloseMeeting() {
    if (!selectedGroup || !selectedActiveMeeting) {
      setStatus("Abra ou selecione um encontro antes de encerrar.");
      return;
    }

    setMeetings((currentMeetings) =>
      currentMeetings.map((meeting) =>
        meeting.id === selectedActiveMeeting.id
          ? { ...meeting, meetingStatus: "completed" }
          : meeting
      )
    );
    setStatus(`Encontro de ${selectedGroup.name} encerrado.`);

    if (!configured || !user || !isFirebaseWebRuntimeConfigured(firebaseConfig)) {
      setStatus("Encontro encerrado localmente. Conecte o Firebase para persistir.");
      return;
    }

    try {
      await updateGroupMeetingStatus(firebaseConfig, { organizationId }, {
        groupId: selectedGroup.id,
        meetingId: selectedActiveMeeting.id,
        status: "completed",
        updatedByUserId: user.uid
      });
      setStatus("Encontro encerrado no Firestore.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Nao foi possivel encerrar o encontro.");
    }
  }

  async function handleCopyFollowUp(item: GroupFollowUpItem) {
    try {
      await navigator.clipboard.writeText(item.message);
      setCopiedFollowUpPersonId(item.personId);
      setStatus(`Mensagem de cuidado copiada para ${item.personName}.`);
    } catch {
      setStatus("Nao foi possivel copiar automaticamente. Selecione a mensagem e copie manualmente.");
    }
  }

  async function handleCopyMeetingSummary() {
    if (!selectedMeetingSummary) {
      setStatus("Abra um encontro para gerar resumo.");
      return;
    }

    try {
      await navigator.clipboard.writeText(selectedMeetingSummary.text);
      setCopiedMeetingSummaryId(selectedMeetingSummary.meetingId);
      setStatus(`Resumo de ${selectedMeetingSummary.groupName} copiado.`);
    } catch {
      setStatus("Nao foi possivel copiar o resumo automaticamente.");
    }
  }

  return (
    <main className="form-page groups-page animate-entrance">
      <section className="groups-hero">
        <div>
          <Link className="back-link" href="/">
            Voltar ao painel
          </Link>
          <p className="eyebrow">Celulas e pequenos grupos</p>
          <h1>Comunidade pequena, cuidado continuo.</h1>
          <p>
            Acompanhe capacidade, participantes, encontros e pessoas que ainda precisam
            ser conectadas a uma celula.
          </p>
        </div>
        <aside className="groups-status-card antigravity-float">
          <Waypoints size={24} />
          <strong>{peopleWithoutGroup.length}</strong>
          <span>pessoa(s) sem celula</span>
          <p>{status}</p>
        </aside>
      </section>

      <section className="groups-metric-grid">
        <MetricCard detail="grupos ativos" icon={Waypoints} label="Celulas" value={activeGroups.length} />
        <MetricCard detail="pessoas vinculadas" icon={UsersRound} label="Participantes" value={groupMembers.length} />
        <MetricCard detail="capacidade declarada" icon={UserPlus} label="Vagas" value={totalCapacity || "-"} />
        <MetricCard detail="presencas registradas" icon={CheckCircle2} label="Presenca" value={`${attendanceRate}%`} />
      </section>

      <section className="groups-workbench">
        <aside className="groups-list-panel">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">Mapa de celulas</p>
              <h2>{groups.length} grupo(s)</h2>
            </div>
          </div>
          <div className="group-card-list">
            <div className="quick-group-form antigravity-float-delayed">
              <p className="eyebrow">Nova célula</p>
              {groupFormError && (
                <div className="form-inline-error">
                  ⚠️ {groupFormError}
                </div>
              )}
              {groupFormSuccess && (
                <div className="form-inline-success">
                  {groupFormSuccess}
                </div>
              )}
              <label>
                Nome da célula *
                <input
                  onChange={(event) => {
                    setGroupFormError("");
                    setGroupForm((currentForm) => ({ ...currentForm, name: event.target.value }));
                  }}
                  placeholder="Ex.: Célula Centro Sul"
                  value={groupForm.name}
                  style={groupFormError && !groupForm.name ? { borderColor: '#ef4444' } : {}}
                />
              </label>
              <label>
                Tipo
                <select
                  onChange={(event) =>
                    setGroupForm((currentForm) => ({ ...currentForm, type: event.target.value }))
                  }
                  value={groupForm.type}
                >
                  <option value="cell">Célula</option>
                  <option value="small_group">Pequeno Grupo</option>
                  <option value="class">Classe / Escola</option>
                  <option value="youth_group">Grupo de Jovens</option>
                  <option value="ministry_team">Equipe de Ministério</option>
                </select>
              </label>
              <label>
                Tribo vinculada
                <select
                  onChange={(event) =>
                    setGroupForm((currentForm) => ({ ...currentForm, tribeCode: event.target.value }))
                  }
                  value={groupForm.tribeCode}
                >
                  <option value="">Selecionar tribo...</option>
                  <option value="LEVI">🔵 Levi — Adoração e Culto</option>
                  <option value="JUDAH">🟠 Judá — Liderança</option>
                  <option value="ASHER">🟢 Aser — Acolhimento</option>
                  <option value="ISSACHAR">🟣 Issacar — Estratégia</option>
                  <option value="JOSEPH">🩵 José — Administração</option>
                  <option value="NAPHTALI">🩷 Naftali — Artes</option>
                  <option value="ZEBULUN">🟡 Zebulom — Missões</option>
                  <option value="GAD">⚫ Gade — Intercessão</option>
                  <option value="MANASSEH">🩵 Manassés — Cura</option>
                  <option value="EPHRAIM">🟢 Efraim — Ensino</option>
                  <option value="BENJAMIN">💜 Benjamim — Jovens</option>
                  <option value="REUBEN">🔴 Rúben — Família</option>
                </select>
              </label>
              <div className="quick-group-grid">
                <label>
                  Dia
                  <select
                    onChange={(event) =>
                      setGroupForm((currentForm) => ({
                        ...currentForm,
                        meetingDayOfWeek: event.target.value
                      }))
                    }
                    value={groupForm.meetingDayOfWeek}
                  >
                    {weekdayOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Horário
                  <input
                    onChange={(event) =>
                      setGroupForm((currentForm) => ({
                        ...currentForm,
                        meetingTime: event.target.value
                      }))
                    }
                    type="time"
                    value={groupForm.meetingTime}
                  />
                </label>
              </div>
              <div className="quick-group-grid">
                <label>
                  Cidade
                  <input
                    onChange={(event) =>
                      setGroupForm((currentForm) => ({ ...currentForm, city: event.target.value }))
                    }
                    placeholder="Cidade"
                    value={groupForm.city}
                  />
                </label>
                <label>
                  Estado (UF)
                  <input
                    maxLength={2}
                    onChange={(event) =>
                      setGroupForm((currentForm) => ({ ...currentForm, state: event.target.value.toUpperCase() }))
                    }
                    placeholder="PA"
                    value={groupForm.state}
                  />
                </label>
              </div>
              <label>
                Vagas
                <input
                  min="1"
                  onChange={(event) =>
                    setGroupForm((currentForm) => ({
                      ...currentForm,
                      capacity: event.target.value
                    }))
                  }
                  type="number"
                  value={groupForm.capacity}
                />
              </label>
              <button 
                className="primary-button full" 
                onClick={() => void handleCreateGroup()} 
                type="button"
                disabled={groupFormSaving}
                style={groupFormSaving ? { opacity: 0.7 } : {}}
              >
                <UserPlus size={15} />
                {groupFormSaving ? "Salvando..." : "Criar célula"}
              </button>
            </div>
            {groups.length ? (
              groups.map((group) => {
                const members = groupMembers.filter((member) => member.groupId === group.id);
                const occupancy = getOccupancyPercent(group, members.length);

                return (
                  <button
                    className={selectedGroupId === group.id ? "group-card is-selected" : "group-card"}
                    key={group.id}
                    onClick={() => setSelectedGroupId(group.id)}
                    type="button"
                  >
                    <span>{getGroupTypeLabel(group.type)}</span>
                    <strong>{group.name}</strong>
                    <p>
                      {getMeetingLabel(group)} - {group.city ?? "cidade nao informada"}
                    </p>
                    <div className="occupancy-bar">
                      <i style={{ width: `${occupancy}%` }} />
                    </div>
                    <small>
                      {members.length}/{group.capacity ?? "sem limite"} participantes
                    </small>
                  </button>
                );
              })
            ) : (
              <div className="empty-state">
                <strong>Nenhuma celula cadastrada</strong>
                <p>Quando os grupos forem criados, eles aparecem aqui.</p>
              </div>
            )}
          </div>
        </aside>

        <article className="group-detail-panel">
          {selectedGroup ? (
            <>
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Celula selecionada</p>
                  <h2>{selectedGroup.name}</h2>
                </div>
                <div className="section-actions">
                  {groupHealth ? (
                    <span className={`group-health-pill is-${groupHealth.level}`}>
                      {groupHealth.label}
                    </span>
                  ) : null}
                  <button className="primary-button compact-button" onClick={() => void handleCreateMeeting()} type="button">
                    <CalendarDays size={15} />
                    Abrir encontro
                  </button>
                  {selectedActiveMeeting ? (
                    <button className="ghost-button" onClick={() => void handleCloseMeeting()} type="button">
                      Encerrar
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="meeting-live-card">
                <div>
                  <p className="eyebrow">Encontro ativo</p>
                  <h3>
                    {selectedActiveMeeting
                      ? formatDate(selectedActiveMeeting.scheduledStartAt)
                      : "Nenhum encontro aberto"}
                  </h3>
                  <p>
                    {selectedActiveMeeting
                      ? "Use os botoes nos participantes para registrar presenca."
                      : "Abra um encontro para liberar a chamada da celula."}
                  </p>
                </div>
                <span>
                  {selectedActiveMeeting
                    ? selectedAttendance.filter(
                        (item) => item.groupMeetingId === selectedActiveMeeting.id
                      ).length
                    : 0}
                  /{selectedMembers.length}
                </span>
              </div>

              {selectedMeetingSummary ? (
                <div className="meeting-summary-card">
                  <div className="meeting-summary-heading">
                    <div>
                      <p className="eyebrow">Resumo do encontro</p>
                      <h3>{selectedMeetingSummary.groupName}</h3>
                      <p>{formatDate(selectedMeetingSummary.scheduledStartAt)} - {selectedMeetingSummary.status}</p>
                    </div>
                    <button className="ghost-button" onClick={() => void handleCopyMeetingSummary()} type="button">
                      {copiedMeetingSummaryId === selectedMeetingSummary.meetingId ? "Copiado" : "Copiar resumo"}
                    </button>
                  </div>
                  <div className="meeting-summary-grid">
                    <div>
                      <span>Presentes</span>
                      <strong>{selectedMeetingSummary.present}</strong>
                    </div>
                    <div>
                      <span>Visitantes</span>
                      <strong>{selectedMeetingSummary.guests}</strong>
                    </div>
                    <div>
                      <span>Justificados</span>
                      <strong>{selectedMeetingSummary.justified}</strong>
                    </div>
                    <div>
                      <span>Ausentes</span>
                      <strong>{selectedMeetingSummary.absent}</strong>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="group-detail-grid">
                <div>
                  <span>Horario</span>
                  <strong>{getMeetingLabel(selectedGroup)}</strong>
                </div>
                <div>
                  <span>Local</span>
                  <strong>{selectedGroup.city ?? "Nao informado"}</strong>
                </div>
                <div>
                  <span>Participantes</span>
                  <strong>{selectedMembers.length}</strong>
                </div>
                <div>
                  <span>Encontros</span>
                  <strong>{selectedMeetings.length}</strong>
                </div>
              </div>

              <div className="group-columns">
                <div className="group-subpanel">
                  <p className="eyebrow">Participantes</p>
                  <div className="group-member-list">
                    {selectedMembers.length ? (
                      selectedMembers.map((member) => {
                        const person = people.find((item) => item.id === member.personId);

                        return (
                          <div key={member.id}>
                            <strong>{person ? getFullName(person) : member.personId}</strong>
                            <p>{getRoleLabel(member.roleInGroup)} - desde {formatDate(member.joinedAt)}</p>
                            <div className="attendance-actions">
                              <button
                                className="ghost-button"
                                onClick={() => void handleAttendance(member, "present")}
                                type="button"
                              >
                                Presente
                              </button>
                              <button
                                className="ghost-button"
                                onClick={() => void handleAttendance(member, "first_time_guest")}
                                type="button"
                              >
                                Visitante
                              </button>
                              <button
                                className="ghost-button"
                                onClick={() => void handleAttendance(member, "justified")}
                                type="button"
                              >
                                Justificou
                              </button>
                              <button
                                className="ghost-button"
                                onClick={() => void handleAttendance(member, "absent")}
                                type="button"
                              >
                                Ausente
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="empty-state">
                        <strong>Sem participantes</strong>
                        <p>Use a fila ao lado para conectar pessoas.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="group-subpanel">
                  <p className="eyebrow">Ultimos encontros</p>
                  <div className="group-member-list">
                    {selectedMeetings.length ? (
                      selectedMeetings.map((meeting) => {
                        const meetingAttendance = selectedAttendance.filter(
                          (item) => item.groupMeetingId === meeting.id
                        );

                        return (
                          <div key={meeting.id}>
                            <strong>{formatDate(meeting.scheduledStartAt)}</strong>
                            <p>
                              {meeting.meetingStatus} - {meetingAttendance.length} presenca(s)
                            </p>
                          </div>
                        );
                      })
                    ) : (
                      <div className="empty-state">
                        <strong>Sem encontros</strong>
                        <p>Registros de reuniao e presenca aparecerao aqui.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="group-followup-panel">
                <div className="section-heading compact">
                  <div>
                    <p className="eyebrow">Acompanhamento pos-celula</p>
                    <h3>{selectedFollowUpQueue.length} cuidado(s) sugeridos</h3>
                  </div>
                  <span className="soft-pill">Lideranca</span>
                </div>
                <div className="group-followup-list">
                  {selectedFollowUpQueue.length ? (
                    selectedFollowUpQueue.map((item) => (
                      <div className={`group-followup-item is-${item.level}`} key={item.personId}>
                        <span>{item.level === "risk" ? "Prioritario" : "Acompanhar"}</span>
                        <strong>{item.personName}</strong>
                        <p>{item.reason}</p>
                        <small>{item.message}</small>
                        <div className="followup-actions">
                          <button
                            className="ghost-button"
                            onClick={() => void handleCopyFollowUp(item)}
                            type="button"
                          >
                            {copiedFollowUpPersonId === item.personId ? "Copiado" : "Copiar"}
                          </button>
                          {item.whatsappHref ? (
                            <a className="primary-button compact-button" href={item.whatsappHref} rel="noreferrer" target="_blank">
                              WhatsApp
                            </a>
                          ) : null}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="empty-state">
                      <strong>Sem alerta pastoral</strong>
                      <p>Quando houver falta, ausência de chamada ou visitante novo, aparecerá aqui.</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <AlertTriangle size={20} />
              <strong>Selecione uma celula</strong>
              <p>Escolha um grupo para ver participantes, encontros e integracao.</p>
            </div>
          )}
        </article>

        <aside className="groups-list-panel">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">Fila de integracao</p>
              <h2>{peopleWithoutGroup.length} sem celula</h2>
            </div>
          </div>
          <div className="group-member-list">
            {peopleWithoutGroup.length ? (
              peopleWithoutGroup.slice(0, 10).map((person) => (
                <button
                  className="person-link-card"
                  key={person.id}
                  onClick={() => void handleAssignPerson(person)}
                  type="button"
                >
                  <strong>{getFullName(person)}</strong>
                  <p>{getMemberStatusLabel(person.memberStatus)}</p>
                  <small>Vincular a {selectedGroup?.name ?? "celula selecionada"}</small>
                </button>
              ))
            ) : (
              <div className="empty-state">
                <strong>Todo mundo conectado</strong>
                <p>Nenhuma pessoa da base esta fora de celula agora.</p>
              </div>
            )}
          </div>
        </aside>
      </section>
    </main>
  );
}

function MetricCard({
  detail,
  icon: Icon,
  label,
  value
}: {
  detail: string;
  icon: typeof Waypoints;
  label: string;
  value: number | string;
}) {
  return (
    <article className="groups-metric-card">
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

function slugifyLocal(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getGroupTypeLabel(type: Group["type"]) {
  switch (type) {
    case "cell":
      return "Celula";
    case "small_group":
      return "Pequeno grupo";
    case "class":
      return "Classe";
    case "youth_group":
      return "Jovens";
    case "ministry_team":
      return "Ministerio";
  }
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

function getRoleLabel(role: GroupMember["roleInGroup"]) {
  switch (role) {
    case "member":
      return "Membro";
    case "visitor":
      return "Visitante";
    case "leader":
      return "Lider";
    case "co_leader":
      return "Co-lider";
    case "host":
      return "Anfitriao";
    case "supervisor":
      return "Supervisor";
  }
}

function getAttendanceLabel(status: GroupAttendance["attendanceStatus"]) {
  switch (status) {
    case "present":
      return "Presente";
    case "absent":
      return "Ausente";
    case "justified":
      return "Justificado";
    case "first_time_guest":
      return "Visitante pela primeira vez";
  }
}

function getMeetingLabel(group: Group) {
  const day = typeof group.meetingDayOfWeek === "number"
    ? getWeekdayLabel(group.meetingDayOfWeek)
    : "dia a definir";

  return `${day} - ${group.meetingTime ?? "horario a definir"}`;
}

function getWeekdayLabel(day: number) {
  const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

  return weekdays[day] ?? "dia a definir";
}

function getOccupancyPercent(group: Group, memberCount: number) {
  if (!group.capacity) {
    return memberCount ? 72 : 0;
  }

  return Math.min(Math.round((memberCount / group.capacity) * 100), 100);
}

function getGroupHealth(
  group: Group,
  members: readonly GroupMember[],
  attendance: readonly GroupAttendance[]
) {
  const occupancy = getOccupancyPercent(group, members.length);
  const present = attendance.filter((item) =>
    ["present", "first_time_guest"].includes(item.attendanceStatus)
  ).length;
  const attendanceRate = attendance.length ? Math.round((present / attendance.length) * 100) : 0;

  if (occupancy >= 95) {
    return {
      label: "Quase cheia",
      level: "attention" as const
    };
  }

  if (attendance.length && attendanceRate < 55) {
    return {
      label: "Cuidar presenca",
      level: "risk" as const
    };
  }

  return {
    label: "Saudavel",
    level: "stable" as const
  };
}

function getMeetingSummary({
  attendance,
  group,
  meeting,
  members
}: {
  attendance: readonly GroupAttendance[];
  group: Group;
  meeting: GroupMeeting;
  members: readonly GroupMember[];
}) {
  const meetingAttendance = attendance.filter(
    (item) => item.groupMeetingId === meeting.id
  );
  const present = meetingAttendance.filter((item) => item.attendanceStatus === "present").length;
  const guests = meetingAttendance.filter((item) => item.attendanceStatus === "first_time_guest").length;
  const justified = meetingAttendance.filter((item) => item.attendanceStatus === "justified").length;
  const absent = meetingAttendance.filter((item) => item.attendanceStatus === "absent").length;
  const pending = Math.max(members.length - meetingAttendance.length, 0);
  const status = meeting.meetingStatus === "completed" ? "encerrado" : "em andamento";
  const text = [
    `Resumo da celula ${group.name}`,
    `Data: ${formatDate(meeting.scheduledStartAt)}`,
    `Status: ${status}`,
    `Presentes: ${present}`,
    `Visitantes: ${guests}`,
    `Justificados: ${justified}`,
    `Ausentes: ${absent}`,
    `Sem registro: ${pending}`
  ].join("\n");

  return {
    absent,
    groupName: group.name,
    guests,
    justified,
    meetingId: meeting.id,
    pending,
    present,
    scheduledStartAt: meeting.scheduledStartAt,
    status,
    text
  };
}

function getGroupFollowUpQueue({
  attendance,
  meeting,
  members,
  people
}: {
  attendance: readonly GroupAttendance[];
  meeting: GroupMeeting;
  members: readonly GroupMember[];
  people: readonly Person[];
}) {
  return members
    .map((member) => {
      const person = people.find((item) => item.id === member.personId);
      const attendanceRecord = attendance.find(
        (item) => item.groupMeetingId === meeting.id && item.personId === member.personId
      );
      const joinedRecently = isWithinDays(member.joinedAt, 21);
      const personName = person ? getFullName(person) : member.personId;

      if (attendanceRecord?.attendanceStatus === "absent") {
        const message = `Ola, ${getFirstName(personName)}! Sentimos sua falta na celula. Esta tudo bem por ai? Se precisar de algo, queremos caminhar perto de voce.`;

        return {
          level: "risk" as const,
          message,
          personId: member.personId,
          personName,
          reason: "Ausente no encontro ativo",
          whatsappHref: person ? getWhatsappHref(person, message) : null
        };
      }

      if (!attendanceRecord) {
        const message = `Ola, ${getFirstName(personName)}! Estamos fechando a chamada da celula e queria confirmar se voce conseguiu participar do encontro.`;

        return {
          level: "attention" as const,
          message,
          personId: member.personId,
          personName,
          reason: "Presenca nao registrada",
          whatsappHref: person ? getWhatsappHref(person, message) : null
        };
      }

      if (
        attendanceRecord.attendanceStatus === "first_time_guest" ||
        joinedRecently ||
        person?.memberStatus === "visitor" ||
        person?.memberStatus === "new_believer"
      ) {
        const message = `Ola, ${getFirstName(personName)}! Que alegria ter voce caminhando with a celula. Como foi o encontro para voce? Queremos te ajudar nos proximos passos.`;

        return {
          level: "attention" as const,
          message,
          personId: member.personId,
          personName,
          reason: "Pessoa em fase de integracao",
          whatsappHref: person ? getWhatsappHref(person, message) : null
        };
      }

      return null;
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
}

function getFirstName(name: string) {
  return name.split(" ").filter(Boolean)[0] ?? "tudo bem";
}

function getWhatsappHref(person: Person, message: string) {
  const rawPhone = person.whatsappPhone || person.mobilePhone;

  if (!rawPhone) {
    return null;
  }

  const digits = rawPhone.replace(/\D/g, "");
  const phone = digits.startsWith("55") ? digits : `55${digits}`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function isWithinDays(value: string, days: number) {
  if (!value) {
    return false;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return Date.now() - date.getTime() <= days * 24 * 60 * 60 * 1000;
}

function formatDate(value: string) {
  if (!value) {
    return "data nao informada";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit"
  }).format(date);
}
