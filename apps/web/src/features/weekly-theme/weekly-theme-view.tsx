"use client";

import { useEffect, useState } from "react";
import { BookOpen, CalendarDays, Plus, Trash2, Users } from "lucide-react";
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

export function WeeklyThemeView() {
  const { configured, firebaseReady, user, organizationId, firebaseConfig } = useAppAuth();

  const [groups, setGroups] = useState<Group[]>([]);
  const [weekStartDate, setWeekStartDate] = useState(getMondayOfWeek(new Date()));
  const [themes, setThemes] = useState<WeeklyTheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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
      setForm({ title: "", bibleVerse: "", description: "", scope: "all", groupIds: [] });
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
    return <div className="p-8 text-gray-500">Carregando...</div>;
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <BookOpen className="w-6 h-6 text-purple-600" />
        <h1 className="text-2xl font-bold">Tema Semanal das Células</h1>
      </div>

      {/* Semana selecionada */}
      <div className="flex items-center gap-3">
        <CalendarDays className="w-5 h-5 text-gray-500" />
        <label className="text-sm font-medium text-gray-700">Semana de início:</label>
        <input
          type="date"
          value={weekStartDate}
          onChange={(e) => setWeekStartDate(e.target.value)}
          className="border rounded px-2 py-1 text-sm"
        />
      </div>

      {/* Temas existentes */}
      {themes.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-700">Temas desta semana</h2>
          {themes.map((t) => (
            <div key={t.id} className="border rounded-lg p-4 bg-white shadow-sm flex gap-4 justify-between items-start">
              <div className="space-y-1">
                <div className="font-semibold text-gray-900">{t.title}</div>
                {t.bibleVerse && (
                  <div className="text-sm text-purple-700 italic">{t.bibleVerse}</div>
                )}
                {t.description && (
                  <div className="text-sm text-gray-600">{t.description}</div>
                )}
                <div className="text-xs text-gray-400">
                  {t.scope === "all"
                    ? "Para todas as células"
                    : `Para células específicas (${t.groupIds.length})`}
                </div>
              </div>
              <button
                onClick={() => handleDelete(t.id)}
                className="text-red-400 hover:text-red-600 p-1"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Formulário novo tema */}
      <div className="border rounded-lg p-5 bg-gray-50 space-y-4">
        <div className="flex items-center gap-2 font-semibold text-gray-700">
          <Plus className="w-4 h-4" />
          Novo tema
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
          <input
            type="text"
            placeholder="Ex: Fé que move montanhas"
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Versículo base</label>
          <input
            type="text"
            placeholder="Ex: Mateus 17:20"
            value={form.bibleVerse}
            onChange={(e) => setForm((p) => ({ ...p, bibleVerse: e.target.value }))}
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Orientações (opcional)</label>
          <textarea
            rows={3}
            placeholder="Instruções adicionais para os líderes..."
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Destinatários</label>
          <div className="flex gap-3">
            <button
              onClick={() => setForm((p) => ({ ...p, scope: "all", groupIds: [] }))}
              className={`flex items-center gap-2 px-3 py-2 rounded text-sm border ${
                form.scope === "all"
                  ? "bg-purple-100 border-purple-400 text-purple-700 font-semibold"
                  : "bg-white text-gray-600"
              }`}
            >
              <Users className="w-4 h-4" /> Todas as células
            </button>
            <button
              onClick={() => setForm((p) => ({ ...p, scope: "specific" }))}
              className={`flex items-center gap-2 px-3 py-2 rounded text-sm border ${
                form.scope === "specific"
                  ? "bg-purple-100 border-purple-400 text-purple-700 font-semibold"
                  : "bg-white text-gray-600"
              }`}
            >
              Células específicas
            </button>
          </div>
        </div>

        {form.scope === "specific" && (
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
            {groups
              .filter((g) => g.type === "cell")
              .map((g) => (
                <label key={g.id} className="flex items-center gap-2 text-sm cursor-pointer">
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

        {error && <div className="text-red-600 text-sm">{error}</div>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-purple-600 text-white px-4 py-2 rounded text-sm font-semibold hover:bg-purple-700 disabled:opacity-50"
        >
          {saving ? "Salvando..." : "Salvar tema"}
        </button>
      </div>
    </div>
  );
}
