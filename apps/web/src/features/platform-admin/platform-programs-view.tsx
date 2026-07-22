"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Save, ChevronDown, ChevronRight } from "lucide-react";
import { useAppAuth } from "../../../app/providers";
import { friendlyError } from "../../lib/friendly-error";
import {
  fetchTrainingPrograms,
  fetchTrainingLessons,
  saveTrainingProgram,
  saveTrainingLesson,
  deleteTrainingLesson
} from "@alvo/firebase";
import type { TrainingProgram, TrainingLesson } from "@alvo/types";

// Prefixo `tp_` nos ids de trilha para não colidir com cursos internos do EAD
// na subcoleção compartilhada de progresso (people/{id}/courseProgress).
function newProgramId() {
  return `tp_${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
}
function newLessonId() {
  return `tl_${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
}

const emptyForm = (): TrainingProgram => ({
  id: "",
  title: "",
  description: "",
  thumbnailUrl: "",
  priceBRL: 0,
  isPublished: false,
  createdAt: "",
  updatedAt: ""
});

export function PlatformProgramsView() {
  const { firebaseConfig } = useAppAuth();
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState<TrainingProgram | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Apenas LÊ o catálogo. Nada de auto-seed aqui: o catálogo é gerido pelo
      // script de seed (scripts/seed-catalogo-final.ts). Um backfill a partir do
      // mock antigo ressuscitava trilhas apagadas — por isso foi removido.
      const list = await fetchTrainingPrograms(firebaseConfig, false);
      setPrograms(list.sort((a, b) => a.title.localeCompare(b.title)));
    } catch (e) {
      setError(friendlyError(e, "Erro ao carregar trilhas"));
    } finally {
      setLoading(false);
    }
  }, [firebaseConfig]);

  useEffect(() => { load(); }, [load]);

  async function handleSaveProgram() {
    if (!form) return;
    if (!form.title.trim()) { setError("Título é obrigatório."); return; }
    setSaving(true);
    setError("");
    const now = new Date().toISOString();
    const program: TrainingProgram = {
      ...form,
      id: form.id || newProgramId(),
      priceBRL: Number(form.priceBRL) || 0,
      createdAt: form.createdAt || now,
      updatedAt: now
    };
    try {
      await saveTrainingProgram(firebaseConfig, program);
      setForm(null);
      load();
    } catch (e) {
      setError(friendlyError(e, "Erro ao salvar trilha"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div style={{ padding: "3rem", display: "flex", justifyContent: "center", color: "var(--color-text-secondary)" }}><Loader2 size={22} className="spin" /></div>;
  }

  // Form de criação/edição. Renderizado INLINE — no topo p/ "Nova trilha" e
  // dentro do card da trilha sendo editada — pra o clique em "Editar" mostrar
  // o form ali mesmo, e não lá no topo longe do botão.
  const renderEditor = () => {
    if (!form) return null;
    return (
      <div style={{ display: "grid", gap: 10 }}>
        <p style={{ fontSize: 14, fontWeight: 700, margin: "0 0 4px" }}>{form.id ? "Editar trilha" : "Nova trilha"}</p>
        <Field label="Título">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={inputStyle} placeholder="Ex.: Formação de Líderes de Célula" />
        </Field>
        <Field label="Descrição">
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ ...inputStyle, minHeight: 70, resize: "vertical" }} placeholder="O que a igreja recebe nesta trilha" />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 160px", gap: 10 }}>
          <Field label="Professor / Ministrante (certificado)">
            <input value={form.instructorName ?? ""} onChange={(e) => setForm({ ...form, instructorName: e.target.value })} style={inputStyle} placeholder="Nome de quem assina o certificado" />
          </Field>
          <Field label="Cargo (opcional)">
            <input value={form.instructorTitle ?? ""} onChange={(e) => setForm({ ...form, instructorTitle: e.target.value })} style={inputStyle} placeholder="Ex.: Pastor" />
          </Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 160px", gap: 10 }}>
          <Field label="URL da capa (opcional)">
            <input value={form.thumbnailUrl ?? ""} onChange={(e) => setForm({ ...form, thumbnailUrl: e.target.value })} style={inputStyle} placeholder="https://..." />
          </Field>
          <Field label="Preço (R$)">
            <input type="number" min={0} step="0.01" value={form.priceBRL} onChange={(e) => setForm({ ...form, priceBRL: Number(e.target.value) })} style={inputStyle} />
          </Field>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
          <input type="checkbox" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} />
          Publicada (visível na loja das igrejas)
        </label>
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <button onClick={handleSaveProgram} disabled={saving} style={primaryBtn}>
            {saving ? <Loader2 size={15} className="spin" /> : <Save size={15} />} Salvar
          </button>
          <button onClick={() => { setForm(null); setError(""); }} style={secondaryBtn}>Cancelar</button>
        </div>
      </div>
    );
  };

  return (
    <div>
      {error && <div style={{ padding: 12, borderRadius: 10, background: "#FCEBEB", color: "#A32D2D", marginBottom: 14, fontSize: 13 }}>{error}</div>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
          Trilhas vendidas às igrejas na Loja de Capacitação. {programs.length} cadastrada{programs.length === 1 ? "" : "s"}.
        </p>
        {!form && (
          <button onClick={() => setForm(emptyForm())} style={primaryBtn}>
            <Plus size={15} /> Nova trilha
          </button>
        )}
      </div>

      {/* "Nova trilha" abre no topo; edição de trilha existente abre inline no card. */}
      {form && !form.id && <div style={cardStyle}>{renderEditor()}</div>}

      <div style={{ display: "grid", gap: 10 }}>
        {programs.map((p) => {
          const editingThis = !!form && form.id === p.id;
          return (
            <div key={p.id} style={cardStyle}>
              {editingThis ? renderEditor() : (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <strong style={{ fontSize: 14, color: "var(--color-text-primary)" }}>{p.title}</strong>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: p.isPublished ? "#E1F5EE" : "#F1EFE8", color: p.isPublished ? "#085041" : "#7a756a" }}>
                          {p.isPublished ? "Publicada" : "Rascunho"}
                        </span>
                      </div>
                      <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "4px 0 0", overflowWrap: "anywhere" }}>{p.description}</p>
                      <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "6px 0 0" }}>
                        R$ {p.priceBRL.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => { setError(""); setForm(p); setExpandedId(null); }} style={secondaryBtn} disabled={!!form}>Editar</button>
                      <button onClick={() => setExpandedId(expandedId === p.id ? null : p.id)} style={secondaryBtn} disabled={!!form}>
                        {expandedId === p.id ? <ChevronDown size={15} /> : <ChevronRight size={15} />} Aulas
                      </button>
                    </div>
                  </div>
                  {expandedId === p.id && <LessonsEditor programId={p.id} />}
                </>
              )}
            </div>
          );
        })}
        {programs.length === 0 && !form && (
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", textAlign: "center", padding: "2rem" }}>Nenhuma trilha cadastrada ainda.</p>
        )}
      </div>
    </div>
  );
}

