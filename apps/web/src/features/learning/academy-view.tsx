"use client";

import Link from "next/link";
import { 
  ArrowLeft, 
  Play, 
  CheckCircle2, 
  Circle, 
  Award, 
  BookOpen, 
  GraduationCap, 
  Clock, 
  Sparkles, 
  ChevronRight, 
  Download, 
  FileText, 
  Lock, 
  User, 
  Check, 
  Printer 
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { MOCK_COURSES, MOCK_COURSE_MODULES, MOCK_LESSONS, MOCK_MEMBER_COURSE_PROGRESS } from "../../lib/mock-data";
import { useAppAuth } from "../../../app/providers";
import { 
  fetchCourses, 
  fetchCourseModules, 
  fetchCourseLessons, 
  fetchMemberCourseProgress, 
  saveMemberCourseProgress, 
  saveCourse, 
  saveCourseModule, 
  saveLesson, 
  saveMemberBadge, 
  isFirebaseWebRuntimeConfigured 
} from "@alvo/firebase";
import type { Course, CourseModule, Lesson, MemberCourseProgress, MemberBadge } from "@alvo/types";

export function AcademyView() {
  const { configured, firebaseReady, user, organizationId, firebaseConfig } = useAppAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [status, setStatus] = useState("Sincronizando com Firestore...");
  const [progress, setProgress] = useState<MemberCourseProgress>({
    id: `progress_temp`,
    organizationId: "demo",
    memberId: "person_1",
    courseId: "course_1",
    completedLessons: [],
    isCompleted: false,
    updatedAt: new Date().toISOString()
  });

  const [selectedCourseId, setSelectedCourseId] = useState<string>("course_1");
  const [selectedLessonId, setSelectedLessonId] = useState<string>("les_1");
  const [activeTab, setActiveTab] = useState<"about" | "materials" | "notes" | "instructor" | "certificate">("about");
  const [lessonNote, setLessonNote] = useState<string>("");
  const [showBadgeUnlock, setShowBadgeUnlock] = useState(false);
  const [unlockedBadge, setUnlockedBadge] = useState<{ id: string; title: string } | null>(null);
  const [showCertificateModal, setShowCertificateModal] = useState(false);

  useEffect(() => {
    if (!configured || !firebaseReady || !user || !isFirebaseWebRuntimeConfigured(firebaseConfig)) {
      setCourses(MOCK_COURSES as Course[]);
      setModules(MOCK_COURSE_MODULES as CourseModule[]);
      setLessons(MOCK_LESSONS as Lesson[]);
      setProgress(MOCK_MEMBER_COURSE_PROGRESS[0] as MemberCourseProgress);
      setStatus("Exibindo cursos em modo offline.");
      return;
    }

    let cancelled = false;

    async function loadLmsData() {
      if (!user) return;
      try {
        setStatus("Sincronizando com o Firestore...");
        let dbCourses = await fetchCourses(firebaseConfig, { organizationId });
        if (cancelled) return;

        if (dbCourses.length === 0) {
          setStatus("Inicializando cursos padrões no Firestore...");
          // Seed EAD courses, modules, and lessons
          await Promise.all(
            MOCK_COURSES.map(async (c) => {
              await saveCourse(firebaseConfig, { organizationId }, { ...c, organizationId });
            })
          );
          await Promise.all(
            MOCK_COURSE_MODULES.map(async (m) => {
              await saveCourseModule(firebaseConfig, { organizationId }, { ...m, organizationId });
            })
          );
          await Promise.all(
            MOCK_LESSONS.map(async (l) => {
              await saveLesson(firebaseConfig, { organizationId }, { ...l, organizationId });
            })
          );

          if (cancelled) return;
          dbCourses = await fetchCourses(firebaseConfig, { organizationId });
          if (cancelled) return;
        }

        const [dbModules, dbLessons] = await Promise.all([
          Promise.all(dbCourses.map(c => fetchCourseModules(firebaseConfig, { organizationId }, c.id))),
          Promise.all(dbCourses.map(c => fetchCourseLessons(firebaseConfig, { organizationId }, c.id)))
        ]);

        if (cancelled) return;

        setCourses(dbCourses);
        setModules(dbModules.flat());
        setLessons(dbLessons.flat());

        // Load progress for selected course
        const dbProgress = await fetchMemberCourseProgress(firebaseConfig, { organizationId }, user.uid, selectedCourseId);
        if (cancelled) return;

        if (dbProgress) {
          setProgress(dbProgress);
        } else {
          // Initialize empty progress for this course
          const initialProg: MemberCourseProgress = {
            id: `progress_${user.uid}_${selectedCourseId}`,
            organizationId,
            memberId: user.uid,
            courseId: selectedCourseId,
            completedLessons: [],
            isCompleted: false,
            updatedAt: new Date().toISOString()
          };
          setProgress(initialProg);
        }

        setStatus("EAD Sincronizado.");
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setCourses(MOCK_COURSES as Course[]);
          setModules(MOCK_COURSE_MODULES as CourseModule[]);
          setLessons(MOCK_LESSONS as Lesson[]);
          setProgress(MOCK_MEMBER_COURSE_PROGRESS[0] as MemberCourseProgress);
          setStatus("Erro ao sincronizar. Usando modo de demonstração.");
        }
      }
    }

    void loadLmsData();

    return () => {
      cancelled = true;
    };
  }, [configured, firebaseConfig, firebaseReady, organizationId, user, selectedCourseId]);

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

  const isCourseCompleted = useMemo(() => {
    return coursePercent === 100;
  }, [coursePercent]);

  // Carrega nota salva no LocalStorage quando a aula selecionada mudar
  useEffect(() => {
    if (selectedLesson) {
      const savedNote = localStorage.getItem(`alvo_ead_notes_${selectedLesson.id}`) ?? "";
      setLessonNote(savedNote);
    }
  }, [selectedLessonId, selectedLesson]);

  // Salva nota no LocalStorage automaticamente ao digitar
  const handleNoteChange = (text: string) => {
    setLessonNote(text);
    if (selectedLesson) {
      localStorage.setItem(`alvo_ead_notes_${selectedLesson.id}`, text);
    }
  };

  // Exporta nota da aula ativa como arquivo .txt
  const handleExportNote = () => {
    if (!selectedLesson) return;
    const element = document.createElement("a");
    const file = new Blob([
      `ANOTAÇÕES DE AULA - ALVO CHURCH EAD\n`,
      `Curso: ${selectedCourse.title}\n`,
      `Aula: ${selectedLesson.title}\n`,
      `Data de Exportação: ${new Date().toLocaleDateString('pt-BR')}\n`,
      `--------------------------------------------------\n\n`,
      lessonNote || "Sem anotações escritas para esta aula."
    ], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `Anotacoes_${selectedLesson.title.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Alterna conclusão da aula e checa se destrava Badge/Certificado
  const handleToggleLesson = async (lessonId: string) => {
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

    const nextProgress: MemberCourseProgress = {
      ...progress,
      completedLessons: nextCompleted,
      isCompleted: allCompleted,
      updatedAt: new Date().toISOString()
    };

    setProgress(nextProgress);

    if (configured && firebaseReady && user && isFirebaseWebRuntimeConfigured(firebaseConfig)) {
      try {
        await saveMemberCourseProgress(firebaseConfig, { organizationId }, nextProgress);
      } catch (err) {
        console.error(err);
      }
    }

    // Se completou 100% e não estava marcado como concluído antes, destrava animação da Badge!
    if (allCompleted && !progress.isCompleted && selectedCourse.badgeUnlockedId) {
      setUnlockedBadge({
        id: selectedCourse.badgeUnlockedId,
        title: selectedCourse.title
      });
      setShowBadgeUnlock(true);

      if (configured && firebaseReady && user && isFirebaseWebRuntimeConfigured(firebaseConfig)) {
        try {
          const badgeToAward: MemberBadge = {
            id: `mb_${user.uid}_${selectedCourse.badgeUnlockedId}`,
            organizationId,
            personId: user.uid,
            badgeId: selectedCourse.badgeUnlockedId,
            awardedAt: new Date().toISOString()
          };
          await saveMemberBadge(firebaseConfig, { organizationId }, badgeToAward);
        } catch (err) {
          console.error("Failed to save member badge:", err);
        }
      }
    }
  };

  // Abre janela de impressão do certificado
  const handlePrintCertificate = () => {
    window.print();
  };

  return (
    <main className="form-page serving-page academy-page animate-entrance" style={{ position: "relative" }}>
      
      {/* CSS para Impressão Exclusiva do Certificado */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .printable-certificate, .printable-certificate * {
            visibility: visible;
          }
          .printable-certificate {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100vh;
            display: flex !important;
            align-items: center;
            justify-content: center;
            background: white !important;
            color: black !important;
            border: none !important;
            box-shadow: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

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
            <p className="eyebrow" style={{ color: "#facc15", letterSpacing: 2 }}>JORNADA DE LIDERANÇA</p>
            <h2 style={{ fontSize: "2rem", color: "white", fontWeight: 800, margin: "0.5rem 0" }}>Curso Concluído!</h2>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.95rem", lineHeight: "1.5rem" }}>
              Parabéns! Você concluiu com excelência o curso <strong>{unlockedBadge.title}</strong> e desbloqueou seu **Certificado de Conclusão** correspondente na sua identidade ministerial.
            </p>
            <div style={{ marginTop: "2rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <button
                onClick={() => {
                  setShowBadgeUnlock(false);
                  setActiveTab("certificate");
                  setShowCertificateModal(true);
                }}
                className="primary-button"
                style={{ backgroundColor: "#facc15", color: "#0f172a", padding: "0.85rem", fontWeight: 800, width: "100%" }}
                type="button"
              >
                <Sparkles size={16} />
                Visualizar Certificado
              </button>
              <button
                onClick={() => setShowBadgeUnlock(false)}
                className="secondary-button"
                style={{ color: "white", borderColor: "rgba(255,255,255,0.2)", padding: "0.85rem", width: "100%" }}
                type="button"
              >
                Voltar à Aula
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Certificado de Conclusão */}
      {showCertificateModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(9, 13, 22, 0.9)",
            zIndex: 110,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(12px)",
            padding: "2rem"
          }}
          className="animate-entrance"
        >
          <div
            style={{
              background: "white",
              borderRadius: 24,
              padding: "2.5rem",
              maxWidth: 900,
              width: "100%",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
              display: "flex",
              flexDirection: "column",
              gap: "2rem"
            }}
          >
            {/* Certificado Visual (Imprimível) */}
            <div 
              className="printable-certificate"
              style={{
                border: "12px double var(--alvo-blue)",
                padding: "3rem 2rem",
                textAlign: "center",
                background: "#fdfbfa",
                color: "#1e293b",
                fontFamily: "'Playfair Display', Georgia, serif",
                position: "relative",
                borderRadius: 8
              }}
            >
              {/* Selo no fundo */}
              <div style={{ position: "absolute", bottom: "2rem", right: "2rem", opacity: 0.15 }}>
                <GraduationCap size={150} style={{ color: "var(--alvo-blue)" }} />
              </div>

              <div style={{ display: "flex", justifyContent: "center", marginBottom: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <GraduationCap size={32} style={{ color: "var(--alvo-blue)" }} />
                  <span style={{ fontWeight: 800, fontSize: "1.2rem", letterSpacing: 3, textTransform: "uppercase", color: "#1e293b" }}>ALVO CHURCH ACADEMY</span>
                </div>
              </div>

              <h1 style={{ fontSize: "2.5rem", color: "#1e293b", fontFamily: "Georgia, serif", margin: "1rem 0 0.5rem 0", fontWeight: 700 }}>
                CERTIFICADO DE CONCLUSÃO
              </h1>
              <p style={{ fontStyle: "italic", fontSize: "1.1rem", color: "#64748b", margin: 0 }}>
                Este documento certifica com honras e mérito que
              </p>

              <h2 style={{ fontSize: "2.25rem", color: "var(--alvo-blue)", fontWeight: 800, margin: "1.5rem 0", fontFamily: "Helvetica, Arial, sans-serif", borderBottom: "2px solid #e2e8f0", display: "inline-block", paddingBottom: "0.5rem", minWidth: "300px" }}>
                Lucas Costa
              </h2>

              <p style={{ fontSize: "1.05rem", lineHeight: "1.8", color: "#334155", maxWidth: "680px", margin: "0 auto" }}>
                concluiu com êxito e total dedicação todas as etapas curriculares do curso livre de capacitação acadêmica ministerial e liderança eclesiástica:
              </p>

              <h3 style={{ fontSize: "1.5rem", color: "#1e293b", fontWeight: 700, margin: "1rem 0" }}>
                {selectedCourse.title}
              </h3>

              <p style={{ fontSize: "0.95rem", color: "#64748b", margin: "1rem 0" }}>
                Outorgado em {new Date().toLocaleDateString('pt-BR')} com carga horária oficial de 24 horas curriculares.
              </p>

              <div style={{ display: "flex", justifyContent: "space-around", marginTop: "3rem", borderTop: "1px dashed #cbd5e1", paddingTop: "1.5rem" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ height: "40px", fontStyle: "italic", color: "var(--alvo-blue)", fontSize: "1.2rem", fontWeight: 600 }}>Getro Costa</div>
                  <div style={{ width: "200px", height: "1px", backgroundColor: "#94a3b8", margin: "0.25rem 0" }} />
                  <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "#64748b" }}>Pr. Getro Costa · Diretor Geral</span>
                </div>
                <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <Award size={36} style={{ color: "var(--alvo-blue)" }} />
                  <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "#64748b", marginTop: 8 }}>Selo de Excelência Alvo</span>
                </div>
              </div>
            </div>

            {/* Ações da Janela */}
            <div className="no-print" style={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
              <button
                onClick={() => setShowCertificateModal(false)}
                className="secondary-button"
                style={{ padding: "0.75rem 1.5rem", borderRadius: 12 }}
              >
                Fechar Painel
              </button>
              <button
                onClick={handlePrintCertificate}
                className="primary-button"
                style={{ backgroundColor: "var(--alvo-blue)", color: "white", padding: "0.75rem 1.5rem", borderRadius: 12, display: "flex", alignItems: "center", gap: 8 }}
              >
                <Printer size={16} />
                Imprimir ou Salvar PDF
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
          <p className="eyebrow" style={{ color: "var(--alvo-blue)" }}>LMS / Escola de Discipulado</p>
          <h1>Escola de Líderes Alvo</h1>
          <p>
            Capacitação contínua para liderança de células, pastoreio de tribos e alta maturidade teológica.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
            <span className={`sync-pulse ${configured && firebaseReady ? 'active' : 'simulated'}`}></span>
            <span style={{ fontSize: "0.75rem", fontWeight: 800, color: configured && firebaseReady ? 'var(--alvo-blue)' : '#f59e0b', letterSpacing: "0.03em" }}>
              {status.toUpperCase()}
            </span>
          </div>
        </div>
      </section>

      {/* Seletor de Cursos Netflix-Style */}
      <section style={{ marginBottom: "2.5rem" }}>
        <p className="eyebrow" style={{ marginBottom: "1rem" }}>Cursos Disponíveis</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 360px), 1fr))", gap: "1.5rem" }}>
          {courses.map(course => {
            const isSelected = selectedCourseId === course.id;
            const currentCourseLessons = lessons.filter(l => l.courseId === course.id);
            const currentCompletedInCourse = currentCourseLessons.filter(l => progress.completedLessons.includes(l.id)).length;
            const currentCoursePercent = currentCourseLessons.length ? Math.round((currentCompletedInCourse / currentCourseLessons.length) * 100) : 0;
            const isDone = currentCoursePercent === 100;

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
                  background: isSelected ? "linear-gradient(135deg, var(--alvo-blue-soft), var(--glass-bg))" : "var(--glass-bg)",
                  border: isSelected ? "2px solid var(--alvo-blue)" : "1px solid var(--alvo-line)",
                  borderRadius: 20,
                  padding: "1.5rem",
                  cursor: "pointer",
                  display: "flex",
                  gap: "1.25rem",
                  transition: "all 0.3s",
                  boxShadow: isSelected ? "0 10px 25px -10px rgba(6, 182, 212, 0.25)" : "none",
                  whiteSpace: "normal"
                }}
              >
                <div
                  style={{
                    width: 90,
                    height: 90,
                    borderRadius: 14,
                    backgroundImage: `url(${course.thumbnailUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    flexShrink: 0,
                    position: "relative"
                  }}
                >
                  {isDone && (
                    <div style={{ position: "absolute", top: -6, right: -6, backgroundColor: "#10b981", borderRadius: "50%", padding: 3, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #1e293b" }}>
                      <Check size={12} color="white" strokeWidth={3} />
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, minWidth: 0 }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <strong style={{ color: "white", fontSize: "1rem", display: "block", fontWeight: 700 }}>{course.title}</strong>
                    </div>
                    <p style={{ fontSize: "0.8rem", opacity: 0.6, marginTop: 4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{course.description}</p>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: 4, fontWeight: 700 }}>
                      <span style={{ color: isSelected ? "var(--alvo-blue)" : "white" }}>Progresso</span>
                      <span>{currentCoursePercent}%</span>
                    </div>
                    <div style={{ width: "100%", height: 6, backgroundColor: "var(--alvo-line)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: `${currentCoursePercent}%`, height: "100%", backgroundColor: isDone ? "#10b981" : "var(--alvo-blue)", borderRadius: 3 }} />
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
              {/* Moldura Imersiva do Player (Netflix Style) */}
              <div
                style={{
                  width: "100%",
                  aspectRatio: "16/9",
                  borderRadius: 24,
                  overflow: "hidden",
                  boxShadow: "0 25px 60px -20px rgba(0,0,0,0.85)",
                  position: "relative",
                  background: "#090d16",
                  border: "1px solid rgba(255,255,255,0.08)"
                }}
              >
                {/* Efeito luminoso de fundo */}
                <div style={{ position: "absolute", width: "100%", height: "100%", background: "radial-gradient(circle at center, rgba(6, 182, 212, 0.08) 0%, transparent 70%)", pointerEvents: "none", zIndex: 1 }} />

                <iframe
                  src={`${selectedLesson.videoUrl}?badge=0&amp;autopause=0&amp;player_id=0&amp;app_id=58479`}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    border: "none",
                    zIndex: 2
                  }}
                  allow="autoplay; fullscreen; picture-in-picture; clipboard-write"
                  title={selectedLesson.title}
                />
              </div>

              {/* Título e Ação rápida abaixo do Player */}
              <div
                style={{
                  background: "var(--glass-bg)",
                  border: "1px solid var(--alvo-line)",
                  borderRadius: 24,
                  padding: "1.75rem 2rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "1.5rem"
                }}
              >
                <div>
                  <span className="eyebrow" style={{ color: "var(--alvo-blue)", display: "flex", alignItems: "center", gap: 6, margin: 0 }}>
                    <GraduationCap size={14} />
                    EXIBINDO AGORA
                  </span>
                  <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "white", margin: "0.25rem 0" }}>
                    {selectedLesson.title}
                  </h2>
                  <div style={{ display: "flex", gap: "1rem", color: "rgba(255,255,255,0.5)", fontSize: "0.85rem" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <Clock size={14} />
                      {selectedLesson.durationMinutes} minutos
                    </span>
                    <span>•</span>
                    <span>Curso Oficial Alvo Academy</span>
                  </div>
                </div>

                <button
                  onClick={() => handleToggleLesson(selectedLesson.id)}
                  className="primary-button"
                  style={{
                    backgroundColor: progress.completedLessons.includes(selectedLesson.id) ? "#10b981" : "var(--alvo-blue)",
                    color: "white",
                    padding: "0.85rem 1.5rem",
                    borderRadius: 14,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontWeight: 700,
                    transition: "all 0.2s"
                  }}
                  type="button"
                >
                  <CheckCircle2 size={18} />
                  {progress.completedLessons.includes(selectedLesson.id) ? "Aula Concluída" : "Marcar como Concluída"}
                </button>
              </div>

              {/* Sistema de Abas Premium (Tabs) */}
              <div
                style={{
                  background: "var(--glass-bg)",
                  border: "1px solid var(--alvo-line)",
                  borderRadius: 24,
                  padding: "2rem",
                  marginTop: "0.5rem"
                }}
              >
                <div style={{ display: "flex", gap: "0.75rem", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "1rem", marginBottom: "1.5rem", overflowX: "auto" }}>
                  <button
                    onClick={() => setActiveTab("about")}
                    style={{
                      padding: "0.5rem 1rem",
                      borderRadius: 10,
                      background: activeTab === "about" ? "var(--alvo-blue-soft)" : "transparent",
                      border: "none",
                      color: activeTab === "about" ? "var(--alvo-blue)" : "rgba(255,255,255,0.6)",
                      fontWeight: 700,
                      cursor: "pointer",
                      fontSize: "0.9rem",
                      transition: "all 0.2s"
                    }}
                  >
                    Sobre o Curso
                  </button>
                  <button
                    onClick={() => setActiveTab("materials")}
                    style={{
                      padding: "0.5rem 1rem",
                      borderRadius: 10,
                      background: activeTab === "materials" ? "var(--alvo-blue-soft)" : "transparent",
                      border: "none",
                      color: activeTab === "materials" ? "var(--alvo-blue)" : "rgba(255,255,255,0.6)",
                      fontWeight: 700,
                      cursor: "pointer",
                      fontSize: "0.9rem",
                      transition: "all 0.2s"
                    }}
                  >
                    Materiais de Apoio
                  </button>
                  <button
                    onClick={() => setActiveTab("notes")}
                    style={{
                      padding: "0.5rem 1rem",
                      borderRadius: 10,
                      background: activeTab === "notes" ? "var(--alvo-blue-soft)" : "transparent",
                      border: "none",
                      color: activeTab === "notes" ? "var(--alvo-blue)" : "rgba(255,255,255,0.6)",
                      fontWeight: 700,
                      cursor: "pointer",
                      fontSize: "0.9rem",
                      transition: "all 0.2s"
                    }}
                  >
                    Bloco de Notas
                  </button>
                  <button
                    onClick={() => setActiveTab("instructor")}
                    style={{
                      padding: "0.5rem 1rem",
                      borderRadius: 10,
                      background: activeTab === "instructor" ? "var(--alvo-blue-soft)" : "transparent",
                      border: "none",
                      color: activeTab === "instructor" ? "var(--alvo-blue)" : "rgba(255,255,255,0.6)",
                      fontWeight: 700,
                      cursor: "pointer",
                      fontSize: "0.9rem",
                      transition: "all 0.2s"
                    }}
                  >
                    Instrutor
                  </button>
                  <button
                    onClick={() => setActiveTab("certificate")}
                    style={{
                      padding: "0.5rem 1rem",
                      borderRadius: 10,
                      background: activeTab === "certificate" ? "var(--alvo-blue-soft)" : "transparent",
                      border: "none",
                      color: activeTab === "certificate" ? "var(--alvo-blue)" : "rgba(255,255,255,0.6)",
                      fontWeight: 700,
                      cursor: "pointer",
                      fontSize: "0.9rem",
                      transition: "all 0.2s",
                      display: "flex",
                      alignItems: "center",
                      gap: 6
                    }}
                  >
                    {isCourseCompleted ? (
                      <Award size={15} style={{ color: "#10b981" }} />
                    ) : (
                      <Lock size={13} />
                    )}
                    Certificado
                  </button>
                </div>

                {/* Conteúdo dinâmico das Abas */}
                <div className="tab-content" style={{ minHeight: "150px" }}>
                  {activeTab === "about" && (
                    <div style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.95rem", lineHeight: "1.6" }}>
                      <h4 style={{ color: "white", fontSize: "1.1rem", marginBottom: "0.5rem", fontWeight: 700 }}>Descrição do Aprendizado</h4>
                      <p>{selectedCourse.description}</p>
                      <h5 style={{ color: "white", marginTop: "1rem", fontWeight: 700 }}>O que você vai dominar:</h5>
                      <ul style={{ paddingLeft: "1.2rem", marginTop: "0.5rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                        <li>Gestão pastoral de pequenos grupos</li>
                        <li>Pastoreamento e aconselhamento prático</li>
                        <li>Multiplicação saudável e evangelismo</li>
                        <li>Gestão emocional do líder de célula</li>
                      </ul>
                    </div>
                  )}

                  {activeTab === "materials" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                      <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.9rem" }}>Faça download dos materiais e guias oficiais para acompanhar o seu aprendizado nas células:</p>
                      
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                        <a 
                          href="#"
                          onClick={(e) => { e.preventDefault(); alert("Download do Guia de Estudo iniciado!"); }}
                          style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "1rem", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 14, textDecoration: "none", color: "white", transition: "all 0.2s" }}
                          className="hover-card"
                        >
                          <div style={{ padding: "0.5rem", background: "var(--alvo-blue-soft)", borderRadius: 10 }}>
                            <FileText size={20} style={{ color: "var(--alvo-blue)" }} />
                          </div>
                          <div>
                            <span style={{ fontSize: "0.85rem", fontWeight: 700, display: "block" }}>Guia de Leitura DNA.pdf</span>
                            <span style={{ fontSize: "0.75rem", opacity: 0.5 }}>PDF (4.8 MB)</span>
                          </div>
                        </a>

                        <a 
                          href="#"
                          onClick={(e) => { e.preventDefault(); alert("Download das Lâminas de Aula iniciado!"); }}
                          style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "1rem", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 14, textDecoration: "none", color: "white", transition: "all 0.2s" }}
                          className="hover-card"
                        >
                          <div style={{ padding: "0.5rem", background: "rgba(16, 185, 129, 0.15)", borderRadius: 10 }}>
                            <BookOpen size={20} style={{ color: "#10b981" }} />
                          </div>
                          <div>
                            <span style={{ fontSize: "0.85rem", fontWeight: 700, display: "block" }}>Slides e Exercícios.pdf</span>
                            <span style={{ fontSize: "0.75rem", opacity: 0.5 }}>PDF (12.4 MB)</span>
                          </div>
                        </a>
                      </div>
                    </div>
                  )}

                  {activeTab === "notes" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <label style={{ color: "white", fontSize: "0.95rem", fontWeight: 700 }}>Caderno de Anotações Privado</label>
                        <button
                          onClick={handleExportNote}
                          style={{ fontSize: "0.8rem", display: "flex", alignItems: "center", gap: 6, color: "var(--alvo-blue)", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}
                        >
                          <Download size={14} />
                          Exportar em TXT
                        </button>
                      </div>
                      
                      <textarea
                        placeholder="Escreva aqui tudo o que você aprendeu nesta aula! Suas anotações são salvas automaticamente no navegador para estudo posterior..."
                        value={lessonNote}
                        onChange={(e) => handleNoteChange(e.target.value)}
                        rows={5}
                        style={{
                          width: "100%",
                          background: "rgba(9, 13, 22, 0.4)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: 14,
                          padding: "1rem",
                          color: "white",
                          fontSize: "0.9rem",
                          fontFamily: "inherit",
                          resize: "vertical",
                          outline: "none"
                        }}
                      />
                      <span style={{ fontSize: "0.75rem", opacity: 0.5, textAlign: "right" }}>Salvo automaticamente!</span>
                    </div>
                  )}

                  {activeTab === "instructor" && (
                    <div style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
                      <div 
                        style={{ 
                          width: 80, 
                          height: 80, 
                          borderRadius: "50%", 
                          backgroundImage: "url(https://images.unsplash.com/photo-1542103749-8ef59b94f4d3?q=80&w=200&auto=format&fit=crop)", 
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          border: "2px solid var(--alvo-blue)",
                          flexShrink: 0
                        }} 
                      />
                      <div>
                        <strong style={{ color: "white", fontSize: "1.1rem", display: "block" }}>Pastor Getro Costa</strong>
                        <span style={{ color: "var(--alvo-blue)", fontSize: "0.85rem", fontWeight: 700 }}>Pastor Presidente · Doutor em Teologia</span>
                        <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.85rem", marginTop: 8, lineHeight: "1.4" }}>
                          Há mais de 20 anos pastoreando e formando líderes para expansão ministerial saudável. Especialista em crescimento de pequenos grupos e teologia prática.
                        </p>
                      </div>
                    </div>
                  )}

                  {activeTab === "certificate" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", alignItems: "center", textAlign: "center", padding: "1rem 0" }}>
                      {isCourseCompleted ? (
                        <>
                          <div style={{ display: "inline-block", padding: "1rem", borderRadius: "50%", backgroundColor: "rgba(16, 185, 129, 0.15)", marginBottom: "0.5rem" }}>
                            <Award size={48} style={{ color: "#10b981" }} />
                          </div>
                          <h4 style={{ color: "white", fontSize: "1.2rem", fontWeight: 800 }}>Certificado Desbloqueado!</h4>
                          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.9rem", maxWidth: "450px" }}>
                            Parabéns! Você completou com excelência 100% da carga horária acadêmica exigida e sua outorga ministerial já está gerada.
                          </p>
                          <button
                            onClick={() => setShowCertificateModal(true)}
                            className="primary-button"
                            style={{ backgroundColor: "var(--alvo-blue)", color: "white", padding: "0.85rem 2rem", borderRadius: 14, fontWeight: 800, marginTop: "0.5rem" }}
                          >
                            Visualizar e Imprimir Certificado
                          </button>
                        </>
                      ) : (
                        <>
                          <div style={{ display: "inline-block", padding: "1rem", borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.05)", marginBottom: "0.5rem" }}>
                            <Lock size={40} style={{ color: "rgba(255,255,255,0.3)" }} />
                          </div>
                          <h4 style={{ color: "white", fontSize: "1.1rem", fontWeight: 800 }}>Certificado Bloqueado</h4>
                          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", maxWidth: "450px" }}>
                            Conclua todas as aulas pendentes deste curso para atingir 100% de progresso e habilitar a emissão do seu diploma de capacitação oficial.
                          </p>
                          <div style={{ width: "100%", maxWidth: "300px", height: 8, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 4, overflow: "hidden", marginTop: 8 }}>
                            <div style={{ width: `${coursePercent}%`, height: "100%", backgroundColor: "var(--alvo-blue)" }} />
                          </div>
                        </>
                      )}
                    </div>
                  )}
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
        <aside className="serving-panel" style={{ padding: "1.75rem", display: "flex", flexDirection: "column", gap: "1.25rem", height: "fit-content", background: "var(--glass-bg)", border: "1px solid var(--alvo-line)", borderRadius: 24 }}>
          <div>
            <p className="eyebrow">Grade Curricular</p>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "white", margin: 0 }}>Módulos e Aulas</h3>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", overflowY: "auto", maxHeight: "580px", paddingRight: 6 }}>
            {activeModules.map(module => {
              const moduleLessons = activeLessons.filter(l => l.moduleId === module.id);
              const completedInModule = moduleLessons.filter(l => progress.completedLessons.includes(l.id)).length;
              const isModuleDone = moduleLessons.length === completedInModule;

              return (
                <div key={module.id} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <div style={{ paddingBottom: 8, borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.85)" }}>{module.title}</strong>
                    <span style={{ fontSize: "0.75rem", color: isModuleDone ? "#10b981" : "rgba(255,255,255,0.4)", fontWeight: 700 }}>
                      {completedInModule}/{moduleLessons.length}
                    </span>
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
                            borderRadius: 14,
                            backgroundColor: isPlaying ? "var(--alvo-blue-soft)" : "transparent",
                            border: isPlaying ? "1px solid rgba(6, 182, 212, 0.4)" : "1px solid transparent",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.75rem",
                            cursor: "pointer",
                            transition: "all 0.2s",
                            whiteSpace: "normal"
                          }}
                          type="button"
                        >
                          <span onClick={(e) => {
                            e.stopPropagation();
                            handleToggleLesson(lesson.id);
                          }} style={{ display: "flex", alignItems: "center" }}>
                            {isCompleted ? (
                              <CheckCircle2 size={18} style={{ color: "#10b981" }} />
                            ) : (
                              <Circle size={18} style={{ color: "rgba(255,255,255,0.25)" }} />
                            )}
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ fontSize: "0.85rem", color: isPlaying ? "#d27836" : "white", fontWeight: isPlaying ? 700 : 500, display: "block" }}>
                              {lesson.title}
                            </span>
                            <span style={{ fontSize: "0.75rem", opacity: 0.4, display: "block", marginTop: 2 }}>⏱️ {lesson.durationMinutes} min</span>
                          </div>
                          {isPlaying && <ChevronRight size={16} style={{ color: "var(--alvo-blue)" }} />}
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
