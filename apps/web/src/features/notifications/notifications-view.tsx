"use client";

import { useEffect, useState } from "react";
import {
  Bell, UserPlus, CalendarRange,
  Heart, AlertTriangle, RefreshCw, CheckCheck,
  TrendingUp,
} from "lucide-react";
import {
  fetchFollowUpTasks, fetchEvents,
  isFirebaseWebRuntimeConfigured,
} from "@alvo/firebase";
import { cachedFetchPeople } from "../../lib/org-data-cache";
import type { Person, FollowUpTask, Event } from "@alvo/types";
import { useAppAuth } from "../../../app/providers";

/* ── Tipos ─────────────────────────────────────────────────────────────────── */
type NotifType = "visitor" | "task" | "event" | "birthday" | "milestone" | "system";

interface Notification {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  time: string;
  read: boolean;
  href?: string;
}

const TYPE_CONFIG: Record<NotifType, { icon: React.ElementType; color: string; bg: string }> = {
  visitor:   { icon: UserPlus,       color: "#2563eb", bg: "#eff6ff" },
  task:      { icon: AlertTriangle,  color: "#d97706", bg: "#fef3c7" },
  event:     { icon: CalendarRange,  color: "#7c3aed", bg: "#f5f3ff" },
  birthday:  { icon: Heart,          color: "#ec4899", bg: "#fdf2f8" },
  milestone: { icon: TrendingUp,     color: "#059669", bg: "#ecfdf5" },
  system:    { icon: Bell,           color: "#64748b", bg: "#f8fafc" },
};

/* ── Gerador de notificações a partir de dados reais ──────────────────────── */
function buildNotifications(people: Person[], tasks: FollowUpTask[], events: Event[]): Notification[] {
  const notifs: Notification[] = [];
  const now = new Date();

  // Novos visitantes (últimos 30 dias) — usa o consentimento LGPD como data de cadastro real.
  const monthAgo = new Date(now.getTime() - 30 * 86400000).toISOString();
  const newVisitors = people
    .filter(p => p.memberStatus === "visitor" && p.consentLgpdAt && p.consentLgpdAt >= monthAgo)
    .sort((a, b) => (b.consentLgpdAt ?? "").localeCompare(a.consentLgpdAt ?? ""))
    .slice(0, 5);
  for (const v of newVisitors) {
    notifs.push({
      id: `visitor-${v.id}`,
      type: "visitor",
      title: "Novo visitante",
      body: `${v.firstName} ${v.lastName ?? ""} visitou pela primeira vez.`,
      time: v.consentLgpdAt ? new Date(v.consentLgpdAt).toLocaleDateString("pt-BR") : "Recente",
      read: false,
      href: `/members/${v.id}`,
    });
  }

  // Tarefas vencidas
  const overdueTasks = tasks.filter(t => t.status === "open" && t.dueAt && t.dueAt < now.toISOString().slice(0, 10)).slice(0, 3);
  for (const t of overdueTasks) {
    notifs.push({
      id: `task-${t.id}`,
      type: "task",
      title: "Tarefa em atraso",
      body: `${t.title} — venceu em ${t.dueAt}.`,
      time: t.dueAt ?? "",
      read: false,
      href: "/members",
    });
  }

  // Próximos eventos (3 dias)
  const in3days = new Date(now.getTime() + 3 * 86400000).toISOString().slice(0, 10);
  const upcoming = events.filter(e => e.startsAt && e.startsAt.slice(0, 10) >= now.toISOString().slice(0, 10) && e.startsAt.slice(0, 10) <= in3days).slice(0, 2);
  for (const e of upcoming) {
    notifs.push({
      id: `event-${e.id}`,
      type: "event",
      title: "Evento em breve",
      body: `${e.name} acontece em ${new Date(e.startsAt).toLocaleDateString("pt-BR")}.`,
      time: e.startsAt.slice(0, 10),
      read: true,
      href: "/events",
    });
  }

  // Aniversários do mês
  const thisMonth = String(now.getMonth() + 1).padStart(2, "0");
  const birthdays = people
    .filter(p => p.birthDate && p.birthDate.slice(5, 7) === thisMonth)
    .slice(0, 3);
  for (const b of birthdays) {
    notifs.push({
      id: `birthday-${b.id}`,
      type: "birthday",
      title: "Aniversário este mês",
      body: `${b.firstName} ${b.lastName ?? ""} faz aniversário em ${b.birthDate?.slice(8, 10)}/${thisMonth}.`,
      time: `${b.birthDate?.slice(8, 10)}/${thisMonth}`,
      read: true,
      href: `/members/${b.id}`,
    });
  }

  // Mais recentes primeiro; não lidas no topo.
  return notifs.sort((a, b) => {
    if (a.read !== b.read) return a.read ? 1 : -1;
    return b.time.localeCompare(a.time);
  });
}

