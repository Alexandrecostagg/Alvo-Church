"use client";

import { useEffect, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Lock,
  Plus,
  Sparkles,
  Trash2,
  Users,
  Waypoints,
} from "lucide-react";
import {
  createFirebaseWebRuntimeConfigFromEnv,
  isFirebaseWebRuntimeConfigured,
  fetchGroups,
  saveWeeklyTheme,
  fetchWeeklyThemesForWeek,
  deleteWeeklyTheme,
} from "@alvo/firebase";
import type { Group, WeeklyTheme, WeeklyThemeScope } from "@alvo/types";
import { useAppAuth } from "../../../app/providers";

function getMondayOfWeek(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

function addWeeks(dateStr: string, n: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n * 7);
  return d.toISOString().split("T")[0];
}

function formatWeekRange(mondayStr: string): string {
  const monday = new Date(mondayStr + "T12:00:00");
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
  return `${fmt(monday)} – ${fmt(sunday)} ${monday.getFullYear()}`;
}

const ACCENT_COLORS: Record<
  WeeklyThemeScope,
  { bar: string; badge: string; badgeText: string; verse: string }
> = {
  all: {
    bar: "#7F77DD",
    badge: "#EEEDFE",
    badgeText: "#3C3489",
    verse: "#534AB7",
  },
  specific: {
    bar: "#1D9E75",
    badge: "#E1F5EE",
    badgeText: "#085041",
    verse: "#0F6E56",
  },
  open: {
    bar: "#BA7517",
    badge: "#FAEEDA",
    badgeText: "#633806",
    verse: "#854F0B",
  },
};

const SCOPE_LABELS: Record<WeeklyThemeScope, string> = {
  all: "Todas as células",
  specific: "Células específicas",
  open: "Livre (líder decide)",
};

