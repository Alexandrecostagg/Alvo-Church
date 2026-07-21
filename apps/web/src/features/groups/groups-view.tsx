"use client";

import Link from "next/link";
import { friendlyError } from "../../lib/friendly-error";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Crown,
  Pencil,
  Sparkles,
  Trash2,
  UserPlus,
  UsersRound,
  Waypoints,
  X
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  assignPersonToGroup,
  createGroup,
  createGroupMeeting,
  deleteGroup,
  fetchGroupAttendance,
  fetchGroupMeetings,
  fetchGroupMembers,
  fetchGroups,
  fetchPeople,
  isFirebaseWebRuntimeConfigured,
  recordGroupAttendance,
  removeGroupMember,
  updateGroup,
  updateGroupMeetingStatus
} from "@alvo/firebase";
import type { Group, GroupAttendance, GroupMeeting, GroupMember, Person } from "@alvo/types";
import { useAppAuth } from "../../../app/providers";
import { useGroupsLabel } from "../../../contexts/OrgFeaturesContext";

const weekdayOptions = [
  { label: "Domingo", value: 0 },
  { label: "Segunda", value: 1 },
  { label: "Terça", value: 2 },
  { label: "Quarta", value: 3 },
  { label: "Quinta", value: 4 },
  { label: "Sexta", value: 5 },
  { label: "Sábado", value: 6 }
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
  const groupsLabel = useGroupsLabel();
  const { configured, firebaseReady, user, organizationId, firebaseConfig } = useAppAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [meetings, setMeetings] = useState<GroupMeeting[]>([]);
  const [attendance, setAttendance] = useState<GroupAttendance[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [status, setStatus] = useState("Carregando células...");
  const [copiedFollowUpPersonId, setCopiedFollowUpPersonId] = useState<string | null>(null);
  const [copiedMeetingSummaryId, setCopiedMeetingSummaryId] = useState<string | null>(null);
  const [groupForm, setGroupForm] = useState({
    capacity: "12",
    city: "",
    meetingDayOfWeek: "3",
    meetingTime: "19:30",
    name: "",
    state: "",
    type: "cell",
    leaderPersonId: ""
  });
  const [groupFormError, setGroupFormError] = useState("");
  const [groupFormSuccess, setGroupFormSuccess] = useState("");
  const [groupFormSaving, setGroupFormSaving] = useState(false);
  const [groupFormOpen, setGroupFormOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [meetingDate, setMeetingDate] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Group | null>(null);

  useEffect(() => {
    if (!configured || !firebaseReady || !user || !isFirebaseWebRuntimeConfigured(firebaseConfig)) {
      setStatus("Entre no Firebase para carregar células reais.");
      return;
    }

    let cancelled = false;

    async function loadGroupsCenter() {
      setStatus("Sincronizando células, membros e presenças...");

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

        // Só dados reais — nada de mock que engana.
        setGroups(nextGroups);
        setPeople(nextPeople);
        setGroupMembers(nextMembers);
        setMeetings(nextMeetings);
        setAttendance(nextAttendance);
        setSelectedGroupId((currentId) => currentId ?? nextGroups[0]?.id ?? null);
        setStatus(
          `${nextGroups.length} célula(s), ${nextMembers.length} vínculo(s), ${nextMeetings.length} encontro(s).`
        );
      } catch (error) {
        if (!cancelled) {
          setStatus(friendlyError(error, "Não foi possível carregar células."));
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
  // Vagas disponíveis = capacidade total − pessoas já vinculadas (não a capacidade toda).
  const availableSlots = Math.max(totalCapacity - groupMembers.length, 0);
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
      setStatus("Selecione uma célula antes de vincular uma pessoa.");
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
      setStatus("Vínculo criado localmente. Conecte o Firebase para persistir.");
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
      setStatus("Vínculo com célula salvo no Firestore.");
    } catch (error) {
      setStatus(friendlyError(error, "Não foi possível vincular a célula."));
    }
  }

  function resetGroupForm() {
    setGroupForm({
      capacity: "12", city: "", meetingDayOfWeek: "3", meetingTime: "19:30",
      name: "", state: "", type: "cell", leaderPersonId: ""
    });
  }

  function openNewGroupForm() {
    setEditingGroupId(null);
    resetGroupForm();
    setGroupFormError("");
    setGroupFormSuccess("");
    setGroupFormOpen(true);
  }

  function openEditGroup(group: Group) {
    setEditingGroupId(group.id);
    const leader = groupMembers.find((m) => m.groupId === group.id && m.roleInGroup === "leader");
    setGroupForm({
      capacity: String(group.capacity ?? "12"),
      city: group.city ?? "",
      meetingDayOfWeek: String(group.meetingDayOfWeek ?? "3"),
      meetingTime: group.meetingTime ?? "19:30",
      name: group.name,
      state: group.state ?? "",
      type: group.type,
      leaderPersonId: leader?.personId ?? ""
    });
    setGroupFormError("");
    setGroupFormSuccess("");
    setGroupFormOpen(true);
  }

  async function handleCreateGroup() {
    const name = groupForm.name.trim();
    setGroupFormError("");
    setGroupFormSuccess("");

    if (!name) {
      setGroupFormError("Digite o nome da célula para continuar.");
      return;
    }
    if (!configured || !user || !isFirebaseWebRuntimeConfigured(firebaseConfig)) {
      setGroupFormError("Entre na sua conta para salvar a célula.");
      return;
    }

    setGroupFormSaving(true);
    const capacityParsed = Number.parseInt(groupForm.capacity, 10);
    const capacity = Number.isNaN(capacityParsed) ? undefined : capacityParsed;
    const dayOfWeek = Number.parseInt(groupForm.meetingDayOfWeek, 10);

    // Vincula o líder escolhido como membro com papel "leader" (modelo aprovado).
    async function assignLeader(groupId: string) {
      if (!groupForm.leaderPersonId || !user) return;
      try {
        const savedLeader = await assignPersonToGroup(firebaseConfig, { organizationId }, {
          assignedByUserId: user.uid,
          groupId,
          personId: groupForm.leaderPersonId,
          roleInGroup: "leader"
        });
        setGroupMembers((current) => [savedLeader, ...current.filter((m) => m.id !== savedLeader.id)]);
      } catch (error) {
        console.error("Falha ao vincular líder:", error);
      }
    }

    try {
      if (editingGroupId) {
        // Edição de célula existente.
        await updateGroup(firebaseConfig, { organizationId }, editingGroupId, {
          name, type: groupForm.type as Group["type"], meetingDayOfWeek: dayOfWeek,
          meetingTime: groupForm.meetingTime || undefined,
          city: groupForm.city.trim() || undefined,
          state: groupForm.state.trim() || undefined, capacity
        });
        setGroups((current) => current.map((g) => (g.id === editingGroupId ? {
          ...g, name, type: groupForm.type as Group["type"], meetingDayOfWeek: dayOfWeek,
          meetingTime: groupForm.meetingTime || undefined, city: groupForm.city.trim() || undefined,
          state: groupForm.state.trim() || undefined, capacity
        } : g)));
        // Se trocou/definiu o líder e ele ainda não é membro-líder, vincula.
        const currentLeader = groupMembers.find((m) => m.groupId === editingGroupId && m.roleInGroup === "leader");
        if (groupForm.leaderPersonId && currentLeader?.personId !== groupForm.leaderPersonId) {
          await assignLeader(editingGroupId);
        }
        setStatus(`Célula "${name}" atualizada.`);
      } else {
        const savedGroup = await createGroup(firebaseConfig, { organizationId }, {
          capacity, city: groupForm.city.trim() || undefined, createdByUserId: user.uid,
          meetingDayOfWeek: dayOfWeek, meetingTime: groupForm.meetingTime || undefined,
          name, state: groupForm.state.trim() || undefined, type: groupForm.type as Group["type"]
        });
        setGroups((current) => [savedGroup, ...current]);
        setSelectedGroupId(savedGroup.id);
        await assignLeader(savedGroup.id);
        setStatus(`Célula "${savedGroup.name}" criada!`);
      }
      setGroupFormOpen(false);
      setEditingGroupId(null);
      resetGroupForm();
    } catch (error) {
      setGroupFormError(friendlyError(error, "Não foi possível salvar a célula."));
    } finally {
      setGroupFormSaving(false);
    }
  }

  async function confirmDeleteGroup() {
    const group = deleteTarget;
    if (!group) return;
    setDeleteTarget(null);
    setGroups((current) => current.filter((g) => g.id !== group.id));
    setGroupMembers((current) => current.filter((m) => m.groupId !== group.id));
    setSelectedGroupId((id) => (id === group.id ? null : id));
    if (!configured || !user || !isFirebaseWebRuntimeConfigured(firebaseConfig)) return;
    try {
      await deleteGroup(firebaseConfig, { organizationId }, group.id);
      setStatus(`Célula "${group.name}" excluída.`);
    } catch (error) {
      setStatus(friendlyError(error, "Não foi possível excluir a célula."));
    }
  }

  async function handleRemoveMember(member: GroupMember) {
    const person = people.find((p) => p.id === member.personId);
    const label = person ? getFullName(person) : member.personId;
    if (!window.confirm(`Remover ${label} desta célula?`)) return;
    setGroupMembers((current) => current.filter((m) => m.id !== member.id));
    if (!configured || !user || !isFirebaseWebRuntimeConfigured(firebaseConfig)) return;
    try {
      await removeGroupMember(firebaseConfig, { organizationId }, member.groupId, member.personId);
      setStatus(`${label} removido da célula.`);
    } catch (error) {
      setStatus(friendlyError(error, "Não foi possível remover o participante."));
    }
  }

  async function handleCreateMeeting() {
    if (!selectedGroup) {
      setStatus("Selecione uma célula antes de abrir um encontro.");
      return;
    }

    // Usa a data escolhida (datetime-local) ou "agora" se em branco.
    const scheduledStartAt = meetingDate ? new Date(meetingDate).toISOString() : new Date().toISOString();
    const localMeeting: GroupMeeting = {
      id: `meeting_local_${Date.now()}`,
      organizationId,
      groupId: selectedGroup.id,
      scheduledStartAt,
      meetingStatus: "scheduled"
    };
    setMeetings((currentMeetings) => [localMeeting, ...currentMeetings]);
    setMeetingDate("");
    setStatus(`Encontro aberto para ${selectedGroup.name}.`);

    if (!configured || !user || !isFirebaseWebRuntimeConfigured(firebaseConfig)) {
      setStatus("Encontro criado localmente. Conecte o Firebase para persistir.");
      return;
    }

    try {
      const savedMeeting = await createGroupMeeting(firebaseConfig, { organizationId }, {
        createdByUserId: user.uid,
        groupId: selectedGroup.id,
        scheduledStartAt
      });
      setMeetings((currentMeetings) =>
        currentMeetings.map((meeting) =>
          meeting.id === localMeeting.id ? savedMeeting : meeting
        )
      );
      setStatus("Encontro salvo no Firestore.");
    } catch (error) {
      setStatus(friendlyError(error, "Não foi possível abrir o encontro."));
    }
  }

  async function handleAttendance(
    member: GroupMember,
    attendanceStatus: GroupAttendance["attendanceStatus"]
  ) {
    if (!selectedGroup || !selectedActiveMeeting) {
      setStatus("Abra um encontro antes de registrar presença.");
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
    setStatus(`Presença marcada como ${getAttendanceLabel(attendanceStatus)}.`);

    if (!configured || !user || !isFirebaseWebRuntimeConfigured(firebaseConfig)) {
      setStatus("Presença registrada localmente. Conecte o Firebase para persistir.");
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
      setStatus("Presença salva no Firestore.");
    } catch (error) {
      setStatus(friendlyError(error, "Não foi possível registrar presença."));
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
      setStatus(friendlyError(error, "Não foi possível encerrar o encontro."));
    }
  }

  async function handleCopyFollowUp(item: GroupFollowUpItem) {
    try {
      await navigator.clipboard.writeText(item.message);
      setCopiedFollowUpPersonId(item.personId);
      setStatus(`Mensagem de cuidado copiada para ${item.personName}.`);
    } catch {
      setStatus("Não foi possível copiar automaticamente. Selecione a mensagem e copie manualmente.");
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
      setStatus("Não foi possível copiar o resumo automaticamente.");
    }
  }

  return (
    <div className="page-root groups-page">
      <header className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">{groupsLabel}</h1>
          <p className="page-subtitle">Acompanhe capacidade, participantes, encontros e conexões</p>
        </div>
        <div className="page-header-actions">
          <span style={{ fontSize: 12, color: "var(--alvo-ink-soft)", background: "var(--alvo-surface-muted)", padding: "4px 10px", borderRadius: 8 }}>
            {status}
          </span>
        </div>
      </header>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon"><Waypoints size={20} /></div>
          <div className="stat-body"><span className="stat-label">Células ativas</span><span className="stat-value">{activeGroups.length}</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><UsersRound size={20} /></div>
          <div className="stat-body"><span className="stat-label">Participantes</span><span className="stat-value">{groupMembers.length}</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><UserPlus size={20} /></div>
          <div className="stat-body"><span className="stat-label">Vagas disponíveis</span><span className="stat-value">{totalCapacity ? availableSlots : "—"}</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><CheckCircle2 size={20} /></div>
          <div className="stat-body"><span className="stat-label">Taxa de presença</span><span className="stat-value">{attendanceRate}%</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "rgba(220,38,38,0.1)", color: "#dc2626" }}><AlertTriangle size={20} /></div>
          <div className="stat-body"><span className="stat-label">Sem célula</span><span className="stat-value">{peopleWithoutGroup.length}</span></div>
        </div>
      </div>

      <section className="groups-workbench">
        <aside className="groups-list-panel">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">Mapa de células</p>
              <h2>{groups.length} grupo(s)</h2>
            </div>
          </div>
          <div className="group-card-list">
            {!groupFormOpen && (
              <button
                className="primary-button full"
                onClick={openNewGroupForm}
                type="button"
                style={{ marginBottom: 8 }}
              >
                <UserPlus size={15} />
                + Nova célula
              </button>
            )}
            {groupFormOpen && (
            <div className="quick-group-form antigravity-float-delayed">
              <p className="eyebrow">{editingGroupId ? "Editar célula" : "Nova célula"}</p>
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
                Líder da célula
                <select
                  onChange={(event) =>
                    setGroupForm((currentForm) => ({ ...currentForm, leaderPersonId: event.target.value }))
                  }
                  value={groupForm.leaderPersonId}
                >
                  <option value="">Selecionar líder...</option>
                  {people.filter(p => ["member", "leader", "volunteer"].includes(p.memberStatus)).map(p => (
                    <option key={p.id} value={p.id}>
                      {p.firstName} {p.lastName}
                    </option>
                  ))}
                </select>
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
                {groupFormSaving ? "Salvando..." : editingGroupId ? "Salvar alterações" : "Criar célula"}
              </button>
              <button
                className="ghost-button full"
                onClick={() => { setGroupFormOpen(false); setEditingGroupId(null); setGroupFormError(""); resetGroupForm(); }}
                type="button"
              >
                Cancelar
              </button>
            </div>
            )}
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
                      {getMeetingLabel(group)} - {group.city ?? "cidade não informada"}
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
                <strong>Nenhuma célula cadastrada</strong>
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
                  <p className="eyebrow">Célula selecionada</p>
                  <h2>{selectedGroup.name}</h2>
                </div>
                <div className="section-actions">
                  {groupHealth ? (
                    <span className={`group-health-pill is-${groupHealth.level}`}>
                      {groupHealth.label}
                    </span>
                  ) : null}
                  <Link href={`/groups/${selectedGroup.id}/banner`} className="primary-button compact-button" style={{ backgroundColor: "#10b981", color: "white" }}>
                    <Sparkles size={15} />
                    Gerar Banner da Célula
                  </Link>
                  <input
                    type="datetime-local"
                    value={meetingDate}
                    onChange={(event) => setMeetingDate(event.target.value)}
                    title="Data do encontro (deixe em branco para agora)"
                    style={{ padding: "6px 8px", borderRadius: 8, border: "1px solid var(--alvo-line)", fontSize: 12 }}
                  />
                  <button className="primary-button compact-button" onClick={() => void handleCreateMeeting()} type="button">
                    <CalendarDays size={15} />
                    Abrir encontro
                  </button>
                  {selectedActiveMeeting ? (
                    <button className="ghost-button" onClick={() => void handleCloseMeeting()} type="button">
                      Encerrar
                    </button>
                  ) : null}
                  <button className="ghost-button" onClick={() => openEditGroup(selectedGroup)} type="button" title="Editar célula" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Pencil size={14} /> Editar
                  </button>
                  <button className="ghost-button" onClick={() => setDeleteTarget(selectedGroup)} type="button" title="Excluir célula" style={{ display: "flex", alignItems: "center", gap: 4, color: "#dc2626" }}>
                    <Trash2 size={14} />
                  </button>
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
                      ? "Use os botões nos participantes para registrar presença."
                      : "Abra um encontro para liberar a chamada da célula."}
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
                  <span>Horário</span>
                  <strong>{getMeetingLabel(selectedGroup)}</strong>
                </div>
                <div>
                  <span>Local</span>
                  <strong>{selectedGroup.city ?? "Não informado"}</strong>
                </div>
                <div>
                  <span>Membros</span>
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
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                              <strong style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                {member.roleInGroup === "leader" && <Crown size={13} style={{ color: "#d97706" }} />}
                                {person ? getFullName(person) : member.personId}
                              </strong>
                              <button
                                className="ghost-button"
                                onClick={() => void handleRemoveMember(member)}
                                type="button"
                                title="Remover da célula"
                                style={{ padding: "2px 6px", color: "#dc2626", lineHeight: 1 }}
                              >
                                <X size={13} />
                              </button>
                            </div>
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
                  <p className="eyebrow">Últimos encontros</p>
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
                              {meeting.meetingStatus} - {meetingAttendance.length} presença(s)
                            </p>
                          </div>
                        );
                      })
                    ) : (
                      <div className="empty-state">
                        <strong>Sem encontros</strong>
                        <p>Registros de reunião e presença aparecerao aqui.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="group-followup-panel">
                <div className="section-heading compact">
                  <div>
                    <p className="eyebrow">Acompanhamento pós-célula</p>
                    <h3>{selectedFollowUpQueue.length} cuidado(s) sugeridos</h3>
                  </div>
                  <span className="soft-pill">Liderança</span>
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
              <strong>Selecione uma célula</strong>
              <p>Escolha um grupo para ver participantes, encontros e integração.</p>
            </div>
          )}
        </article>

        <aside className="groups-list-panel">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">Fila de integração</p>
              <h2>{peopleWithoutGroup.length} sem célula</h2>
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
                  <small>Vincular a {selectedGroup?.name ?? "célula selecionada"}</small>
                </button>
              ))
            ) : (
              <div className="empty-state">
                <strong>Todo mundo conectado</strong>
                <p>Nenhuma pessoa da base esta fora de célula agora.</p>
              </div>
            )}
          </div>
        </aside>
      </section>

      {deleteTarget && (
        <div
          onClick={() => setDeleteTarget(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 1000 }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{ maxWidth: 420, width: "100%", background: "var(--alvo-surface, #fff)", borderRadius: 16, padding: 22, boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(220,38,38,0.12)", color: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <AlertTriangle size={20} />
              </div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "var(--alvo-ink, #0f172a)" }}>Excluir esta célula?</h3>
            </div>
            <p style={{ margin: "0 0 6px", fontSize: 14, color: "var(--alvo-ink, #0f172a)" }}>
              Você está prestes a excluir <strong>“{deleteTarget.name}”</strong>.
            </p>
            <p style={{ margin: "0 0 18px", fontSize: 13, color: "#dc2626", fontWeight: 600 }}>
              Esta ação é irreversível. Os vínculos, encontros e presenças da célula deixarão de aparecer e não poderão ser recuperados.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button className="ghost-button" onClick={() => setDeleteTarget(null)} type="button">Cancelar</button>
              <button
                onClick={() => void confirmDeleteGroup()}
                type="button"
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 10, background: "#dc2626", color: "#fff", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
              >
                <Trash2 size={15} /> Sim, excluir definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
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
      return "Célula";
    case "small_group":
      return "Pequeno grupo";
    case "class":
      return "Classe";
    case "youth_group":
      return "Jovens";
    case "ministry_team":
      return "Ministério";
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
      return "Líder";
    case "volunteer":
      return "Voluntário";
  }
}

