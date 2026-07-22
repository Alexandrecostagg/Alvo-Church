"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Award, Lock, PlayCircle, CheckCircle2, ArrowLeft, ShoppingCart, Printer, Paperclip } from "lucide-react";
import { useAppAuth } from "../../../app/providers";
import { friendlyError } from "../../lib/friendly-error";
import {
  fetchTrainingPrograms,
  fetchProgramEntitlements,
  fetchTrainingLessons,
  fetchMemberCourseProgress,
  saveMemberCourseProgress,
  isFirebaseWebRuntimeConfigured
} from "@alvo/firebase";
import type { TrainingProgram, TrainingLesson, MemberCourseProgress } from "@alvo/types";
import { MarkdownLite } from "../../components/markdown-lite";

const ADMIN_ROLES = ["super_admin", "church_admin", "pastor", "secretary"] as const;

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function CapacitacaoStoreView() {
  const { configured, firebaseReady, user, organizationId, firebaseConfig, tenantRuntime, hasAnyRole } = useAppAuth();

  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [entitledIds, setEntitledIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const ready = configured && firebaseReady && !!user && isFirebaseWebRuntimeConfigured(firebaseConfig);
  const isAdmin = hasAnyRole([...ADMIN_ROLES]);

  const load = useCallback(async () => {
    if (!ready) { setLoading(false); return; }
    setLoading(true);
    try {
      const [list, ents] = await Promise.all([
        fetchTrainingPrograms(firebaseConfig, true),
        fetchProgramEntitlements(firebaseConfig, { organizationId })
      ]);
      setPrograms(list.sort((a, b) => a.title.localeCompare(b.title)));
      setEntitledIds(new Set(ents.filter((e) => e.status === "active").map((e) => e.programId)));
    } catch (e) {
      setError(friendlyError(e, "Erro ao carregar a loja de capacitação"));
    } finally {
      setLoading(false);
    }
  }, [ready, firebaseConfig, organizationId]);

  useEffect(() => { load(); }, [load]);

  async function handleBuy(program: TrainingProgram) {
    if (!user) return;
    setError("");
    setBuyingId(program.id);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/billing/courses/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
          organizationId,
          programId: program.id,
          orgName: tenantRuntime?.organization?.name ?? "Minha Igreja",
          email: user.email ?? "",
          cpfCnpj: tenantRuntime?.organization?.taxId
        })
      });
      const data = await res.json();
      if (!res.ok || !data.checkoutUrl) {
        setError(data.error ?? "Não foi possível iniciar a compra.");
        setBuyingId(null);
        return;
      }
      window.location.href = data.checkoutUrl;
    } catch (e) {
      setError(friendlyError(e, "Erro ao iniciar a compra"));
      setBuyingId(null);
    }
  }

  const selectedProgram = useMemo(() => programs.find((p) => p.id === selectedId) ?? null, [programs, selectedId]);

  if (loading) {
    return <div style={{ padding: "4rem", display: "flex", justifyContent: "center", color: "var(--alvo-ink-soft, #64748b)" }}><Loader2 size={24} className="spin" /></div>;
  }

  if (selectedProgram && entitledIds.has(selectedProgram.id)) {
    return <ProgramPlayer program={selectedProgram} onBack={() => setSelectedId(null)} />;
  }

  return (
    <div style={{ padding: "2rem 1.5rem", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#534AB7", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: 0.4 }}>Loja de Capacitação</p>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 6px", color: "var(--alvo-ink, #0f172a)" }}>Capacite a liderança da sua igreja</h1>
        <p style={{ fontSize: 14, color: "var(--alvo-ink-soft, #64748b)", margin: 0 }}>
          Trilhas de formação produzidas pela Plataforma Esdras. Ao adquirir, todos os membros da sua igreja ganham acesso.
        </p>
      </div>

      {error && <div style={{ padding: 12, borderRadius: 10, background: "#FCEBEB", color: "#A32D2D", marginBottom: 14, fontSize: 13 }}>{error}</div>}

      {programs.length === 0 ? (
        <p style={{ fontSize: 14, color: "var(--alvo-ink-soft, #64748b)", textAlign: "center", padding: "3rem" }}>
          Nenhuma trilha disponível no momento. Em breve novas capacitações.
        </p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {programs.map((p) => {
            const owned = entitledIds.has(p.id);
            return (
              <div key={p.id} style={cardStyle}>
                <div style={{ height: 140, borderRadius: 12, overflow: "hidden", background: "#eef2f7", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                  {p.thumbnailUrl
                    ? <img src={p.thumbnailUrl} alt={p.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <Award size={40} color="#9aa7b8" />}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <strong style={{ fontSize: 15, color: "var(--alvo-ink, #0f172a)", overflowWrap: "anywhere" }}>{p.title}</strong>
                  {owned && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: "#E1F5EE", color: "#085041" }}>Adquirida</span>}
                </div>
                <p style={{ fontSize: 13, color: "var(--alvo-ink-soft, #64748b)", margin: "0 0 14px", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.description}</p>

                {owned ? (
                  <button onClick={() => setSelectedId(p.id)} style={{ ...primaryBtn, width: "100%", justifyContent: "center" }}>
                    <PlayCircle size={16} /> Acessar trilha
                  </button>
                ) : (
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "var(--alvo-ink, #0f172a)", marginBottom: 10 }}>{formatBRL(p.priceBRL)}</div>
                    {isAdmin ? (
                      <button onClick={() => handleBuy(p)} disabled={buyingId === p.id} style={{ ...primaryBtn, width: "100%", justifyContent: "center" }}>
                        {buyingId === p.id ? <Loader2 size={16} className="spin" /> : <ShoppingCart size={16} />} Comprar
                      </button>
                    ) : (
                      <button disabled style={{ ...secondaryBtn, width: "100%", justifyContent: "center", opacity: 0.7, cursor: "default" }}>
                        <Lock size={15} /> Peça ao administrador
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProgramPlayer({ program, onBack }: { program: TrainingProgram; onBack: () => void }) {
  const { user, organizationId, firebaseConfig, configured, firebaseReady } = useAppAuth();
  const [lessons, setLessons] = useState<TrainingLesson[]>([]);
  const [progress, setProgress] = useState<MemberCourseProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);

  const ready = configured && firebaseReady && !!user && isFirebaseWebRuntimeConfigured(firebaseConfig);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      try {
        const ls = await fetchTrainingLessons(firebaseConfig, program.id);
        if (cancelled) return;
        setLessons(ls);
        setActiveLessonId(ls[0]?.id ?? null);
        const existing = ready && user ? await fetchMemberCourseProgress(firebaseConfig, { organizationId }, user.uid, program.id) : null;
        if (cancelled) return;
        setProgress(existing ?? {
          id: `progress_${user?.uid ?? "anon"}_${program.id}`,
          organizationId,
          memberId: user?.uid ?? "anon",
          courseId: program.id,
          completedLessons: [],
          isCompleted: false,
          updatedAt: new Date().toISOString()
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [program.id, firebaseConfig, organizationId, user, ready]);

  const activeLesson = useMemo(() => lessons.find((l) => l.id === activeLessonId) ?? null, [lessons, activeLessonId]);
  const completedCount = progress?.completedLessons.length ?? 0;
  const pct = lessons.length ? Math.round((completedCount / lessons.length) * 100) : 0;
  const done = lessons.length > 0 && completedCount === lessons.length;

  async function toggleLesson(lessonId: string) {
    if (!progress) return;
    const has = progress.completedLessons.includes(lessonId);
    const next = has ? progress.completedLessons.filter((id) => id !== lessonId) : [...progress.completedLessons, lessonId];
    const allDone = lessons.length > 0 && next.length === lessons.length;
    const updated: MemberCourseProgress = { ...progress, completedLessons: next, isCompleted: allDone, updatedAt: new Date().toISOString() };
    setProgress(updated);
    if (ready) {
      try { await saveMemberCourseProgress(firebaseConfig, { organizationId }, updated); } catch (e) { console.error(e); }
    }
  }

  if (loading) {
    return <div style={{ padding: "4rem", display: "flex", justifyContent: "center", color: "var(--alvo-ink-soft, #64748b)" }}><Loader2 size={24} className="spin" /></div>;
  }

  return (
    <div style={{ padding: "1.5rem", maxWidth: 1100, margin: "0 auto" }}>
      <button onClick={onBack} style={{ ...secondaryBtn, marginBottom: 16 }}><ArrowLeft size={15} /> Voltar à loja</button>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 300px", gap: 20, alignItems: "start" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px", color: "var(--alvo-ink, #0f172a)" }}>{program.title}</h1>
          <p style={{ fontSize: 13, color: "var(--alvo-ink-soft, #64748b)", margin: "0 0 16px" }}>{pct}% concluído · {completedCount}/{lessons.length} aulas</p>

          {activeLesson ? (
            <>
              <div style={{ position: "relative", paddingTop: "56.25%", borderRadius: 12, overflow: "hidden", background: "#000", marginBottom: 12 }}>
                <iframe
                  src={activeLesson.videoUrl}
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                  title={activeLesson.title}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <strong style={{ fontSize: 15, color: "var(--alvo-ink, #0f172a)", overflowWrap: "anywhere" }}>{activeLesson.title}</strong>
                <button
                  onClick={() => toggleLesson(activeLesson.id)}
                  style={{ ...primaryBtn, background: progress?.completedLessons.includes(activeLesson.id) ? "#10b981" : "#534AB7", whiteSpace: "nowrap" }}
                >
                  <CheckCircle2 size={16} /> {progress?.completedLessons.includes(activeLesson.id) ? "Concluída" : "Marcar concluída"}
                </button>
              </div>
              {activeLesson.materialUrl ? (
                <a
                  href={activeLesson.materialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 10, fontSize: 13, fontWeight: 600, color: "#534AB7", textDecoration: "none" }}
                >
                  <Paperclip size={15} /> Material de apoio (PDF)
                </a>
              ) : null}
              {activeLesson.content ? (
                <div style={{ marginTop: 18, padding: "18px 20px", borderRadius: 12, background: "var(--alvo-surface, #fff)", border: "0.5px solid var(--alvo-border, #e2e8f0)" }}>
                  <p style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, color: "var(--alvo-ink-soft, #64748b)", margin: "0 0 10px" }}>Material da aula</p>
                  <MarkdownLite text={activeLesson.content} />
                </div>
              ) : null}
            </>
          ) : (
            <p style={{ fontSize: 14, color: "var(--alvo-ink-soft, #64748b)" }}>Esta trilha ainda não tem aulas publicadas.</p>
          )}

          {done && (
            <div style={{ marginTop: 20, padding: 16, borderRadius: 12, background: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Award size={22} color="#085041" />
                <div>
                  <strong style={{ fontSize: 14, color: "#085041", display: "block" }}>Trilha concluída!</strong>
                  <span style={{ fontSize: 12, color: "#085041" }}>Certificado de {program.title} disponível.</span>
                </div>
              </div>
              <button onClick={() => window.print()} style={{ ...secondaryBtn, whiteSpace: "nowrap" }}><Printer size={15} /> Certificado</button>
            </div>
          )}
        </div>

        <div style={{ ...cardStyle, padding: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3, color: "var(--alvo-ink-soft, #64748b)", margin: "4px 8px 10px" }}>Aulas</p>
          <div style={{ display: "grid", gap: 4 }}>
            {lessons.map((l, i) => {
              const isActive = l.id === activeLessonId;
              const isDone = progress?.completedLessons.includes(l.id);
              return (
                <button
                  key={l.id}
                  onClick={() => setActiveLessonId(l.id)}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, border: "none", cursor: "pointer", textAlign: "left", background: isActive ? "#EEEDFE" : "transparent", width: "100%" }}
                >
                  {isDone ? <CheckCircle2 size={16} color="#10b981" style={{ flexShrink: 0 }} /> : <PlayCircle size={16} color="#9aa7b8" style={{ flexShrink: 0 }} />}
                  <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: "var(--alvo-ink, #0f172a)", overflowWrap: "anywhere" }}>{i + 1}. {l.title}</span>
                </button>
              );
            })}
            {lessons.length === 0 && <span style={{ fontSize: 13, color: "var(--alvo-ink-soft, #64748b)", padding: "0 8px" }}>Sem aulas.</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = { background: "#ffffff", border: "1px solid var(--alvo-line, #e2e8f0)", borderRadius: 16, padding: 16 };
const primaryBtn: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 10, border: "none", background: "#534AB7", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" };
const secondaryBtn: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 10, border: "1px solid var(--alvo-line, #e2e8f0)", background: "#fff", color: "var(--alvo-ink, #0f172a)", fontSize: 13, fontWeight: 600, cursor: "pointer" };