export function WeeklyThemeView() {
  const { configured, firebaseReady, user, organizationId, firebaseConfig } =
    useAppAuth();

  const [groups, setGroups] = useState<Group[]>([]);
  const [weekStartDate, setWeekStartDate] = useState(
    getMondayOfWeek(new Date()),
  );
  const [themes, setThemes] = useState<WeeklyTheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    title: "",
    bibleVerse: "",
    description: "",
    scope: "all" as WeeklyThemeScope,
    groupIds: [] as string[],
  });

  const ready =
    configured &&
    firebaseReady &&
    user &&
    isFirebaseWebRuntimeConfigured(firebaseConfig);

  useEffect(() => {
    if (!ready) return;
    setLoading(true);
    const ctx = { organizationId };
    Promise.all([
      fetchGroups(firebaseConfig, ctx, 100),
      fetchWeeklyThemesForWeek(firebaseConfig, ctx, weekStartDate),
    ]).then(([g, t]) => {
      setGroups(g);
      setThemes(t);
      setLoading(false);
    });
  }, [ready, organizationId, firebaseConfig, weekStartDate]);

  async function handleSave() {
    if (!form.title.trim()) {
      setError("Título é obrigatório");
      return;
    }
    if (form.scope === "specific" && form.groupIds.length === 0) {
      setError("Selecione ao menos uma célula");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const theme: WeeklyTheme = {
        id: crypto.randomUUID(),
        organizationId,
        title: form.title.trim(),
        bibleVerse: form.bibleVerse.trim() || undefined,
        description: form.description.trim() || undefined,
        scope: form.scope,
        groupIds: form.scope === "specific" ? form.groupIds : [],
        weekStartDate,
        createdBy: user!.uid,
        createdAt: new Date().toISOString(),
      };
      await saveWeeklyTheme(firebaseConfig, { organizationId }, theme);
      setThemes((prev) => [...prev, theme]);
      setForm({
        title: "",
        bibleVerse: "",
        description: "",
        scope: "all",
        groupIds: [],
      });
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(themeId: string) {
    await deleteWeeklyTheme(firebaseConfig, { organizationId }, themeId);
    setThemes((prev) => prev.filter((t) => t.id !== themeId));
  }

  function toggleGroup(groupId: string) {
    setForm((prev) => ({
      ...prev,
      groupIds: prev.groupIds.includes(groupId)
        ? prev.groupIds.filter((id) => id !== groupId)
        : [...prev.groupIds, groupId],
    }));
  }

  if (!ready || loading) {
    return (
      <div
        style={{
          padding: "3rem",
          textAlign: "center",
          color: "var(--color-text-secondary)",
        }}
      >
        Carregando...
      </div>
    );
  }

  const today = getMondayOfWeek(new Date());

  return (
    <div style={{ padding: "2rem 1.5rem", maxWidth: 860, margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: "2rem",
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: "#7F77DD",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <BookOpen size={20} color="#fff" />
        </div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>
            Tema semanal das células
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "var(--color-text-secondary)",
              margin: "2px 0 0",
            }}
          >
            Defina o tema que as células trabalharão esta semana
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "#7F77DD",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "8px 16px",
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          <Plus size={16} /> Novo tema
        </button>
      </div>

      {/* Week bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: "var(--color-background-secondary)",
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: 12,
          padding: "12px 16px",
          marginBottom: "1.5rem",
        }}
      >
        <CalendarDays size={16} color="var(--color-text-secondary)" />
        <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
          Semana atual
        </span>
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            padding: "4px 12px",
            background: "#EEEDFE",
            color: "#3C3489",
            borderRadius: 6,
          }}
        >
          {formatWeekRange(weekStartDate)}
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <button
            onClick={() => setWeekStartDate(addWeeks(weekStartDate, -1))}
            style={{
              background: "none",
              border: "0.5px solid var(--color-border-tertiary)",
              borderRadius: 6,
              padding: "4px 10px",
              cursor: "pointer",
              color: "var(--color-text-secondary)",
              fontSize: 13,
              display: "flex",
              alignItems: "center",
            }}
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={() => setWeekStartDate(today)}
            style={{
              background: "none",
              border: "0.5px solid var(--color-border-tertiary)",
              borderRadius: 6,
              padding: "4px 12px",
              cursor: "pointer",
              color: "var(--color-text-secondary)",
              fontSize: 13,
            }}
          >
            Hoje
          </button>
          <button
            onClick={() => setWeekStartDate(addWeeks(weekStartDate, 1))}
            style={{
              background: "none",
              border: "0.5px solid var(--color-border-tertiary)",
              borderRadius: 6,
              padding: "4px 10px",
              cursor: "pointer",
              color: "var(--color-text-secondary)",
              fontSize: 13,
              display: "flex",
              alignItems: "center",
            }}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Themes list */}
      <p
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: "var(--color-text-secondary)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: 12,
        }}
      >
        Temas desta semana
      </p>

      {themes.length === 0 && !showForm && (
        <div
          style={{
            textAlign: "center",
            padding: "3rem",
            border: "0.5px dashed var(--color-border-tertiary)",
            borderRadius: 12,
            marginBottom: "1.5rem",
          }}
        >
          <BookOpen size={32} color="#AFA9EC" style={{ marginBottom: 8 }} />
          <p
            style={{
              color: "var(--color-text-secondary)",
              fontSize: 14,
              margin: 0,
            }}
          >
            Nenhum tema definido para esta semana.
          </p>
          <button
            onClick={() => setShowForm(true)}
            style={{
              marginTop: 12,
              background: "#7F77DD",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Criar primeiro tema
          </button>
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          marginBottom: "1.5rem",
        }}
      >
        {themes.map((t) => {
          const colors = ACCENT_COLORS[t.scope] ?? ACCENT_COLORS.all;
          return (
            <div
              key={t.id}
              style={{
                background: "var(--color-background-primary)",
                border: "0.5px solid var(--color-border-tertiary)",
                borderRadius: 12,
                padding: "1rem 1.25rem",
                display: "flex",
                gap: 16,
                alignItems: "flex-start",
              }}
            >
              <div
                style={{
                  width: 4,
                  borderRadius: 2,
                  alignSelf: "stretch",
                  flexShrink: 0,
                  background: colors.bar,
                }}
              />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 6,
                  }}
                >
                  <span style={{ fontSize: 15, fontWeight: 500 }}>
                    {t.title}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      padding: "2px 8px",
                      borderRadius: 4,
                      background: colors.badge,
                      color: colors.badgeText,
                    }}
                  >
                    {SCOPE_LABELS[t.scope] ?? "Todas as células"}
                  </span>
                </div>
                {t.bibleVerse && (
                  <p
                    style={{
                      fontSize: 13,
                      color: colors.verse,
                      fontStyle: "italic",
                      margin: "0 0 4px",
                    }}
                  >
                    {t.bibleVerse}
                  </p>
                )}
                {t.description && (
                  <p
                    style={{
                      fontSize: 13,
                      color: "var(--color-text-secondary)",
                      margin: 0,
                    }}
                  >
                    {t.description}
                  </p>
                )}
                <p
                  style={{
                    fontSize: 12,
                    color: "var(--color-text-secondary)",
                    margin: "8px 0 0",
                  }}
                >
                  {new Date(t.createdAt).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button
                  onClick={() => handleDelete(t.id)}
                  style={{
                    background: "none",
                    border: "0.5px solid var(--color-border-tertiary)",
                    borderRadius: 6,
                    padding: "6px 8px",
                    cursor: "pointer",
                    color: "var(--color-text-secondary)",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Form */}
      {showForm && (
        <div
          style={{
            background: "var(--color-background-primary)",
            border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: 12,
            padding: "1.25rem",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: "1.25rem",
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                background: "#EEEDFE",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Sparkles size={16} color="#534AB7" />
            </div>
            <span style={{ fontSize: 15, fontWeight: 500 }}>
              Novo tema para {formatWeekRange(weekStartDate)}
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <div style={{ gridColumn: "1 / -1" }}>
              <label
                style={{
                  fontSize: 12,
                  color: "var(--color-text-secondary)",
                  display: "block",
                  marginBottom: 4,
                }}
              >
                Título *
              </label>
              <input
                type="text"
                placeholder="Ex: Gratidão em todas as circunstâncias"
                value={form.title}
                onChange={(e) =>
                  setForm((p) => ({ ...p, title: e.target.value }))
                }
                style={{ width: "100%" }}
              />
            </div>
            <div>
              <label
                style={{
                  fontSize: 12,
                  color: "var(--color-text-secondary)",
                  display: "block",
                  marginBottom: 4,
                }}
              >
                Versículo base
              </label>
              <input
                type="text"
                placeholder="Ex: Filipenses 4:6"
                value={form.bibleVerse}
                onChange={(e) =>
                  setForm((p) => ({ ...p, bibleVerse: e.target.value }))
                }
                style={{ width: "100%" }}
              />
            </div>
            <div>
              <label
                style={{
                  fontSize: 12,
                  color: "var(--color-text-secondary)",
                  display: "block",
                  marginBottom: 4,
                }}
              >
                Duração sugerida
              </label>
              <input
                type="text"
                placeholder="Ex: 90 minutos"
                style={{ width: "100%" }}
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label
                style={{
                  fontSize: 12,
                  color: "var(--color-text-secondary)",
                  display: "block",
                  marginBottom: 4,
                }}
              >
                Orientações para os líderes
              </label>
              <textarea
                rows={3}
                placeholder="Contexto, sugestões de dinâmica, pontos de atenção..."
                value={form.description}
                onChange={(e) =>
                  setForm((p) => ({ ...p, description: e.target.value }))
                }
                style={{ width: "100%", resize: "vertical" }}
              />
            </div>
          </div>

          <label
            style={{
              fontSize: 12,
              color: "var(--color-text-secondary)",
              display: "block",
              marginBottom: 8,
            }}
          >
            Destinatários
          </label>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {(["all", "specific", "open"] as WeeklyThemeScope[]).map((s) => {
              const icons = {
                all: <Users size={14} />,
                specific: <Waypoints size={14} />,
                open: <Lock size={14} />,
              };
              const active = form.scope === s;
              return (
                <button
                  key={s}
                  onClick={() =>
                    setForm((p) => ({ ...p, scope: s, groupIds: [] }))
                  }
                  style={{
                    flex: 1,
                    padding: "8px",
                    borderRadius: 8,
                    border: active
                      ? "0.5px solid #AFA9EC"
                      : "0.5px solid var(--color-border-tertiary)",
                    background: active ? "#EEEDFE" : "none",
                    cursor: "pointer",
                    fontSize: 13,
                    color: active ? "#3C3489" : "var(--color-text-secondary)",
                    fontWeight: active ? 500 : 400,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  {icons[s]} {SCOPE_LABELS[s]}
                </button>
              );
            })}
          </div>

          {form.scope === "specific" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                maxHeight: 180,
                overflowY: "auto",
                marginBottom: 12,
                padding: "8px",
                background: "var(--color-background-secondary)",
                borderRadius: 8,
              }}
            >
              {groups
                .filter((g) => g.type === "cell")
                .map((g) => (
                  <label
                    key={g.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={form.groupIds.includes(g.id)}
                      onChange={() => toggleGroup(g.id)}
                    />
                    {g.name}
                  </label>
                ))}
            </div>
          )}

          {error && (
            <p
              style={{
                color: "var(--color-text-danger)",
                fontSize: 13,
                marginBottom: 12,
              }}
            >
              {error}
            </p>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button
              onClick={() => {
                setShowForm(false);
                setError("");
              }}
              style={{
                background: "none",
                border: "0.5px solid var(--color-border-tertiary)",
                borderRadius: 8,
                padding: "8px 16px",
                fontSize: 14,
                cursor: "pointer",
                color: "var(--color-text-secondary)",
              }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                background: "#7F77DD",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "8px 20px",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? "Salvando..." : "Salvar tema"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