function LessonsEditor({ programId }: { programId: string }) {
  const { firebaseConfig } = useAppAuth();
  const [lessons, setLessons] = useState<TrainingLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState({ title: "", videoUrl: "", durationMinutes: 0, moduleId: "", materialUrl: "" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetchTrainingLessons(firebaseConfig, programId).then(setLessons).finally(() => setLoading(false));
  }, [firebaseConfig, programId]);

  useEffect(() => { load(); }, [load]);

  async function addLesson() {
    if (!draft.title.trim() || !draft.videoUrl.trim()) return;
    setBusy(true);
    const lesson: TrainingLesson = {
      id: newLessonId(),
      programId,
      moduleId: draft.moduleId.trim() || undefined,
      title: draft.title.trim(),
      videoUrl: draft.videoUrl.trim(),
      durationMinutes: Number(draft.durationMinutes) || 0,
      sortOrder: lessons.length,
      materialUrl: draft.materialUrl.trim() || undefined
    };
    try {
      await saveTrainingLesson(firebaseConfig, lesson);
      setDraft({ title: "", videoUrl: "", durationMinutes: 0, moduleId: "", materialUrl: "" });
      load();
    } finally { setBusy(false); }
  }

  // Salva edições inline de uma aula existente (link de material e/ou conteúdo).
  async function saveLessonPatch(lesson: TrainingLesson, patch: Partial<Pick<TrainingLesson, "materialUrl" | "content">>) {
    const nextMaterial = "materialUrl" in patch ? (patch.materialUrl?.trim() || undefined) : lesson.materialUrl;
    const nextContent = "content" in patch ? (patch.content?.trim() || undefined) : lesson.content;
    const unchanged =
      (lesson.materialUrl ?? "") === (nextMaterial ?? "") &&
      (lesson.content ?? "") === (nextContent ?? "");
    if (unchanged) return;
    setBusy(true);
    try {
      await saveTrainingLesson(firebaseConfig, { ...lesson, materialUrl: nextMaterial, content: nextContent });
      load();
    } finally { setBusy(false); }
  }

  async function removeLesson(id: string) {
    setBusy(true);
    try { await deleteTrainingLesson(firebaseConfig, programId, id); load(); } finally { setBusy(false); }
  }

  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "0.5px solid var(--color-border-tertiary)" }}>
      {loading ? (
        <Loader2 size={16} className="spin" />
      ) : (
        <>
          <div style={{ display: "grid", gap: 6, marginBottom: 10 }}>
            {lessons.map((l, i) => (
              <LessonRow key={l.id} lesson={l} index={i} busy={busy} onSavePatch={saveLessonPatch} onRemove={removeLesson} />
            ))}
            {lessons.length === 0 && <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Sem aulas ainda.</span>}
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 90px 1fr auto", gap: 6, alignItems: "center" }}>
              <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Título da aula" style={{ ...inputStyle, fontSize: 12 }} />
              <input value={draft.videoUrl} onChange={(e) => setDraft({ ...draft, videoUrl: e.target.value })} placeholder="URL do vídeo" style={{ ...inputStyle, fontSize: 12 }} />
              <input type="number" min={0} value={draft.durationMinutes} onChange={(e) => setDraft({ ...draft, durationMinutes: Number(e.target.value) })} placeholder="min" style={{ ...inputStyle, fontSize: 12 }} />
              <input value={draft.moduleId} onChange={(e) => setDraft({ ...draft, moduleId: e.target.value })} placeholder="Módulo (opc.)" style={{ ...inputStyle, fontSize: 12 }} />
              <button onClick={addLesson} disabled={busy} style={primaryBtn}><Plus size={14} /></button>
            </div>
            <input value={draft.materialUrl} onChange={(e) => setDraft({ ...draft, materialUrl: e.target.value })} placeholder="Material de apoio / PDF (link, opcional)" style={{ ...inputStyle, fontSize: 12 }} />
          </div>
        </>
      )}
    </div>
  );
}

