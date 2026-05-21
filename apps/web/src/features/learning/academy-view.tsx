"use client";

import Link from "next/link";
import { ArrowLeft, Play, CheckCircle2, Circle, Award, BookOpen, GraduationCap, Clock, Sparkles, ChevronRight } from "lucide-react";
import { useState, useMemo } from "react";
import { MOCK_COURSES, MOCK_COURSE_MODULES, MOCK_LESSONS, MOCK_MEMBER_COURSE_PROGRESS } from "../../lib/mock-data";

export function AcademyView() {
  const [courses] = useState(MOCK_COURSES);
  const [modules] = useState(MOCK_COURSE_MODULES);
  const [lessons] = useState(MOCK_LESSONS);
  
  // Progresso persistido localmente e reativo
  const [progress, setProgress] = useState(MOCK_MEMBER_COURSE_PROGRESS[0] ?? {
    id: "prog_temp",
    organizationId: "demo",
    memberId: "person_1",
    courseId: "course_1",
    completedLessons: [],
    isCompleted: false,
    updatedAt: new Date().toISOString()
  });

  const [selectedCourseId, setSelectedCourseId] = useState<string>("course_1");
  const [selectedLessonId, setSelectedLessonId] = useState<string>("les_1");
  const [showBadgeUnlock, setShowBadgeUnlock] = useState(false);
  const [unlockedBadge, setUnlockedBadge] = useState<{ id: string; title: string } | null>(null);

  const selectedCourse = useMemo(() => {
    return courses.find(c => c.id === selectedCourseId) ?? courses[0];
  }, [courses, selectedCourseId]);

  const activeModules = useMemo(() => {
    return modules.filter(m => m.courseId === selectedCourse.id).sort((a,b) => a.sortOrder - b.sortOrder);
  }, [modules, selectedCourse]);

  const activeLessons = useMemo(() => {
    return lessons.filter(l => l.courseId === selectedCourse.id).sort((a,b) => a.sortOrder - b.sortOrder);
  }, [lessons, selectedCourse]);

  const selectedLesson = useMemo(() => {
    return lessons.find(l => l.id === selectedLessonId) ?? activeLessons[0] ?? lessons[0];
  }, [lessons, selectedLessonId, activeLessons]);

  // Calcula progresso atual do curso selecionado em porcentagem
  const coursePercent = useMemo(() => {
    const courseLessons = lessons.filter(l => l.courseId === selectedCourse.id);
    if (!courseLessons.length) return 0;
    const completedInCourse = courseLessons.filter(l => progress.completedLessons.includes(l.id)).length;
    return Math.round((completedInCourse / courseLessons.length) * 100);
  }, [lessons, selectedCourse, progress]);

  // Alterna conclusão da aula e checa se destrava Badge
  const handleToggleLesson = (lessonId: string) => {
    const isCompleted = progress.completedLessons.includes(lessonId);
    let nextCompleted = [...progress.completedLessons];

    if (isCompleted) {
      nextCompleted = nextCompleted.filter(id => id !== lessonId);
    } else {
      nextCompleted.push(lessonId);
    }

    const courseLessons = lessons.filter(l => l.courseId === selectedCourse.id);
    const completedInCourse = courseLessons.filter(l => nextCompleted.includes(l.id)).length;
    const allCompleted = completedInCourse === courseLessons.length;

    setProgress(current => ({
      ...current,
      completedLessons: nextCompleted,
      isCompleted: allCompleted,
      updatedAt: new Date().toISOString()
    }));

    // Se completou 100% e não estava marcado como concluído antes, destrava animação da Badge!
    if (allCompleted && !progress.isCompleted && selectedCourse.badgeUnlockedId) {
      setUnlockedBadge({
        id: selectedCourse.badgeUnlockedId,
        title: selectedCourse.title
      });
      setShowBadgeUnlock(true);
    }
  };

  return (
    <main className="form-page serving-page academy-page animate-entrance" style={{ position: "relative" }}>
      
      {/* Overlay Premium de Badge Conquistada (Micro-Interação / Gamificação) */}
      {showBadgeUnlock && unlockedBadge && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.95)",
            zIndex: 100,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(8px)"
          }}
          className="animate-entrance"
        >
          <div
            style={{
              background: "linear-gradient(135deg, #1e293b, #0f172a)",
              border: "2px solid #facc15",
              borderRadius: 32,
              padding: "3rem",
              textAlign: "center",
              maxWidth: 500,
              boxShadow: "0 25px 50px -12px rgba(250, 204, 21, 0.25)"
            }}
          >
            <div style={{ display: "inline-block", padding: "1.5rem", borderRadius: "50%", backgroundColor: "rgba(250, 204, 21, 0.15)", marginBottom: "1.5rem" }}>
              <Award size={64} style={{ color: "#facc15" }} className="antigravity-float" />
            </div>
            <p className="eyebrow" style={{ color: "#facc15", letterSpacing: 2 }}>JORNADA ATUALIZADA</p>
            <h2 style={{ fontSize: "2rem", color: "white", fontWeight: 800, margin: "0.5rem 0" }}>Nova Badge Conquistada!</h2>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.95rem", lineHeight: "1.5rem" }}>
              Parabéns! Você concluiu com excelência o curso <strong>{unlockedBadge.title}</strong> e desbloqueou a credencial correspondente na sua identidade pastoral.
            </p>
            <div style={{ marginTop: "2rem", display: "flex", gap: "1rem" }}>
              <button
                onClick={() => setShowBadgeUnlock(false)}
                className="primary-button full"
                style={{ backgroundColor: "#facc15", color: "#0f172a", padding: "0.85rem", fontWeight: 800 }}
                type="button"
              >
                <Sparkles size={16} />
                Continuar Crescendo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero Header */}
      <section className="serving-hero" style={{ paddingBottom: "1.5rem" }}>
        <div>
          <Link className="back-link" href="/">
            Voltar ao painel
          </Link>
          <p className="eyebrow" style={{ color: "#f97316" }}>LMS / Escola de Discipulado</p>
          <h1>Escola de Líderes Alvo</h1>
          <p>
            Capacitação contínua para liderança, multiplicação de células e maturidade cristã.
          </p>
        </div>
      </section>

      {/* Seletor de Cursos Netflix-Style */}
      <section style={{ marginBottom: "2.5rem" }}>
        <p className="eyebrow" style={{ marginBottom: "1rem" }}>Cursos Disponíveis</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "1.5rem" }}>
          {courses.map(course => {
            const isSelected = selectedCourseId === course.id;
            return (
              <button
                key={course.id}
                onClick={() => {
                  setSelectedCourseId(course.id);
                  const courseLessons = lessons.filter(l => l.courseId === course.id);
                  if (courseLessons.length) {
                    setSelectedLessonId(courseLessons[0].id);
                  }
                }}
                className={`volunteer-card ${isSelected ? "is-selected" : ""}`}
                style={{
                  width: "100%",
                  textAlign: "left",
                  background: isSelected ? "linear-gradient(135deg, rgba(249, 115, 22, 0.15), rgba(30, 41, 59, 0.5))" : "rgba(30, 41, 59, 0.5)",
                  border: isSelected ? "2px solid #f97316" : "1px solid rgba(255,255,255,0.05)",
                  borderRadius: 20,
                  padding: "1.5rem",
                  cursor: "pointer",
                  display: "flex",
                  gap: "1rem",
                  transition: "all 0.3s"
                }}
              >
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 12,
                    backgroundImage: `url(${course.thumbnailUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    flexShrink: 0
                  }}
                />
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1 }}>
                  <div>
                    <strong style={{ color: "white", fontSize: "1rem", display: "block" }}>{course.title}</strong>
                    <p style={{ fontSize: "0.8rem", opacity: 0.6, marginTop: 4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{course.description}</p>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: 4, fontWeight: 700 }}>
                      <span style={{ color: isSelected ? "#f97316" : "white" }}>Progresso</span>
                      <span>{course.id === selectedCourse.id ? coursePercent : 0}%</span>
                    </div>
                    <div style={{ width: "100%", height: 6, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: `${course.id === selectedCourse.id ? coursePercent : 0}%`, height: "100%", backgroundColor: "#f97316", borderRadius: 3 }} />
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Workbench: Player de Vídeo e Grade de Aulas */}
      <section className="serving-workbench" style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "2.5rem" }}>
        
        {/* Lado Esquerdo: Player de Vídeo Imersivo */}
        <article className="serving-panel" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column", gap: "1.5rem", background: "transparent", border: "none", boxShadow: "none" }}>
          {selectedLesson ? (
            <>
              {/* Moldura Imersiva do Player */}
              <div
                style={{
                  width: "100%",
                  aspectRatio: "16/9",
                  borderRadius: 24,
                  overflow: "hidden",
                  boxShadow: "0 20px 40px -15px rgba(0,0,0,0.7)",
                  position: "relative",
                  background: "#090d16",
                  border: "1px solid rgba(255,255,255,0.05)"
                }}
              >
                {/* Embed Real de Vimeo com fallback elegante */}
                <iframe
                  src={`${selectedLesson.videoUrl}?badge=0&amp;autopause=0&amp;player_id=0&amp;app_id=58479`}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    border: "none"
                  }}
                  allow="autoplay; fullscreen; picture-in-picture; clipboard-write"
                  title={selectedLesson.title}
                />
              </div>

              {/* Detalhes da Aula Abaixo do Player */}
              <div
                style={{
                  background: "rgba(30, 41, 59, 0.4)",
                  border: "1px solid rgba(255, 255, 255, 0.05)",
                  borderRadius: 24,
                  padding: "2rem"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                  <div>
                    <span className="eyebrow" style={{ color: "#f97316", display: "flex", alignItems: "center", gap: 6 }}>
                      <GraduationCap size={14} />
                      AULA EM EXIBIÇÃO
                    </span>
                    <h2 style={{ fontSize: "1.75rem", fontWeight: 800, color: "white", margin: "0.25rem 0 0.5rem" }}>
                      {selectedLesson.title}
                    </h2>
                    <div style={{ display: "flex", gap: "1rem", color: "rgba(255,255,255,0.5)", fontSize: "0.85rem" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Clock size={14} />
                        {selectedLesson.durationMinutes} minutos
                      </span>
                      <span>•</span>
                      <span>Escola de Líderes Oficial</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleLesson(selectedLesson.id)}
                    className="primary-button"
                    style={{
                      backgroundColor: progress.completedLessons.includes(selectedLesson.id) ? "#10b981" : "#f97316",
                      color: "white",
                      padding: "0.75rem 1.25rem",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontWeight: 700
                    }}
                    type="button"
                  >
                    <CheckCircle2 size={16} />
                    {progress.completedLessons.includes(selectedLesson.id) ? "Concluída!" : "Concluir Aula"}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <strong>Selecione uma aula</strong>
              <p>Escolha a aula na barra lateral para começar a assistir.</p>
            </div>
          )}
        </article>

        {/* Lado Direito: Estrutura Modular das Aulas */}
        <aside className="serving-panel" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div>
            <p className="eyebrow">Módulos do Curso</p>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "white" }}>Conteúdo Curricular</h3>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", overflowY: "auto", maxHeight: "550px" }}>
            {activeModules.map(module => {
              const moduleLessons = activeLessons.filter(l => l.moduleId === module.id);
              return (
                <div key={module.id} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <div style={{ paddingBottom: 6, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <strong style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.8)" }}>{module.title}</strong>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {moduleLessons.map(lesson => {
                      const isPlaying = selectedLessonId === lesson.id;
                      const isCompleted = progress.completedLessons.includes(lesson.id);
                      return (
                        <button
                          key={lesson.id}
                          onClick={() => setSelectedLessonId(lesson.id)}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            padding: "0.85rem 1rem",
                            borderRadius: 12,
                            backgroundColor: isPlaying ? "rgba(249, 115, 22, 0.1)" : "transparent",
                            border: isPlaying ? "1px solid rgba(249, 115, 22, 0.3)" : "1px solid transparent",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.75rem",
                            cursor: "pointer",
                            transition: "all 0.2s"
                          }}
                          type="button"
                        >
                          <span onClick={(e) => {
                            e.stopPropagation();
                            handleToggleLesson(lesson.id);
                          }}>
                            {isCompleted ? (
                              <CheckCircle2 size={18} style={{ color: "#10b981" }} />
                            ) : (
                              <Circle size={18} style={{ color: "rgba(255,255,255,0.3)" }} />
                            )}
                          </span>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: "0.85rem", color: isPlaying ? "#f97316" : "white", fontWeight: isPlaying ? 700 : 500, display: "block" }}>
                              {lesson.title}
                            </span>
                            <span style={{ fontSize: "0.7rem", opacity: 0.5 }}>{lesson.durationMinutes} min</span>
                          </div>
                          {isPlaying && <ChevronRight size={14} style={{ color: "#f97316" }} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

      </section>
    </main>
  );
}
