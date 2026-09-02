"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { friendlyError } from "../../lib/friendly-error";
import {
  AlertCircle,
  Award,
  Calendar,
  ChevronDown,
  ChevronUp,
  Church,
  HandHeart,
  Loader2,
  MessageCircle,
  Plus,
  Sparkles,
  UserX,
  X,
} from "lucide-react";
import { useAppAuth } from "../../../app/providers";
import {
  fetchPeople,
  fetchGroups,
  fetchGroupMembers,
  fetchGroupMeetings,
  fetchGroupAttendance,
  fetchServiceAssignments,
  fetchMemberJourneyProfile,
  fetchChurchAttendance,
  recordChurchAttendance,
  fetchPrayerRequests,
  addPrayerRequest,
  updatePrayerRequestStatus,
  isFirebaseWebRuntimeConfigured,
} from "@alvo/firebase";
import { cachedFetchPeople, cachedFetchGroups } from "../../lib/org-data-cache";
import type {
  Person,
  Group,
  GroupMember,
  GroupMeeting,
  GroupAttendance,
  ServiceAssignment,
  ChurchAttendance,
  PrayerRequest,
} from "@alvo/types";

// ─── Helpers ────────────────────────────────────────────────────────────────

function getFullName(person: Person) {
  return `${person.preferredName || person.firstName} ${person.lastName}`.trim();
}

function getFirstName(name: string) {
  return name.split(" ").filter(Boolean)[0] ?? "";
}

function getWhatsappHref(person: Person | undefined, message: string) {
  const rawPhone = person?.whatsappPhone || person?.mobilePhone;
  if (!rawPhone) return null;
  const digits = rawPhone.replace(/\D/g, "");
  const phone = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function daysSince(iso: string): number | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000));
}

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

// ─── Component ──────────────────────────────────────────────────────────────

type InsightItem = {
  personId: string;
  personName: string;
  detail: string;
  whatsappHref: string | null;
};

