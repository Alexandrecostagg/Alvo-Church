"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft, Plus, Trash2, X, GraduationCap, Video, Layers, Save, Youtube, ChevronRight
} from "lucide-react";
import {
  fetchCourses,
  fetchCourseModules,
  fetchCourseLessons,
  isFirebaseWebRuntimeConfigured
} from "@alvo/firebase";
import type { Course, CourseModule, Lesson } from "@alvo/types";
import { useAppAuth } from "../../../app/providers";

function newId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1e6).toString(36)}`;
}

// Aceita link normal, curto (youtu.be) ou de incorporação do YouTube.
function isProbablyVideoUrl(url: string) {
  try {
    const parsed = new URL(url.trim());
    const host = parsed.hostname.toLowerCase();
    return parsed.protocol === "https:" && ["youtube.com", "www.youtube.com", "youtu.be", "youtube-nocookie.com", "www.youtube-nocookie.com", "vimeo.com", "www.vimeo.com", "player.vimeo.com", "cloudflarestream.com", "videodelivery.net"].some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
  } catch {
    return false;
  }
}

export function CourseManagerView() {
  const { configured, firebaseReady, user, organizationId, firebaseConfig } = useAppAuth();

  const [courses, setCourses] = useState<Course[]>([]);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  // Formulário do curso selecionado (edição do cabeçalho).
  const [courseForm, setCourseForm] = useState({ title: "", description: "", thumbnailUrl: "", instructorName: "", instructorTitle: "" });
  // Novo módulo.
  const [moduleTitle, setModuleTitle] = useState("");
  // Nova aula por módulo (map moduleId -> rascunho).
  const [lessonDraft, setLessonDraft] = useState<Record<string, { title: string; videoUrl: string; durationMinutes: string; materialUrl: string }>>({});
  const [showNewCourse, setShowNewCourse] = useState(false);
  const [newCourse, setNewCourse] = useState({ title: "", description: "" });

  const ready = configured && firebaseReady && user && isFirebaseWebRuntimeConfigured(firebaseConfig);

  useEffect(() => {
    if (!ready) return;
    fetchCourses(firebaseConfig, { organizationId }).then((list) => {
      setCourses(list);
      setSelectedCourseId((cur) => cur ?? list[0]?.id ?? null);
    }).catch((e) => console.error("Falha ao carregar cursos:", e));
  }, [ready, firebaseConfig, organizationId]);

  const selectedCourse = courses.find((c) => c.id === selectedCourseId) ?? null;

  async function managementRequest(body: Record<string, unknown>) {
    if (!user) throw new Error("Entre na sua conta.");
    const response = await fetch("/api/learning/manage", {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` },
      body: JSON.stringify({ organizationId, requestId: crypto.randomUUID(), ...body }),
    });
    const data = await response.json().catch(() => ({})) as Record<string, any>;
    if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Não foi possível alterar o curso.");
    return data;
  }

  // Carrega módulos + aulas do curso selecionado.
  useEffect(() => {
    if (!ready || !selectedCourseId) return;
    setCourseForm({
      title: selectedCourse?.title ?? "",
      description: selectedCourse?.description ?? "",
      thumbnailUrl: selectedCourse?.thumbnailUrl ?? "",
      instructorName: selectedCourse?.instructorName ?? "",
      instructorTitle: selectedCourse?.instructorTitle ?? ""
    });
    Promise.all([
      fetchCourseModules(firebaseConfig, { organizationId }, selectedCourseId),
      fetchCourseLessons(firebaseConfig, { organizationId }, selectedCourseId)
    ]).then(([mods, less]) => {
      setModules(mods);
      setLessons(less);
    }).catch((e) => console.error("Falha ao carregar conteúdo do curso:", e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, selectedCourseId, firebaseConfig, organizationId]);

  const courseModules = modules
    .filter((m) => m.courseId === selectedCourseId)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  async function handleCreateCourse() {
    if (!ready || !newCourse.title.trim()) return;
    setSaving(true);
    const course: Course = {
      id: newId("course"),
      organizationId,
      title: newCourse.title.trim(),
      description: newCourse.description.trim(),
      isActive: false,
      createdAt: new Date().toISOString()
    };
    try {
      const data = await managementRequest({ action: "save_course", courseId: course.id, ...course });
      const saved = data.course as Course;
      setCourses((cur) => [saved, ...cur]);
      setSelectedCourseId(saved.id);
      setNewCourse({ title: "", description: "" });
      setShowNewCourse(false);
      setStatus(`Rascunho "${course.title}" criado.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Não foi possível criar o curso.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveCourse(nextActive = selectedCourse?.isActive ?? false) {
    if (!ready || !selectedCourse || !courseForm.title.trim()) return;
    setSaving(true);
    const updated: Course = {
      ...selectedCourse,
      title: courseForm.title.trim(),
      description: courseForm.description.trim(),
      thumbnailUrl: courseForm.thumbnailUrl.trim() || undefined,
      instructorName: courseForm.instructorName.trim() || undefined,
      instructorTitle: courseForm.instructorTitle.trim() || undefined,
      isActive: nextActive,
    };
    try {
      const data = await managementRequest({ action: "save_course", courseId: updated.id, ...updated });
      const saved = data.course as Course;
      setCourses((cur) => cur.map((c) => (c.id === saved.id ? saved : c)));
      setStatus(saved.isActive ? "Curso publicado e salvo." : "Rascunho salvo.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Não foi possível salvar o curso.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddModule() {
    if (!ready || !selectedCourseId || !moduleTitle.trim()) return;
    const mod: CourseModule = {
      id: newId("mod"),
      organizationId,
      courseId: selectedCourseId,
      title: moduleTitle.trim(),
      sortOrder: courseModules.length
    };
    try {
      const data = await managementRequest({ action: "save_module", courseId: mod.courseId, moduleId: mod.id, title: mod.title, sortOrder: mod.sortOrder });
      setModules((cur) => [...cur, data.module as CourseModule]);
      setModuleTitle("");
      setStatus(`Módulo "${mod.title}" adicionado.`);
    } catch (error) { setStatus(error instanceof Error ? error.message : "Não foi possível adicionar o módulo."); }
  }

  async function handleDeleteModule(mod: CourseModule) {
    if (!ready) return;
    const modLessons = lessons.filter((l) => l.moduleId === mod.id);
    if (!window.confirm(`Excluir o módulo "${mod.title}"${modLessons.length ? ` e suas ${modLessons.length} aula(s)` : ""}?`)) return;
    try {
      await managementRequest({ action: "delete_module", courseId: mod.courseId, moduleId: mod.id });
      setModules((cur) => cur.filter((m) => m.id !== mod.id));
      setLessons((cur) => cur.filter((l) => l.moduleId !== mod.id));
      setStatus(`Módulo "${mod.title}" excluído.`);
    } catch (error) { setStatus(error instanceof Error ? error.message : "Não foi possível excluir todo o módulo."); }
  }

  async function handleAddLesson(mod: CourseModule) {
    if (!ready || !selectedCourseId) return;
    const draft = lessonDraft[mod.id] ?? { title: "", videoUrl: "", durationMinutes: "", materialUrl: "" };
    if (!draft.title.trim() || !isProbablyVideoUrl(draft.videoUrl)) return;
    const moduleLessons = lessons.filter((l) => l.moduleId === mod.id);
    const lesson: Lesson = {
      id: newId("les"),
      organizationId,
      courseId: selectedCourseId,
      moduleId: mod.id,
      title: draft.title.trim(),
      videoUrl: draft.videoUrl.trim(),
      durationMinutes: Number.parseInt(draft.durationMinutes, 10) || 0,
      sortOrder: moduleLessons.length,
      materialUrl: draft.materialUrl.trim() || undefined
    };
    try {
      const data = await managementRequest({ action: "save_lesson", courseId: lesson.courseId, moduleId: lesson.moduleId, lessonId: lesson.id, title: lesson.title, videoUrl: lesson.videoUrl, durationMinutes: lesson.durationMinutes, sortOrder: lesson.sortOrder, materialUrl: lesson.materialUrl ?? "" });
      setLessons((cur) => [...cur, data.lesson as Lesson]);
      setLessonDraft((cur) => ({ ...cur, [mod.id]: { title: "", videoUrl: "", durationMinutes: "", materialUrl: "" } }));
      setStatus(`Aula "${lesson.title}" adicionada.`);
    } catch (error) { setStatus(error instanceof Error ? error.message : "Não foi possível adicionar a aula."); }
  }

  async function handleDeleteLesson(lesson: Lesson) {
    if (!ready) return;
    try {
      await managementRequest({ action: "delete_lesson", courseId: lesson.courseId, lessonId: lesson.id });
      setLessons((cur) => cur.filter((l) => l.id !== lesson.id));
      setStatus(`Aula "${lesson.title}" excluída.`);
    } catch (error) { setStatus(error instanceof Error ? error.message : "Não foi possível excluir a aula."); }
  }

  function setDraft(moduleId: string, patch: Partial<{ title: string; videoUrl: string; durationMinutes: string; materialUrl: string }>) {
    setLessonDraft((cur) => {
      const base = cur[moduleId] ?? { title: "", videoUrl: "", durationMinutes: "", materialUrl: "" };
      return { ...cur, [moduleId]: { ...base, ...patch } };
    });
  }

  return (
    <main className="page-root animate-entrance">
      <Link className="back-link" href="/learning/academy" style={{ display: "inline-flex", marginBottom: 12 }}>
        <ArrowLeft size={14} style={{ marginRight: 6 }} /> Voltar para a Escola
      </Link>
      <header className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Gerenciar Cursos</h1>
          <p className="page-subtitle">
            Crie cursos, módulos e aulas. Grave o vídeo no celular, suba no YouTube como “não listado” e cole o link aqui.
          </p>
        </div>
        <div className="page-header-actions">
          <button className="btn-primary" onClick={() => setShowNewCourse((s) => !s)}>
            {showNewCourse ? <X size={16} /> : <Plus size={16} />} {showNewCourse ? "Fechar" : "Novo curso"}
          </button>
        </div>
      </header>

      {status && <p style={{ fontSize: 13, color: "var(--alvo-ink-soft)", margin: "0 0 12px" }}>{status}</p>}

      {showNewCourse && (
        <section className="content-section">
          <div className="section-header"><h2 className="section-title">Novo curso</h2></div>
          <div style={{ display: "grid", gap: 10, maxWidth: 560 }}>
            <input
              type="text" placeholder="Título do curso (ex: DNA da Liderança)"
              value={newCourse.title} onChange={(e) => setNewCourse((f) => ({ ...f, title: e.target.value }))}
              style={inputStyle}
            />
            <textarea
              placeholder="Descrição breve do curso" rows={2}
              value={newCourse.description} onChange={(e) => setNewCourse((f) => ({ ...f, description: e.target.value }))}
              style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
            />
            <button className="btn-primary" onClick={() => void handleCreateCourse()} disabled={saving || !newCourse.title.trim()} style={{ justifySelf: "start", opacity: saving || !newCourse.title.trim() ? 0.5 : 1 }}>
              <Plus size={16} /> Criar curso
            </button>
          </div>
        </section>
      )}

      <div className="course-manager-grid">
        {/* Lista de cursos */}
        <aside className="content-section" style={{ margin: 0 }}>
          <div className="section-header"><h2 className="section-title">Cursos</h2></div>
          {courses.length === 0 ? (
            <div className="empty-state" style={{ padding: "24px 0" }}>
              <GraduationCap size={32} strokeWidth={1.4} />
              <p>Nenhum curso ainda.</p>
              <button className="btn-primary btn-sm" onClick={() => setShowNewCourse(true)}><Plus size={14} /> Criar o primeiro</button>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {courses.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCourseId(c.id)}
                  style={{
                    textAlign: "left", padding: "12px 14px", borderRadius: 12, cursor: "pointer",
                    border: `1.5px solid ${selectedCourseId === c.id ? "var(--alvo-accent)" : "var(--alvo-line)"}`,
                    background: selectedCourseId === c.id ? "var(--alvo-accent-soft)" : "var(--alvo-surface)",
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8
                  }}
                >
                  <strong style={{ fontSize: 14, color: "var(--alvo-ink)", overflowWrap: "anywhere" }}>{c.title}</strong>
                  <ChevronRight size={15} style={{ color: "var(--alvo-ink-soft)", flexShrink: 0 }} />
                </button>
              ))}
            </div>
          )}
        </aside>

        {/* Editor do curso */}
        <section className="content-section" style={{ margin: 0 }}>
          {!selectedCourse ? (
            <div className="empty-state" style={{ padding: "40px 0" }}>
              <Layers size={36} strokeWidth={1.4} />
              <p>Selecione um curso à esquerda ou crie um novo.</p>
            </div>
          ) : (
            <>
              <div className="section-header"><h2 className="section-title">Editar curso</h2>
                <button className="btn-secondary btn-sm" onClick={() => void handleSaveCourse(!selectedCourse.isActive)} disabled={saving} style={{ color: selectedCourse.isActive ? "#b45309" : "#15803d", display: "flex", alignItems: "center", gap: 4, opacity: saving ? 0.6 : 1 }}>
                  <GraduationCap size={14} /> {selectedCourse.isActive ? "Retirar da Escola" : "Publicar curso"}
                </button>
              </div>

              <div style={{ display: "grid", gap: 10, maxWidth: 640, marginBottom: 24 }}>
                <label style={labelStyle}>Título
                  <input type="text" value={courseForm.title} onChange={(e) => setCourseForm((f) => ({ ...f, title: e.target.value }))} style={inputStyle} />
                </label>
                <label style={labelStyle}>Descrição
                  <textarea rows={2} value={courseForm.description} onChange={(e) => setCourseForm((f) => ({ ...f, description: e.target.value }))} style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />
                </label>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <label style={{ ...labelStyle, flex: 2, minWidth: 200 }}>Professor / Ministrante
                    <input type="text" placeholder="Nome de quem assina o certificado" value={courseForm.instructorName} onChange={(e) => setCourseForm((f) => ({ ...f, instructorName: e.target.value }))} style={inputStyle} />
                  </label>
                  <label style={{ ...labelStyle, flex: 1, minWidth: 130 }}>Cargo (opcional)
                    <input type="text" placeholder="Ex.: Pastor" value={courseForm.instructorTitle} onChange={(e) => setCourseForm((f) => ({ ...f, instructorTitle: e.target.value }))} style={inputStyle} />
                  </label>
                </div>
                <label style={labelStyle}>Imagem de capa (link, opcional)
                  <input type="url" placeholder="https://..." value={courseForm.thumbnailUrl} onChange={(e) => setCourseForm((f) => ({ ...f, thumbnailUrl: e.target.value }))} style={inputStyle} />
                </label>
                <button className="btn-primary" onClick={() => void handleSaveCourse()} disabled={saving} style={{ justifySelf: "start", opacity: saving ? 0.6 : 1 }}>
                  <Save size={16} /> Salvar curso
                </button>
              </div>

              {/* Módulos */}
              <div className="section-header" style={{ marginTop: 8 }}><h3 className="section-title" style={{ fontSize: 16 }}>Módulos e aulas</h3></div>

              {selectedCourse.isActive && (
                <p style={{ fontSize: 13, color: "#92400e", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "10px 12px", maxWidth: 640 }}>
                  Este curso está publicado. Retire-o da Escola antes de alterar módulos ou aulas; o progresso dos alunos será preservado.
                </p>
              )}

              <div style={{ display: "flex", gap: 8, marginBottom: 16, maxWidth: 640 }}>
                <input
                  type="text" placeholder="Nome do módulo (ex: Módulo 1 — O Coração do Líder)"
                  value={moduleTitle} onChange={(e) => setModuleTitle(e.target.value)}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button className="btn-secondary" onClick={() => void handleAddModule()} disabled={selectedCourse.isActive || !moduleTitle.trim()} style={{ opacity: !selectedCourse.isActive && moduleTitle.trim() ? 1 : 0.5, whiteSpace: "nowrap" }}>
                  <Plus size={15} /> Módulo
                </button>
              </div>

              {courseModules.length === 0 ? (
                <div className="empty-state" style={{ padding: "24px 0" }}>
                  <Layers size={30} strokeWidth={1.4} />
                  <p>Nenhum módulo ainda. Adicione o primeiro acima.</p>
                </div>
              ) : (
                <div style={{ display: "grid", gap: 16 }}>
                  {courseModules.map((mod) => {
                    const modLessons = lessons.filter((l) => l.moduleId === mod.id).sort((a, b) => a.sortOrder - b.sortOrder);
                    const draft = lessonDraft[mod.id] ?? { title: "", videoUrl: "", durationMinutes: "", materialUrl: "" };
                    return (
                      <div key={mod.id} style={{ border: "1px solid var(--alvo-line)", borderRadius: 14, padding: 16, background: "var(--alvo-surface)" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 12 }}>
                          <strong style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, color: "var(--alvo-ink)" }}>
                            <Layers size={15} style={{ color: "var(--alvo-accent)" }} /> {mod.title}
                          </strong>
                          <button onClick={() => void handleDeleteModule(mod)} disabled={selectedCourse.isActive} aria-label="Excluir módulo" style={{ background: "none", border: "none", cursor: selectedCourse.isActive ? "not-allowed" : "pointer", color: "#dc2626", opacity: selectedCourse.isActive ? 0.35 : 1 }}>
                            <Trash2 size={15} />
                          </button>
                        </div>

                        {/* Aulas do módulo */}
                        {modLessons.length > 0 && (
                          <div style={{ display: "grid", gap: 6, marginBottom: 12 }}>
                            {modLessons.map((les) => (
                              <div key={les.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 10, background: "var(--alvo-surface-muted, #f8fafc)", border: "1px solid var(--alvo-line)" }}>
                                <Video size={14} style={{ color: "var(--alvo-accent)", flexShrink: 0 }} />
                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <strong style={{ fontSize: 13, color: "var(--alvo-ink)", display: "block", overflowWrap: "anywhere" }}>{les.title}</strong>
                                  <span style={{ fontSize: 11, color: "var(--alvo-ink-soft)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                                    <Youtube size={11} /> {les.durationMinutes} min{les.materialUrl ? " · com material" : ""}
                                  </span>
                                </div>
                                <button onClick={() => void handleDeleteLesson(les)} disabled={selectedCourse.isActive} aria-label="Excluir aula" style={{ background: "none", border: "none", cursor: selectedCourse.isActive ? "not-allowed" : "pointer", color: "#dc2626", flexShrink: 0, opacity: selectedCourse.isActive ? 0.35 : 1 }}>
                                  <X size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Nova aula */}
                        <div style={{ display: "grid", gap: 8, padding: 12, borderRadius: 10, border: "1px dashed var(--alvo-line)" }}>
                          <input type="text" placeholder="Título da aula" value={draft.title} onChange={(e) => setDraft(mod.id, { title: e.target.value })} style={inputStyle} />
                          <input type="url" placeholder="Link do vídeo no YouTube (não listado)" value={draft.videoUrl} onChange={(e) => setDraft(mod.id, { videoUrl: e.target.value })} style={inputStyle} />
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <input type="number" min="0" placeholder="Duração (min)" value={draft.durationMinutes} onChange={(e) => setDraft(mod.id, { durationMinutes: e.target.value })} style={{ ...inputStyle, width: 140 }} />
                            <input type="url" placeholder="Link de material/PDF (opcional)" value={draft.materialUrl} onChange={(e) => setDraft(mod.id, { materialUrl: e.target.value })} style={{ ...inputStyle, flex: 1, minWidth: 180 }} />
                          </div>
                          <button
                            className="btn-primary btn-sm"
                            onClick={() => void handleAddLesson(mod)}
                            disabled={selectedCourse.isActive || !draft.title.trim() || !isProbablyVideoUrl(draft.videoUrl)}
                            style={{ justifySelf: "start", opacity: selectedCourse.isActive || !draft.title.trim() || !isProbablyVideoUrl(draft.videoUrl) ? 0.5 : 1 }}
                          >
                            <Plus size={14} /> Adicionar aula
                          </button>
                          {draft.videoUrl && !isProbablyVideoUrl(draft.videoUrl) && (
                            <span style={{ fontSize: 12, color: "#dc2626" }}>Cole um link completo (começando com https://).</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}

const inputStyle = { padding: "10px 14px", borderRadius: 10, border: "1px solid var(--alvo-line)", fontSize: 14, width: "100%", boxSizing: "border-box" as const, background: "var(--alvo-surface)", color: "var(--alvo-ink)" };
const labelStyle = { display: "grid", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--alvo-ink)" } as const;