/* ── Component ─────────────────────────────────────────────────────────────── */
export function NotificationsView() {
  const { configured, firebaseReady, user, organizationId, firebaseConfig } = useAppAuth();
  const [notifs, setNotifs]   = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState<"all" | "unread">("all");

  const isReal = configured && firebaseReady && user && isFirebaseWebRuntimeConfigured(firebaseConfig);

  useEffect(() => {
    async function load() {
      if (!isReal || !organizationId) { setNotifs([]); setLoading(false); return; }
      try {
        const [people, tasks, events] = await Promise.all([
          cachedFetchPeople(firebaseConfig, { organizationId }, 500),
          fetchFollowUpTasks(firebaseConfig, { organizationId }, 50),
          fetchEvents(firebaseConfig, { organizationId }),
        ]);
        setNotifs(buildNotifications(people, tasks, events));
      } catch { setNotifs([]); } finally { setLoading(false); }
    }
    void load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReal, organizationId]);

  function markAllRead() {
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  }

  function markRead(id: string) {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }

  const unread  = notifs.filter(n => !n.read).length;
  const visible = filter === "unread" ? notifs.filter(n => !n.read) : notifs;

  if (loading) {
    return (
      <div className="page-root" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
        <RefreshCw size={24} style={{ color: "var(--alvo-ink-soft)", animation: "spin 1s linear infinite" }} />
        <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="page-root">
      <header className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Notificações</h1>
          <p className="page-subtitle">
            {unread > 0 ? `${unread} não lida${unread > 1 ? "s" : ""}` : "Tudo em dia"}
          </p>
        </div>
        {unread > 0 && (
          <div className="page-header-actions">
            <button onClick={markAllRead} className="btn-outline" style={{ display:"flex", alignItems:"center", gap:6 }}>
              <CheckCheck size={15} /> Marcar todas como lidas
            </button>
          </div>
        )}
      </header>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
        {(["all","unread"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{
              padding: "6px 14px", borderRadius: 8, border: "1.5px solid",
              borderColor: filter === f ? "var(--alvo-accent-dark)" : "var(--alvo-line)",
              background: filter === f ? "var(--alvo-accent-soft)" : "transparent",
              color: filter === f ? "var(--alvo-accent-dark)" : "var(--alvo-ink-soft)",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            {f === "all" ? `Todas (${notifs.length})` : `Não lidas (${unread})`}
          </button>
        ))}
      </div>

      {/* List */}
      <section className="content-section" style={{ padding: 0, overflow: "hidden" }}>
        {visible.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center" }}>
            <Bell size={32} style={{ color: "var(--alvo-line)", marginBottom: 12 }} />
            <p style={{ color: "var(--alvo-ink-soft)", fontSize: 14, margin: 0 }}>
              {filter === "unread" ? "Nenhuma notificação não lida." : "Nenhuma notificação."}
            </p>
          </div>
        ) : visible.map((n, i) => {
          const cfg = TYPE_CONFIG[n.type];
          const Icon = cfg.icon;
          const Wrapper: React.ElementType = n.href ? "a" : "div";
          return (
            <Wrapper
              key={n.id}
              href={n.href}
              onClick={() => markRead(n.id)}
              style={{
                display: "flex", alignItems: "flex-start", gap: 14,
                padding: "14px 18px",
                borderBottom: i < visible.length - 1 ? "1px solid var(--alvo-line)" : "none",
                background: n.read ? "transparent" : "var(--alvo-surface-muted)",
                textDecoration: "none", cursor: n.href ? "pointer" : "default",
                transition: "background 0.15s",
              }}
            >
              <div style={{
                width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                background: cfg.bg, color: cfg.color,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon size={18} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <strong style={{ fontSize: 14, color: "var(--alvo-ink)", display: "block" }}>{n.title}</strong>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    <span style={{ fontSize: 11, color: "var(--alvo-ink-soft)" }}>{n.time}</span>
                    {!n.read && (
                      <div style={{ width: 8, height: 8, borderRadius: 4, background: "var(--alvo-accent-dark)", flexShrink: 0 }} />
                    )}
                  </div>
                </div>
                <p style={{ margin: "3px 0 0", fontSize: 13, color: "var(--alvo-ink-soft)", lineHeight: 1.4 }}>{n.body}</p>
              </div>
            </Wrapper>
          );
        })}
      </section>

      {/* Tipos legenda */}
      <section className="content-section">
        <div className="section-header">
          <h2 className="section-title">Tipos de Notificação</h2>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {(Object.entries(TYPE_CONFIG) as [NotifType, typeof TYPE_CONFIG[NotifType]][]).map(([type, cfg]) => {
            const Icon = cfg.icon;
            const labels: Record<NotifType, string> = { visitor:"Visitante", task:"Tarefa", event:"Evento", birthday:"Aniversário", milestone:"Marco", system:"Sistema" };
            return (
              <div key={type} style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 12px", borderRadius:8, background:cfg.bg }}>
                <Icon size={13} style={{ color: cfg.color }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: cfg.color }}>{labels[type]}</span>
              </div>
            );
          })}
        </div>
      </section>

      <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