export function CareRadarView() {
  const { user, organizationId, firebaseConfig } = useAppAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [people, setPeople] = useState<Person[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [groupMeetings, setGroupMeetings] = useState<GroupMeeting[]>([]);
  const [groupAttendance, setGroupAttendance] = useState<GroupAttendance[]>([]);
  const [serviceAssignments, setServiceAssignments] = useState<ServiceAssignment[]>([]);
  const [churchAttendance, setChurchAttendance] = useState<ChurchAttendance[]>([]);
  const [prayerRequests, setPrayerRequests] = useState<PrayerRequest[]>([]);
  const [newBelieverNoJourney, setNewBelieverNoJourney] = useState<Person[]>([]);

  const [expanded, setExpanded] = useState<string | null>(null);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showPrayerForm, setShowPrayerForm] = useState(false);

  const load = useCallback(async () => {
    if (!organizationId || !isFirebaseWebRuntimeConfigured(firebaseConfig)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    const ctx = { organizationId };

    try {
      const [peopleList, groupsList, assignments, attendance, prayers] = await Promise.all([
        cachedFetchPeople(firebaseConfig, ctx, 500),
        cachedFetchGroups(firebaseConfig, ctx, 100),
        fetchServiceAssignments(firebaseConfig, ctx, 400),
        fetchChurchAttendance(firebaseConfig, ctx, 2000),
        fetchPrayerRequests(firebaseConfig, ctx, 300),
      ]);

      const [members, meetings] = await Promise.all([
        fetchGroupMembers(firebaseConfig, ctx, groupsList, 80),
        fetchGroupMeetings(firebaseConfig, ctx, groupsList, 30),
      ]);

      const groupAttendanceList = meetings.length
        ? await fetchGroupAttendance(firebaseConfig, ctx, meetings, 80)
        : [];

      setPeople(peopleList);
      setGroups(groupsList);
      setGroupMembers(members);
      setGroupMeetings(meetings);
      setGroupAttendance(groupAttendanceList);
      setServiceAssignments(assignments);
      setChurchAttendance(attendance);
      setPrayerRequests(prayers);

      // New believers: fetch journey profile per person (small set, single-doc gets).
      const believers = peopleList.filter((p) => p.memberStatus === "new_believer");
      const profiles = await Promise.all(
        believers.map((p) => fetchMemberJourneyProfile(firebaseConfig, ctx, p.id))
      );
      setNewBelieverNoJourney(
        believers.filter((_, idx) => {
          const profile = profiles[idx];
          return !profile || (profile.progressPercent ?? 0) === 0;
        })
      );
    } catch (e) {
      setError(friendlyError(e, "Erro ao carregar dados pastorais"));
    } finally {
      setLoading(false);
    }
  }, [organizationId, firebaseConfig]);

  useEffect(() => {
    void load();
  }, [load]);

  const personById = useMemo(() => {
    const map = new Map<string, Person>();
    people.forEach((p) => map.set(p.id, p));
    return map;
  }, [people]);

  // ── Q1: sumiu da igreja (sem check-in de culto nos últimos 45 dias) ──────
  const missingFromChurch = useMemo<InsightItem[]>(() => {
    if (!churchAttendance.length) return [];
    const lastSeen = new Map<string, string>();
    churchAttendance.forEach((rec) => {
      const current = lastSeen.get(rec.personId);
      if (!current || rec.serviceDate > current) lastSeen.set(rec.personId, rec.serviceDate);
    });

    return people
      .filter((p) => p.status === "active" && ["member", "congregant", "leader", "volunteer"].includes(p.memberStatus))
      .map((p) => {
        const last = lastSeen.get(p.id);
        const days = last ? daysSince(last) : null;
        if (days !== null && days < 45) return null;
        const name = getFullName(p);
        const detail = last ? `Sem culto há ${days} dias (última vez em ${last})` : "Nunca registrado em um culto";
        const message = `Ola, ${getFirstName(name)}! Sentimos sua falta nos cultos. Esta tudo bem por ai? Queremos caminhar perto de voce.`;
        return { personId: p.id, personName: name, detail, whatsappHref: getWhatsappHref(p, message) };
      })
      .filter((x): x is InsightItem => x !== null);
  }, [people, churchAttendance]);

  // ── Q2: 30+ dias sem célula ────────────────────────────────────────────────
  const missingFromCell = useMemo<InsightItem[]>(() => {
    const meetingsByGroup = new Map<string, GroupMeeting[]>();
    groupMeetings.forEach((m) => {
      const list = meetingsByGroup.get(m.groupId) ?? [];
      list.push(m);
      meetingsByGroup.set(m.groupId, list);
    });

    meetingsByGroup.forEach((list) => {
      list.sort((a, b) => (a.scheduledStartAt < b.scheduledStartAt ? 1 : -1));
    });

    const results: InsightItem[] = [];

    groupMembers.forEach((member) => {
      const meetings = meetingsByGroup.get(member.groupId) ?? [];
      if (!meetings.length) return;

      const presentMeeting = meetings.find((meeting) =>
        groupAttendance.some(
          (a) =>
            a.groupMeetingId === meeting.id &&
            a.personId === member.personId &&
            (a.attendanceStatus === "present" || a.attendanceStatus === "first_time_guest")
        )
      );

      const referenceDate = presentMeeting?.scheduledStartAt ?? member.joinedAt;
      const days = daysSince(referenceDate);
      if (days === null || days < 30) return;

      const person = personById.get(member.personId);
      const name = person ? getFullName(person) : member.personId;
      const group = groups.find((g) => g.id === member.groupId);
      const detail = presentMeeting
        ? `${days} dias sem presença em ${group?.name ?? "célula"}`
        : `${days} dias desde que entrou em ${group?.name ?? "célula"}, sem registro de presença`;
      const message = `Ola, ${getFirstName(name)}! Sentimos sua falta na celula ${group?.name ?? ""}. Esta tudo bem por ai?`;

      results.push({ personId: member.personId, personName: name, detail, whatsappHref: getWhatsappHref(person, message) });
    });

    return results;
  }, [groupMembers, groupMeetings, groupAttendance, groups, personById]);

  // ── Q3: pedido de oração sem acompanhamento ────────────────────────────────
  const openPrayerRequests = useMemo(() => {
    return prayerRequests
      .filter((r) => r.status === "open")
      .map((r) => ({
        ...r,
        days: daysSince(r.createdAt) ?? 0,
      }))
      .sort((a, b) => b.days - a.days);
  }, [prayerRequests]);

  // ── Q4: 3+ ministérios simultâneos ─────────────────────────────────────────
  const multiMinistryMembers = useMemo<InsightItem[]>(() => {
    const teamsByPerson = new Map<string, Set<string>>();
    serviceAssignments.forEach((a) => {
      const set = teamsByPerson.get(a.personId) ?? new Set<string>();
      set.add(a.serviceTeamId);
      teamsByPerson.set(a.personId, set);
    });

    const results: InsightItem[] = [];
    teamsByPerson.forEach((teams, personId) => {
      if (teams.size < 3) return;
      const person = personById.get(personId);
      const name = person ? getFullName(person) : personId;
      const detail = `Serve em ${teams.size} ministérios ao mesmo tempo`;
      results.push({ personId, personName: name, detail, whatsappHref: getWhatsappHref(person, `Ola ${getFirstName(name)}! Vimos que voce serve em varios ministerios — queremos agradecer e cuidar de voce tambem.`) });
    });
    return results.sort((a, b) => b.detail.localeCompare(a.detail));
  }, [serviceAssignments, personById]);

  const toggle = (key: string) => setExpanded((cur) => (cur === key ? null : key));

  if (loading) {
    return (
      <div style={{ padding: "4rem", display: "flex", justifyContent: "center", color: "var(--color-text-secondary)" }}>
        <Loader2 size={24} className="spin" />
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem 1.5rem", maxWidth: 920, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#534AB7", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: 0.4 }}>
          Radar Pastoral
        </p>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 6px", color: "var(--color-text-primary)" }}>
          Quem precisa de cuidado agora
        </h1>
        <p style={{ fontSize: 14, color: "var(--color-text-secondary)", margin: 0 }}>
          Cruzamos presença, células, escalas, oração e discipulado para levantar as pessoas que ninguém percebeu ainda.
        </p>
      </div>

      {error && (
        <div style={{ padding: 14, borderRadius: 10, background: "#FCEBEB", color: "#A32D2D", marginBottom: 16, fontSize: 13 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <button onClick={() => setShowCheckIn((s) => !s)} style={actionBtnStyle}>
          <Calendar size={15} /> Registrar presença no culto
        </button>
        <button onClick={() => setShowPrayerForm((s) => !s)} style={actionBtnStyle}>
          <Plus size={15} /> Registrar pedido de oração
        </button>
      </div>

      {showCheckIn && (
        <ChurchCheckInPanel
          people={people}
          organizationId={organizationId}
          firebaseConfig={firebaseConfig}
          userId={user?.uid}
          onDone={() => {
            setShowCheckIn(false);
            void load();
          }}
          onClose={() => setShowCheckIn(false)}
        />
      )}

      {showPrayerForm && (
        <PrayerRequestPanel
          people={people}
          organizationId={organizationId}
          firebaseConfig={firebaseConfig}
          onDone={() => {
            setShowPrayerForm(false);
            void load();
          }}
          onClose={() => setShowPrayerForm(false)}
        />
      )}

      <InsightCard
        icon={<Church size={18} color="#A32D2D" />}
        iconBg="#FCEBEB"
        title="Quem deixou de frequentar a igreja"
        subtitle="Sem check-in de culto há 45 dias ou mais"
        count={missingFromChurch.length}
        expandedKey="church"
        expanded={expanded === "church"}
        onToggle={() => toggle("church")}
        emptyLabel={churchAttendance.length === 0 ? "Ainda não há registros de presença em culto — registre para ativar este radar." : "Ninguém sumiu recentemente. 🎉"}
        items={missingFromChurch}
      />

      <InsightCard
        icon={<UserX size={18} color="#854F0B" />}
        iconBg="#FAEEDA"
        title="Quem está sem ir à célula"
        subtitle="30 dias ou mais sem presença confirmada"
        count={missingFromCell.length}
        expandedKey="cell"
        expanded={expanded === "cell"}
        onToggle={() => toggle("cell")}
        emptyLabel="Todo mundo em dia com a célula. 🎉"
        items={missingFromCell}
      />

      <div style={cardOuterStyle}>
        <button onClick={() => toggle("prayer")} style={cardHeaderStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ ...iconBoxStyle, background: "#EEEDFE" }}>
              <HandHeart size={18} color="#3C3489" />
            </div>
            <div style={{ textAlign: "left" }}>
              <p style={cardTitleStyle}>Pedidos de oração sem acompanhamento</p>
              <p style={cardSubtitleStyle}>Aguardando resposta pastoral</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={countBadgeStyle(openPrayerRequests.length)}>{openPrayerRequests.length}</span>
            {expanded === "prayer" ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>
        {expanded === "prayer" && (
          <div style={cardBodyStyle}>
            {openPrayerRequests.length === 0 ? (
              <p style={emptyStyle}>{prayerRequests.length === 0 ? "Nenhum pedido de oração registrado ainda." : "Todos os pedidos foram acompanhados. 🎉"}</p>
            ) : (
              openPrayerRequests.map((r) => {
                const person = r.personId ? personById.get(r.personId) : undefined;
                const wa = getWhatsappHref(person ?? ({ mobilePhone: r.phone } as Person), `Ola ${getFirstName(r.personName)}! Vi seu pedido de oracao e quero orar com voce.`);
                return (
                  <div key={r.id} style={itemRowStyle}>
                    <div style={{ flex: 1 }}>
                      <p style={itemNameStyle}>
                        {r.personName}
                        {r.isPublic && <span style={publicBadgeStyle}>Mural · {r.prayerCount ?? 0} orações</span>}
                      </p>
                      <p style={itemDetailStyle}>"{r.message}" · há {r.days} dia{r.days === 1 ? "" : "s"}</p>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {wa && (
                        <a href={wa} target="_blank" rel="noreferrer" style={waBtnStyle}>
                          <MessageCircle size={13} /> Falar
                        </a>
                      )}
                      <button
                        style={resolveBtnStyle}
                        onClick={async () => {
                          await updatePrayerRequestStatus(firebaseConfig, { organizationId }, { requestId: r.id, status: "resolved", respondedByUserId: user?.uid });
                          void load();
                        }}
                      >
                        Marcar acompanhado
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      <InsightCard
        icon={<Award size={18} color="#085041" />}
        iconBg="#E1F5EE"
        title="Quem serve em 3+ ministérios"
        subtitle="Sobrecarga silenciosa que ninguém percebeu"
        count={multiMinistryMembers.length}
        expandedKey="ministry"
        expanded={expanded === "ministry"}
        onToggle={() => toggle("ministry")}
        emptyLabel="Ninguém está acumulando ministérios demais."
        items={multiMinistryMembers}
      />

      <div style={cardOuterStyle}>
        <button onClick={() => toggle("disciple")} style={cardHeaderStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ ...iconBoxStyle, background: "#FAE8FF" }}>
              <Sparkles size={18} color="#6B21A8" />
            </div>
            <div style={{ textAlign: "left" }}>
              <p style={cardTitleStyle}>Aceitou Jesus e nunca foi discipulado</p>
              <p style={cardSubtitleStyle}>Novos convertidos sem jornada de discipulado iniciada</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={countBadgeStyle(newBelieverNoJourney.length)}>{newBelieverNoJourney.length}</span>
            {expanded === "disciple" ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>
        {expanded === "disciple" && (
          <div style={cardBodyStyle}>
            {newBelieverNoJourney.length === 0 ? (
              <p style={emptyStyle}>Nenhum novo convertido pendente de discipulado. 🎉</p>
            ) : (
              newBelieverNoJourney.map((p) => {
                const name = getFullName(p);
                const wa = getWhatsappHref(p, `Ola ${getFirstName(name)}! Que alegria saber da sua decisao por Jesus. Vamos comecar seu discipulado?`);
                return (
                  <div key={p.id} style={itemRowStyle}>
                    <div style={{ flex: 1 }}>
                      <p style={itemNameStyle}>{name}</p>
                      <p style={itemDetailStyle}>Marcado como novo convertido, sem jornada de discipulado</p>
                    </div>
                    {wa && (
                      <a href={wa} target="_blank" rel="noreferrer" style={waBtnStyle}>
                        <MessageCircle size={13} /> Falar
                      </a>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Insight card (shared shape for list-based insights) ──────────────────

function InsightCard({
  icon,
  iconBg,
  title,
  subtitle,
  count,
  expanded,
  onToggle,
  items,
  emptyLabel,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  count: number;
  expandedKey: string;
  expanded: boolean;
  onToggle: () => void;
  items: InsightItem[];
  emptyLabel: string;
}) {
  return (
    <div style={cardOuterStyle}>
      <button onClick={onToggle} style={cardHeaderStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ ...iconBoxStyle, background: iconBg }}>{icon}</div>
          <div style={{ textAlign: "left" }}>
            <p style={cardTitleStyle}>{title}</p>
            <p style={cardSubtitleStyle}>{subtitle}</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={countBadgeStyle(count)}>{count}</span>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>
      {expanded && (
        <div style={cardBodyStyle}>
          {items.length === 0 ? (
            <p style={emptyStyle}>{emptyLabel}</p>
          ) : (
            items.map((item) => (
              <div key={item.personId} style={itemRowStyle}>
                <div style={{ flex: 1 }}>
                  <p style={itemNameStyle}>{item.personName}</p>
                  <p style={itemDetailStyle}>{item.detail}</p>
                </div>
                {item.whatsappHref && (
                  <a href={item.whatsappHref} target="_blank" rel="noreferrer" style={waBtnStyle}>
                    <MessageCircle size={13} /> Falar
                  </a>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Quick capture: culto check-in ─────────────────────────────────────────

function ChurchCheckInPanel({
  people,
  organizationId,
  firebaseConfig,
  userId,
  onDone,
  onClose,
}: {
  people: Person[];
  organizationId: string;
  firebaseConfig: any;
  userId?: string;
  onDone: () => void;
  onClose: () => void;
}) {
  const [serviceDate, setServiceDate] = useState(todayISODate());
  const [serviceLabel, setServiceLabel] = useState("Culto Domingo");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const active = people.filter((p) => p.status === "active");
    if (!q) return active.slice(0, 60);
    return active.filter((p) => getFullName(p).toLowerCase().includes(q)).slice(0, 60);
  }, [people, query]);

  const toggle = (id: string) => {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const save = async () => {
    if (!selected.size) return;
    setSaving(true);
    try {
      await recordChurchAttendance(firebaseConfig, { organizationId }, {
        personIds: Array.from(selected),
        serviceDate,
        serviceLabel,
        registeredByUserId: userId,
      });
      onDone();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={panelStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <p style={{ fontWeight: 700, fontSize: 15, margin: 0 }}>Registrar presença no culto</p>
        <button onClick={onClose} style={closeBtnStyle}><X size={16} /></button>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input type="date" value={serviceDate} onChange={(e) => setServiceDate(e.target.value)} style={inputStyle} />
        <input type="text" value={serviceLabel} onChange={(e) => setServiceLabel(e.target.value)} placeholder="Ex: Culto Domingo Manhã" style={{ ...inputStyle, flex: 1 }} />
      </div>
      <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar pessoa..." style={{ ...inputStyle, width: "100%", marginBottom: 10 }} />
      <div style={{ maxHeight: 260, overflowY: "auto", border: "1px solid var(--color-border-tertiary)", borderRadius: 8, marginBottom: 12 }}>
        {filtered.map((p) => (
          <label key={p.id} style={checkRowStyle}>
            <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} />
            <span>{getFullName(p)}</span>
          </label>
        ))}
        {filtered.length === 0 && <p style={{ padding: 12, fontSize: 13, color: "var(--color-text-secondary)" }}>Nenhuma pessoa encontrada.</p>}
      </div>
      <button onClick={save} disabled={saving || !selected.size} style={{ ...primaryBtnStyle, opacity: saving || !selected.size ? 0.6 : 1 }}>
        {saving ? "Salvando..." : `Confirmar presença (${selected.size})`}
      </button>
    </div>
  );
}

// ─── Quick capture: prayer request ─────────────────────────────────────────

function PrayerRequestPanel({
  people,
  organizationId,
  firebaseConfig,
  onDone,
  onClose,
}: {
  people: Person[];
  organizationId: string;
  firebaseConfig: any;
  onDone: () => void;
  onClose: () => void;
}) {
  const [personId, setPersonId] = useState("");
  const [personName, setPersonName] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const name = personId ? getFullName(people.find((p) => p.id === personId)!) : personName.trim();
    if (!name || !message.trim()) return;
    setSaving(true);
    try {
      await addPrayerRequest(firebaseConfig, { organizationId }, {
        personId: personId || undefined,
        personName: name,
        message: message.trim(),
        source: "reception",
      });
      onDone();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={panelStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <p style={{ fontWeight: 700, fontSize: 15, margin: 0 }}>Registrar pedido de oração</p>
        <button onClick={onClose} style={closeBtnStyle}><X size={16} /></button>
      </div>
      <select
        value={personId}
        onChange={(e) => setPersonId(e.target.value)}
        style={{ ...inputStyle, width: "100%", marginBottom: 10 }}
      >
        <option value="">Pessoa não cadastrada (digite o nome abaixo)</option>
        {people.map((p) => (
          <option key={p.id} value={p.id}>{getFullName(p)}</option>
        ))}
      </select>
      {!personId && (
        <input
          type="text"
          value={personName}
          onChange={(e) => setPersonName(e.target.value)}
          placeholder="Nome de quem pediu oração"
          style={{ ...inputStyle, width: "100%", marginBottom: 10 }}
        />
      )}
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Motivo do pedido de oração..."
        rows={3}
        style={{ ...inputStyle, width: "100%", marginBottom: 12, resize: "vertical" }}
      />
      <button onClick={save} disabled={saving || (!personId && !personName.trim()) || !message.trim()} style={{ ...primaryBtnStyle, opacity: saving ? 0.6 : 1 }}>
        {saving ? "Salvando..." : "Registrar pedido"}
      </button>
    </div>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const actionBtnStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "9px 14px",
  borderRadius: 10,
  border: "1px solid var(--color-border-tertiary)",
  background: "var(--color-background-primary)",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  color: "var(--color-text-primary)",
};

const panelStyle: React.CSSProperties = {
  background: "var(--color-background-primary)",
  border: "0.5px solid var(--color-border-tertiary)",
  borderRadius: 12,
  padding: 16,
  marginBottom: 20,
};

const inputStyle: React.CSSProperties = {
  padding: "9px 12px",
  borderRadius: 8,
  border: "1px solid var(--color-border-tertiary)",
  fontSize: 13,
  fontFamily: "inherit",
};

const checkRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "8px 12px",
  fontSize: 13,
  borderBottom: "0.5px solid var(--color-border-tertiary)",
  cursor: "pointer",
};

const primaryBtnStyle: React.CSSProperties = {
  padding: "10px 16px",
  borderRadius: 10,
  border: "none",
  background: "#534AB7",
  color: "#fff",
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
  width: "100%",
};

const closeBtnStyle: React.CSSProperties = {
  border: "none",
  background: "none",
  cursor: "pointer",
  color: "var(--color-text-secondary)",
  padding: 4,
};

const cardOuterStyle: React.CSSProperties = {
  background: "var(--color-background-primary)",
  border: "0.5px solid var(--color-border-tertiary)",
  borderRadius: 12,
  overflow: "hidden",
  marginBottom: 14,
};

const cardHeaderStyle: React.CSSProperties = {
  width: "100%",
  padding: "16px 18px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  background: "none",
  border: "none",
  cursor: "pointer",
  textAlign: "left",
};

const iconBoxStyle: React.CSSProperties = {
  width: 38,
  height: 38,
  borderRadius: 10,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const cardTitleStyle: React.CSSProperties = { fontSize: 14, fontWeight: 700, margin: "0 0 2px", color: "var(--color-text-primary)" };
const cardSubtitleStyle: React.CSSProperties = { fontSize: 12, color: "var(--color-text-secondary)", margin: 0 };

function countBadgeStyle(count: number): React.CSSProperties {
  return {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    padding: "0 8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 700,
    background: count > 0 ? "#FCEBEB" : "#E1F5EE",
    color: count > 0 ? "#A32D2D" : "#085041",
  };
}

const cardBodyStyle: React.CSSProperties = {
  borderTop: "0.5px solid var(--color-border-tertiary)",
  maxHeight: 360,
  overflowY: "auto",
};

const itemRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "12px 18px",
  borderBottom: "0.5px solid var(--color-border-tertiary)",
};

const itemNameStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600, margin: "0 0 2px", color: "var(--color-text-primary)" };
const itemDetailStyle: React.CSSProperties = { fontSize: 12, color: "var(--color-text-secondary)", margin: 0 };
const emptyStyle: React.CSSProperties = { padding: "24px 18px", fontSize: 13, color: "var(--color-text-secondary)", textAlign: "center", margin: 0 };

const waBtnStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 5,
  padding: "6px 10px",
  borderRadius: 8,
  background: "#E1F5EE",
  color: "#085041",
  fontSize: 12,
  fontWeight: 600,
  textDecoration: "none",
  whiteSpace: "nowrap",
};

const resolveBtnStyle: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid var(--color-border-tertiary)",
  background: "var(--color-background-primary)",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const publicBadgeStyle: React.CSSProperties = {
  marginLeft: 8,
  padding: "2px 8px",
  borderRadius: 6,
  fontSize: 10,
  fontWeight: 700,
  background: "#EEEDFE",
  color: "#3C3489",
  textTransform: "uppercase",
  letterSpacing: 0.3,
};