function getRoleLabel(role: GroupMember["roleInGroup"]) {
  switch (role) {
    case "member":
      return "Membro";
    case "visitor":
      return "Visitante";
    case "leader":
      return "Líder";
    case "co_leader":
      return "Co-líder";
    case "host":
      return "Anfitrião";
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

  return `${day} - ${group.meetingTime ?? "horário a definir"}`;
}

function getWeekdayLabel(day: number) {
  const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

  return weekdays[day] ?? "dia a definir";
}

function getOccupancyPercent(group: Group, memberCount: number) {
  // Sem capacidade definida não há como calcular ocupação — evita número fake.
  if (!group.capacity) {
    return 0;
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
      label: "Cuidar presença",
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
    `Resumo da célula ${group.name}`,
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
        const message = `Olá, ${getFirstName(personName)}! Sentimos sua falta na célula. Está tudo bem por aí? Se precisar de algo, queremos caminhar perto de você.`;

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
        const message = `Olá, ${getFirstName(personName)}! Estamos fechando a chamada da célula e queria confirmar se você conseguiu participar do encontro.`;

        return {
          level: "attention" as const,
          message,
          personId: member.personId,
          personName,
          reason: "Presença não registrada",
          whatsappHref: person ? getWhatsappHref(person, message) : null
        };
      }

      if (
        attendanceRecord.attendanceStatus === "first_time_guest" ||
        joinedRecently ||
        person?.memberStatus === "visitor" ||
        person?.memberStatus === "new_believer"
      ) {
        const message = `Olá, ${getFirstName(personName)}! Que alegria ter você caminhando com a célula. Como foi o encontro para você? Queremos te ajudar nos próximos passos.`;

        return {
          level: "attention" as const,
          message,
          personId: member.personId,
          personName,
          reason: "Pessoa em fase de integração",
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
    return "data não informada";
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