function LessonRow({ lesson, index, busy, onSavePatch, onRemove }: {
  lesson: TrainingLesson;
  index: number;
  busy: boolean;
  onSavePatch: (lesson: TrainingLesson, patch: Partial<Pick<TrainingLesson, "materialUrl" | "content">>) => void;
  onRemove: (id: string) => void;
}) {
  const [material, setMaterial] = useState(lesson.materialUrl ?? "");
  const [content, setContent] = useState(lesson.content ?? "");
  const [showContent, setShowContent] = useState(false);
  return (
    <div style={{ display: "grid", gap: 6, fontSize: 12, padding: "8px 10px", background: "var(--color-background-secondary, #f8f8f6)", borderRadius: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: "var(--color-text-secondary)" }}>{index + 1}.</span>
        <span style={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>{lesson.title} <span style={{ color: "var(--color-text-secondary)" }}>· {lesson.durationMinutes}min{lesson.moduleId ? ` · ${lesson.moduleId}` : ""}{lesson.content ? " · 📄 material" : ""}</span></span>
        <button onClick={() => setShowContent((v) => !v)} style={{ ...secondaryBtn, padding: "4px 8px" }}>{showContent ? "Fechar" : "Conteúdo"}</button>
        <button onClick={() => onRemove(lesson.id)} disabled={busy} style={{ ...secondaryBtn, padding: "4px 8px" }}><Trash2 size={13} /></button>
      </div>
      <input
        value={material}
        onChange={(e) => setMaterial(e.target.value)}
        onBlur={() => onSavePatch(lesson, { materialUrl: material })}
        placeholder="📎 Material de apoio / PDF (link, opcional)"
        style={{ ...inputStyle, fontSize: 12, padding: "5px 8px" }}
      />
      {showContent && (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onBlur={() => onSavePatch(lesson, { content })}
          placeholder="Conteúdo / apostila da aula (markdown: ## título, **negrito**, - listas). Salva ao sair do campo."
          style={{ ...inputStyle, fontSize: 12, padding: "8px 10px", minHeight: 160, resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }}
        />
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 4 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)" }}>{label}</span>
      {children}
    </label>
  );
}

const cardStyle: React.CSSProperties = { background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "16px 18px", marginBottom: 12 };
const inputStyle: React.CSSProperties = { padding: "8px 10px", borderRadius: 8, border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 13, width: "100%" };
const primaryBtn: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "none", background: "#534AB7", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" };
const secondaryBtn: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 13, fontWeight: 600, cursor: "pointer" };
