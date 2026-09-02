"use client";

import { useEffect, useState } from "react";
import {
  savePersonProfile,
  addMemberTribeHistory,
  isFirebaseWebRuntimeConfigured,
} from "@alvo/firebase";
import { cachedFetchPeople } from "../../lib/org-data-cache";
import type { Person, TribeCode } from "@alvo/types";
import { useAppAuth } from "../../../app/providers";
import { tribeDefinitions } from "../../lib/mock-data";
import {
  UsersRound,
  Tent,
  Search,
  X,
  Sparkles,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  Bot,
  Pencil,
  MessageCircle,
  User,
} from "lucide-react";
import Link from "next/link";

type TribeAccent = { main: string; soft: string; dark: string };

export function TribesView() {
  const {
    configured,
    firebaseReady,
    user,
    organizationId,
    firebaseConfig,
    tenantRuntime,
  } = useAppAuth();
  const orgName =
    tenantRuntime?.organization?.displayName ??
    tenantRuntime?.organization?.name ??
    "nossa igreja";
  const [realPeople, setRealPeople] = useState<Person[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedTribe, setSelectedTribe] = useState<TribeCode | null>(null);
  const [search, setSearch] = useState("");
  const [classifyingIds, setClassifyingIds] = useState<string[]>([]);
  const [classifyStatus, setClassifyStatus] = useState<string | null>(null);
  // Modal de reclassificação manual (override do admin).
  const [reclassifyTarget, setReclassifyTarget] = useState<Person | null>(null);
  const [reclassifyPick, setReclassifyPick] = useState<TribeCode | null>(null);
  const [reclassifyReason, setReclassifyReason] = useState("");
  const [reclassifySaving, setReclassifySaving] = useState(false);

  useEffect(() => {
    if (
      !configured ||
      !firebaseReady ||
      !user ||
      !isFirebaseWebRuntimeConfigured(firebaseConfig)
    )
      return;
    async function load() {
      try {
        const people = await cachedFetchPeople(
          firebaseConfig,
          { organizationId },
          300,
        );
        setRealPeople(people);
      } catch (e) {
        console.error("Failed to load people:", e);
      } finally {
        setLoaded(true);
      }
    }
    void load();
  }, [configured, firebaseConfig, firebaseReady, organizationId, user]);

  // Sem dados reais: nada de mock — a página mostra estado vazio honesto.
  const peopleSource = realPeople;

  const VALID_TRIBES = new Set([
    "LEVI",
    "JUDAH",
    "ASHER",
    "ISSACHAR",
    "JOSEPH",
    "NAPHTALI",
    "ZEBULUN",
    "GAD",
    "MANASSEH",
    "EPHRAIM",
    "BENJAMIN",
    "REUBEN",
  ]);

  async function classifyPerson(person: Person): Promise<boolean> {
    if (!user) return false;
    setClassifyingIds((ids) => [...ids, person.id]);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          task: "tribe_classify",
          organizationId,
          input: {
            memberName: `${person.firstName} ${person.lastName ?? ""}`.trim(),
            ministerialInterests: person.ministerialInterests,
            servingProfile: person.servingProfile,
            availability: person.availability,
            memberStatus: person.memberStatus,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha na classificação");
      // A IA responde JSON puro: {"primary":"...","secondary":"...","reason":"..."}
      const raw = data.content ?? "";
      const jsonMatch = String(raw).match(/\{[\s\S]*\}/);
      if (!jsonMatch)
        throw new Error("Resposta da IA fora do formato esperado");
      const parsed = JSON.parse(jsonMatch[0]) as {
        primary?: string;
        secondary?: string | null;
        reason?: string;
      };
      const primary =
        parsed.primary && VALID_TRIBES.has(parsed.primary)
          ? (parsed.primary as TribeCode)
          : undefined;
      if (!primary) throw new Error("Tribo sugerida inválida");
      const secondary =
        parsed.secondary && VALID_TRIBES.has(parsed.secondary)
          ? (parsed.secondary as TribeCode)
          : undefined;
      const reason =
        typeof parsed.reason === "string"
          ? parsed.reason.trim().slice(0, 400)
          : undefined;
      const updated: Person = {
        ...person,
        tribePrimaryCode: primary,
        tribeSecondaryCode: secondary,
        tribeClassificationReason: reason,
        tribeClassificationSource: "ai",
        tribeClassifiedAt: new Date().toISOString(),
      };
      await savePersonProfile(firebaseConfig, { organizationId }, updated);
      // Auditoria: registra a classificação da IA no histórico do membro.
      await addMemberTribeHistory(
        firebaseConfig,
        { organizationId },
        person.id,
        {
          oldPrimaryTribeCode: person.tribePrimaryCode,
          newPrimaryTribeCode: primary,
          oldSecondaryTribeCode: person.tribeSecondaryCode,
          newSecondaryTribeCode: secondary,
          changeType: person.tribePrimaryCode
            ? "full_reclassification"
            : "initial_assignment",
          source: "ai",
          reason,
        },
      ).catch((e) =>
        console.error("Falha ao registrar histórico de tribo:", e),
      );
      setRealPeople((people) =>
        people.map((x) => (x.id === person.id ? updated : x)),
      );
      return true;
    } catch (e) {
      console.error(e);
      return false;
    } finally {
      setClassifyingIds((ids) => ids.filter((id) => id !== person.id));
    }
  }

  // Override manual do admin: define a tribo à mão + motivo → grava histórico.
  function openReclassify(person: Person) {
    setReclassifyTarget(person);
    setReclassifyPick(person.tribePrimaryCode ?? null);
    setReclassifyReason("");
  }
  function closeReclassify() {
    setReclassifyTarget(null);
    setReclassifyPick(null);
    setReclassifyReason("");
  }
  async function saveReclassify() {
    const person = reclassifyTarget;
    if (!person || !reclassifyPick || !user) return;
    setReclassifySaving(true);
    try {
      const updated: Person = {
        ...person,
        tribePrimaryCode: reclassifyPick,
        tribeClassificationReason: reclassifyReason.trim() || undefined,
        tribeClassificationSource: "manual",
        tribeClassifiedAt: new Date().toISOString(),
      };
      await savePersonProfile(firebaseConfig, { organizationId }, updated);
      await addMemberTribeHistory(
        firebaseConfig,
        { organizationId },
        person.id,
        {
          oldPrimaryTribeCode: person.tribePrimaryCode,
          newPrimaryTribeCode: reclassifyPick,
          oldSecondaryTribeCode: person.tribeSecondaryCode,
          newSecondaryTribeCode: person.tribeSecondaryCode,
          changeType: "manual_adjustment",
          source: "manual",
          reason: reclassifyReason.trim() || undefined,
          changedByUserId: user.uid,
        },
      ).catch((e) =>
        console.error("Falha ao registrar histórico de tribo:", e),
      );
      setRealPeople((people) =>
        people.map((x) => (x.id === person.id ? updated : x)),
      );
      closeReclassify();
    } catch (e) {
      console.error("Falha ao reclassificar:", e);
    } finally {
      setReclassifySaving(false);
    }
  }

  async function classifyOne(person: Person) {
    setClassifyStatus(null);
    const ok = await classifyPerson(person);
    setClassifyStatus(
      ok
        ? `${person.preferredName || person.firstName} classificado(a)!`
        : `Não foi possível classificar ${person.preferredName || person.firstName}. Verifique se a ficha tem o perfil ministerial preenchido.`,
    );
  }

  async function classifyAll(pending: Person[]) {
    setClassifyStatus("Classificando com IA...");
    let done = 0;
    // Uma por vez pra respeitar a cota de IA e não estourar rate limit.
    for (const person of pending.slice(0, 10)) {
      if (await classifyPerson(person)) done += 1;
    }
    setClassifyStatus(
      done > 0
        ? `${done} membro(s) classificados pela IA.`
        : "Nenhum membro pôde ser classificado. Verifique as fichas e sua cota de IA.",
    );
  }

  const classified = peopleSource.filter((p) => p.tribePrimaryCode);
  const unclassified = peopleSource.filter((p) => !p.tribePrimaryCode);

  const tribesWithStats = tribeDefinitions
    .map((tribe) => {
      const members = peopleSource.filter(
        (p) => p.tribePrimaryCode === tribe.code,
      );
      const accent = getTribeAccent(tribe.code as TribeCode);
      return { ...tribe, memberCount: members.length, members, accent };
    })
    .filter(
      (t) =>
        search === "" ||
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.description.toLowerCase().includes(search.toLowerCase()) ||
        t.ministrySummary.toLowerCase().includes(search.toLowerCase()),
    )
    // Tribos com membros primeiro (mais populadas no topo); vazias vão pro fim.
    .sort((a, b) => b.memberCount - a.memberCount);

  const selectedTribeData = selectedTribe
    ? tribesWithStats.find((t) => t.code === selectedTribe)
    : null;

  const totalClassified = classified.length;
  const totalUnclassified = unclassified.length;
  const coveragePct =
    peopleSource.length > 0
      ? Math.round((totalClassified / peopleSource.length) * 100)
      : 0;

  return (
    <div className="page-root">
      {/* Header */}
      <header className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Tribos Ministeriais</h1>
          <p className="page-subtitle">
            Identidade vocacional dos membros — classificada automaticamente
            pela IA a partir da ficha cadastral
          </p>
        </div>
        <div className="page-header-actions">
          <div className="tribes-search-bar">
            <Search size={14} style={{ color: "var(--alvo-ink-soft)" }} />
            <input
              type="text"
              placeholder="Buscar tribo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="tribes-search-input"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  display: "flex",
                }}
              >
                <X size={13} style={{ color: "var(--alvo-ink-soft)" }} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Stats row */}
      <div className="stats-row">
        <div className="stat-card">
          <div
            className="stat-icon"
            style={{
              background: "var(--alvo-accent-soft)",
              color: "var(--alvo-accent)",
            }}
          >
            <Tent size={18} />
          </div>
          <div className="stat-body">
            <span className="stat-label">Tribos ativas</span>
            <span className="stat-value">{tribeDefinitions.length}</span>
          </div>
        </div>
        <div className="stat-card">
          <div
            className="stat-icon"
            style={{ background: "#dcfce7", color: "#16a34a" }}
          >
            <CheckCircle size={18} />
          </div>
          <div className="stat-body">
            <span className="stat-label">Classificados</span>
            <span className="stat-value">{totalClassified}</span>
          </div>
        </div>
        <div className="stat-card">
          <div
            className="stat-icon"
            style={{ background: "#fef3c7", color: "#d97706" }}
          >
            <AlertCircle size={18} />
          </div>
          <div className="stat-body">
            <span className="stat-label">Aguardando IA</span>
            <span className="stat-value">{totalUnclassified}</span>
          </div>
        </div>
        <div className="stat-card">
          <div
            className="stat-icon"
            style={{ background: "#ede9fe", color: "#7c3aed" }}
          >
            <Bot size={18} />
          </div>
          <div className="stat-body">
            <span className="stat-label">Cobertura</span>
            <span className="stat-value">{coveragePct}%</span>
          </div>
        </div>
      </div>

      {/* Banner de classificação automática */}
      <div className="tribes-ai-banner">
        <Bot size={16} style={{ color: "var(--alvo-accent)", flexShrink: 0 }} />
        <div>
          <strong>Classificação automática por IA</strong>
          <span>
            {" "}
            A tribo de cada membro é sugerida automaticamente com base no Perfil
            Ministerial preenchido na ficha de cadastro. O administrador pode
            revisar e reclassificar manualmente a qualquer momento.
          </span>
        </div>
      </div>

      {/* Estado vazio honesto: nenhuma pessoa cadastrada ainda. */}
      {loaded && peopleSource.length === 0 && (
        <div
          className="empty-state"
          style={{
            padding: "28px 0",
            border: "1px dashed var(--alvo-line)",
            borderRadius: 14,
            marginBottom: 4,
          }}
        >
          <UsersRound
            size={36}
            strokeWidth={1.4}
            style={{ color: "var(--alvo-line)", margin: "0 auto 10px" }}
          />
          <p
            style={{ textAlign: "center", margin: 0, color: "var(--alvo-ink)" }}
          >
            Nenhuma pessoa cadastrada ainda.
          </p>
          <p className="empty-hint" style={{ textAlign: "center" }}>
            As tribos são atribuídas automaticamente pela IA a partir do perfil
            ministerial da ficha.
          </p>
          <Link
            href="/people"
            className="btn-primary btn-sm"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              marginTop: 4,
            }}
          >
            <User size={14} /> Cadastrar pessoas
          </Link>
        </div>
      )}

      {/* Grade das 12 tribos */}
      <section className="content-section">
        <div className="section-header">
          <h2 className="section-title">As 12 Tribos</h2>
          <span style={{ fontSize: 12, color: "var(--alvo-ink-soft)" }}>
            Clique para ver os membros
          </span>
        </div>

        <div className="tribe-grid">
          {tribesWithStats.map((tribe) => {
            const isSelected = selectedTribe === tribe.code;
            return (
              <article
                key={tribe.code}
                className="tribe-card"
                onClick={() =>
                  setSelectedTribe(
                    isSelected ? null : (tribe.code as TribeCode),
                  )
                }
                style={{
                  borderColor: isSelected
                    ? tribe.accent.main
                    : "var(--alvo-line)",
                  background: isSelected
                    ? `linear-gradient(135deg, ${tribe.accent.soft}, white)`
                    : "var(--alvo-surface)",
                  cursor: "pointer",
                  opacity: !isSelected && tribe.memberCount === 0 ? 0.62 : 1,
                }}
              >
                <div className="tribe-card-head">
                  <div
                    className="tribe-card-icon"
                    style={{
                      background: tribe.accent.soft,
                      color: tribe.accent.dark,
                    }}
                  >
                    <Tent size={20} />
                  </div>
                  <h3
                    style={{
                      color: tribe.accent.dark,
                      fontSize: 15,
                      fontWeight: 800,
                      margin: 0,
                    }}
                  >
                    {tribe.name}
                  </h3>
                </div>
                <div className="tribe-card-body">
                  <p
                    style={{
                      fontSize: 12,
                      color: "var(--alvo-ink-soft)",
                      margin: 0,
                      lineHeight: 1.4,
                    }}
                  >
                    {tribe.description}
                  </p>
                  <p
                    style={{
                      fontSize: 11,
                      color: "var(--alvo-ink-soft)",
                      margin: "6px 0 0",
                      opacity: 0.75,
                      lineHeight: 1.4,
                    }}
                  >
                    {tribe.ministrySummary}
                  </p>
                </div>
                <div
                  className="tribe-card-footer"
                  style={{ color: tribe.accent.main }}
                >
                  <UsersRound size={12} />
                  <span style={{ fontSize: 12, fontWeight: 700 }}>
                    {tribe.memberCount === 0
                      ? "Sem membros"
                      : `${tribe.memberCount} ${tribe.memberCount === 1 ? "membro" : "membros"}`}
                  </span>
                  <ChevronRight
                    size={14}
                    style={{
                      marginLeft: "auto",
                      transform: isSelected ? "rotate(90deg)" : "none",
                      transition: "transform 0.2s",
                    }}
                  />
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Painel de detalhe da tribo selecionada */}
      {selectedTribeData && (
        <section
          className="tribe-detail-panel animate-entrance"
          style={{ borderLeft: `4px solid ${selectedTribeData.accent.main}` }}
        >
          <div className="tribe-detail-header">
            <div
              className="tribe-detail-icon"
              style={{
                background: selectedTribeData.accent.soft,
                color: selectedTribeData.accent.dark,
              }}
            >
              <Tent size={24} />
            </div>
            <div>
              <h2
                style={{
                  color: selectedTribeData.accent.dark,
                  fontSize: 18,
                  fontWeight: 800,
                  margin: 0,
                }}
              >
                Tribo de {selectedTribeData.name}
              </h2>
              <p
                style={{
                  color: "var(--alvo-ink-soft)",
                  fontSize: 13,
                  margin: "4px 0 0",
                }}
              >
                {selectedTribeData.ministrySummary}
              </p>
            </div>
            <div
              style={{
                marginLeft: "auto",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <Link
                href="/serving"
                className="btn-secondary btn-sm"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  textDecoration: "none",
                }}
              >
                <UsersRound size={13} />
                Escalar esta tribo
              </Link>
              <button
                onClick={() => setSelectedTribe(null)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--alvo-ink-soft)",
                  display: "flex",
                }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {selectedTribeData.memberCount === 0 ? (
            <div className="empty-state" style={{ padding: "32px 0" }}>
              <UsersRound
                size={32}
                style={{ color: "var(--alvo-line)", margin: "0 auto 12px" }}
              />
              <p style={{ color: "var(--alvo-ink-soft)", textAlign: "center" }}>
                Nenhum membro classificado nesta tribo ainda.
              </p>
            </div>
          ) : (
            <div className="tribe-members-list">
              {selectedTribeData.members.map((person) => {
                const notifyHref = buildTribeNotifyHref(
                  person,
                  selectedTribeData.name,
                  selectedTribeData.description,
                  selectedTribeData.ministrySummary,
                  orgName,
                );
                return (
                  <div key={person.id} className="tribe-member-row">
                    <div
                      className="tribe-member-avatar"
                      style={{
                        background: selectedTribeData.accent.soft,
                        color: selectedTribeData.accent.dark,
                      }}
                    >
                      {getInitials(person)}
                    </div>
                    <div
                      className="tribe-member-info"
                      style={{ minWidth: 0, flex: 1 }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <strong
                          style={{ fontSize: 13, color: "var(--alvo-ink)" }}
                        >
                          {person.preferredName || person.firstName}{" "}
                          {person.lastName}
                        </strong>
                        {person.tribeClassificationSource && (
                          <span
                            className={`tribe-source-badge ${person.tribeClassificationSource}`}
                          >
                            {person.tribeClassificationSource === "ai" ? (
                              <>
                                <Bot size={10} /> IA
                              </>
                            ) : (
                              <>
                                <Pencil size={10} /> Manual
                              </>
                            )}
                          </span>
                        )}
                        {person.tribeSecondaryCode && (
                          <span className="tribe-secondary-badge">
                            + {person.tribeSecondaryCode}
                          </span>
                        )}
                      </div>
                      <span
                        style={{ fontSize: 12, color: "var(--alvo-ink-soft)" }}
                      >
                        {getMemberStatusLabel(person.memberStatus)}
                      </span>
                      {person.tribeClassificationReason && (
                        <span
                          style={{
                            fontSize: 12,
                            color: "var(--alvo-ink-soft)",
                            fontStyle: "italic",
                            marginTop: 2,
                          }}
                        >
                          “{person.tribeClassificationReason}”
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        marginLeft: "auto",
                        flexShrink: 0,
                      }}
                    >
                      {notifyHref ? (
                        <a
                          href={notifyHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-secondary btn-sm"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            color: "#25D366",
                            textDecoration: "none",
                          }}
                          title="Avisar o membro pelo WhatsApp qual é a tribo dele"
                        >
                          <MessageCircle size={12} /> Avisar
                        </a>
                      ) : (
                        <span
                          className="btn-secondary btn-sm"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            opacity: 0.45,
                            cursor: "not-allowed",
                          }}
                          title="Sem WhatsApp/celular na ficha deste membro"
                        >
                          <MessageCircle size={12} /> Avisar
                        </span>
                      )}
                      <button
                        className="btn-secondary btn-sm"
                        onClick={() => openReclassify(person)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <Pencil size={12} /> Reclassificar
                      </button>
                      <Link
                        href={`/members/${person.id}`}
                        className="tribe-member-ficha-link"
                        aria-label="Abrir ficha"
                      >
                        <ChevronRight
                          size={16}
                          style={{ color: "var(--alvo-ink-soft)" }}
                        />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Pendentes de classificação */}
      {unclassified.length > 0 && (
        <section className="content-section">
          <div className="section-header">
            <div>
              <h2 className="section-title">Aguardando classificação</h2>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--alvo-ink-soft)",
                  margin: "2px 0 0",
                }}
              >
                Membros com Perfil Ministerial preenchido que ainda não
                receberam tribo
              </p>
            </div>
            <button
              className="btn-primary btn-sm"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                opacity: classifyingIds.length > 0 ? 0.6 : 1,
              }}
              disabled={classifyingIds.length > 0}
              onClick={() => void classifyAll(unclassified)}
            >
              <Bot size={14} />
              {classifyingIds.length > 0
                ? "Classificando..."
                : "Classificar todos com IA"}
            </button>
          </div>

          {classifyStatus && (
            <p
              style={{
                fontSize: 13,
                color: "var(--alvo-ink-soft)",
                margin: "0 0 10px",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Sparkles size={13} style={{ color: "var(--alvo-accent)" }} />
              {classifyStatus}
            </p>
          )}
          <div className="unclassified-list">
            {unclassified.slice(0, 10).map((person) => (
              <div key={person.id} className="unclassified-row">
                <div
                  className="tribe-member-avatar"
                  style={{ background: "#f1f5f9", color: "#64748b" }}
                >
                  {getInitials(person)}
                </div>
                <div className="tribe-member-info">
                  <strong style={{ fontSize: 13, color: "var(--alvo-ink)" }}>
                    {person.preferredName || person.firstName} {person.lastName}
                  </strong>
                  <span style={{ fontSize: 12, color: "var(--alvo-ink-soft)" }}>
                    {getMemberStatusLabel(person.memberStatus)}
                    {(person as any).ministerialInterests?.length > 0 &&
                      " · perfil ministerial preenchido"}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    marginLeft: "auto",
                    flexWrap: "wrap",
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    className="btn-primary btn-sm"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      opacity: classifyingIds.includes(person.id) ? 0.6 : 1,
                    }}
                    disabled={classifyingIds.includes(person.id)}
                    onClick={() => void classifyOne(person)}
                  >
                    <Sparkles size={12} />
                    {classifyingIds.includes(person.id)
                      ? "..."
                      : "Classificar (IA)"}
                  </button>
                  <button
                    className="btn-secondary btn-sm"
                    style={{ display: "flex", alignItems: "center", gap: 4 }}
                    onClick={() => openReclassify(person)}
                  >
                    <Pencil size={12} /> Definir manual
                  </button>
                  <Link
                    href={`/members/${person.id}`}
                    className="btn-secondary btn-sm"
                    style={{ display: "flex", alignItems: "center", gap: 4 }}
                  >
                    <User size={12} />
                    Ficha
                  </Link>
                </div>
              </div>
            ))}
            {unclassified.length > 10 && (
              <p
                style={{
                  fontSize: 13,
                  color: "var(--alvo-ink-soft)",
                  textAlign: "center",
                  padding: "12px 0",
                }}
              >
                +{unclassified.length - 10} pessoas aguardando classificação
              </p>
            )}
          </div>
        </section>
      )}

      {/* Modal de reclassificação manual (override do admin) */}
      {reclassifyTarget && (
        <div className="reclassify-overlay" onClick={closeReclassify}>
          <div
            className="reclassify-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="reclassify-head">
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 16,
                    fontWeight: 800,
                    color: "var(--alvo-ink)",
                  }}
                >
                  Definir tribo manualmente
                </h3>
                <p
                  style={{
                    margin: "2px 0 0",
                    fontSize: 13,
                    color: "var(--alvo-ink-soft)",
                  }}
                >
                  {reclassifyTarget.preferredName || reclassifyTarget.firstName}{" "}
                  {reclassifyTarget.lastName}
                </p>
              </div>
              <button
                onClick={closeReclassify}
                aria-label="Fechar"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--alvo-ink-soft)",
                  display: "flex",
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="reclassify-tribe-grid">
              {tribeDefinitions.map((t) => {
                const accent = getTribeAccent(t.code as TribeCode);
                const picked = reclassifyPick === t.code;
                return (
                  <button
                    key={t.code}
                    type="button"
                    className="reclassify-tribe-chip"
                    onClick={() => setReclassifyPick(t.code as TribeCode)}
                    style={{
                      borderColor: picked ? accent.main : "var(--alvo-line)",
                      background: picked ? accent.soft : "var(--alvo-surface)",
                      color: picked ? accent.dark : "var(--alvo-ink)",
                    }}
                  >
                    <Tent size={14} style={{ color: accent.main }} />
                    <span style={{ fontWeight: 700, fontSize: 13 }}>
                      {t.name}
                    </span>
                    {picked && (
                      <CheckCircle
                        size={13}
                        style={{ marginLeft: "auto", color: accent.main }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--alvo-ink)",
                margin: "4px 0 6px",
              }}
            >
              Motivo do ajuste (registrado no histórico)
            </label>
            <textarea
              value={reclassifyReason}
              onChange={(e) => setReclassifyReason(e.target.value)}
              rows={2}
              placeholder="Ex: conversei com o membro e a vocação dele é mais de acolhimento."
              className="reclassify-reason"
            />

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                marginTop: 14,
              }}
            >
              <button
                className="btn-secondary btn-sm"
                onClick={closeReclassify}
              >
                Cancelar
              </button>
              <button
                className="btn-primary btn-sm"
                onClick={() => void saveReclassify()}
                disabled={!reclassifyPick || reclassifySaving}
                style={{
                  opacity: !reclassifyPick || reclassifySaving ? 0.5 : 1,
                }}
              >
                {reclassifySaving ? "Salvando..." : "Salvar tribo"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .tribes-search-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--alvo-surface);
          border: 1px solid var(--alvo-line);
          border-radius: 10px;
          padding: 8px 12px;
          width: 220px;
        }
        .tribes-search-input {
          border: none;
          background: none;
          outline: none;
          font-size: 13px;
          color: var(--alvo-ink);
          width: 100%;
        }
        .tribes-ai-banner {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          background: var(--alvo-accent-soft);
          border: 1px solid var(--alvo-accent-soft);
          border-radius: 12px;
          padding: 12px 16px;
          font-size: 13px;
          color: var(--alvo-ink-soft);
          line-height: 1.5;
        }
        .tribes-ai-banner strong {
          color: var(--alvo-ink);
        }
        .tribe-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 12px;
        }
        .tribe-card {
          border: 1.5px solid;
          border-radius: 14px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          transition:
            box-shadow 0.15s,
            transform 0.15s;
        }
        .tribe-card:hover {
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
          transform: translateY(-1px);
        }
        .tribe-card-head {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .tribe-card-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .tribe-card-body {
          flex: 1;
        }
        .tribe-card-footer {
          display: flex;
          align-items: center;
          gap: 6px;
          padding-top: 8px;
          border-top: 1px solid var(--alvo-line);
        }
        .tribe-detail-panel {
          background: var(--alvo-surface);
          border: 1px solid var(--alvo-line);
          border-radius: 14px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .tribe-detail-header {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .tribe-detail-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .tribe-members-list {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .tribe-member-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 10px;
          text-decoration: none;
          transition: background 0.1s;
        }
        .tribe-member-row:hover {
          background: var(--alvo-surface-muted);
        }
        .tribe-member-avatar {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 800;
          flex-shrink: 0;
        }
        .tribe-member-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .tribe-secondary-badge {
          font-size: 11px;
          font-weight: 700;
          color: var(--alvo-ink-soft);
          background: var(--alvo-surface-muted);
          border: 1px solid var(--alvo-line);
          border-radius: 6px;
          padding: 2px 6px;
        }
        .unclassified-list {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .unclassified-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid var(--alvo-line);
          background: var(--alvo-surface);
          flex-wrap: wrap;
        }
        .tribe-source-badge {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          font-size: 10px;
          font-weight: 800;
          padding: 2px 7px;
          border-radius: 999px;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .tribe-source-badge.ai {
          background: #ede9fe;
          color: #6d28d9;
        }
        .tribe-source-badge.manual {
          background: #e0f2fe;
          color: #0369a1;
        }
        .tribe-member-ficha-link {
          display: flex;
          align-items: center;
          padding: 6px;
          border-radius: 8px;
          text-decoration: none;
        }
        .tribe-member-ficha-link:hover {
          background: var(--alvo-surface-muted);
        }
        .reclassify-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          z-index: 1000;
        }
        .reclassify-modal {
          background: var(--alvo-surface);
          border-radius: 16px;
          padding: 20px;
          width: 100%;
          max-width: 540px;
          max-height: 88vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
        }
        .reclassify-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 16px;
        }
        .reclassify-tribe-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 8px;
          margin-bottom: 16px;
        }
        .reclassify-tribe-chip {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          border: 1.5px solid;
          border-radius: 10px;
          cursor: pointer;
          text-align: left;
          transition:
            border-color 0.12s,
            background 0.12s;
        }
        .reclassify-reason {
          width: 100%;
          box-sizing: border-box;
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid var(--alvo-line);
          font-size: 14px;
          font-family: inherit;
          resize: vertical;
          background: var(--alvo-surface);
          color: var(--alvo-ink);
          outline: none;
        }
      `}</style>
    </div>
  );
}

// wa.me exige dígitos com DDI. Números BR sem código do país (10-11 díg.) → +55.
function normalizeBrPhone(raw?: string): string {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.length <= 11 ? `55${digits}` : digits;
}

// Passo 5 da lógica de tribos: avisar o membro (WhatsApp grátis, via wa.me a
// partir do WhatsApp da liderança) qual é a tribo dele e o que ela significa.
function buildTribeNotifyHref(
  person: Person,
  tribeName: string,
  tribeDescription: string,
  tribeMinistry: string,
  orgName: string,
): string {
  const phone = normalizeBrPhone(person.whatsappPhone || person.mobilePhone);
  if (!phone) return "";
  const first = person.preferredName || person.firstName || "";
  const church =
    orgName.replace(/\s*\(\s*demo\s*\)/gi, "").trim() || "nossa igreja";
  const msg =
    `Olá ${first}!\n\n` +
    `Na ${church}, identificamos que a sua tribo ministerial é a *Tribo de ${tribeName}*.\n\n` +
    `O que significa: ${tribeDescription}\n` +
    `Onde você mais floresce servindo: ${tribeMinistry}\n\n` +
    `Que alegria caminhar com você!`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
}

function getInitials(person: Person) {
  const first = (person.preferredName || person.firstName || "").charAt(0);
  const last = (person.lastName || "").charAt(0);
  return `${first}${last}`.toUpperCase();
}

function getMemberStatusLabel(status: Person["memberStatus"]) {
  const labels: Record<string, string> = {
    visitor: "Visitante",
    congregant: "Congregado",
    new_believer: "Novo Convertido",
    member: "Membro",
    leader: "Líder",
    volunteer: "Voluntário",
  };
  return labels[status ?? ""] || "Membro";
}

function getTribeAccent(code?: TribeCode | string): TribeAccent {
  const accents: Record<string, TribeAccent> = {
    ASHER: { main: "#10b981", soft: "#ecfdf5", dark: "#065f46" },
    LEVI: { main: "#3b82f6", soft: "#eff6ff", dark: "#1e3a8a" },
    JUDAH: { main: "#f97316", soft: "#fff7ed", dark: "#7c2d12" },
    ISSACHAR: { main: "#8b5cf6", soft: "#f5f3ff", dark: "#4c1d95" },
    JOSEPH: { main: "#06b6d4", soft: "#ecfeff", dark: "#083344" },
    NAPHTALI: { main: "#ec4899", soft: "#fdf2f8", dark: "#831843" },
    ZEBULUN: { main: "#f59e0b", soft: "#fffbeb", dark: "#78350f" },
    GAD: { main: "#64748b", soft: "#f8fafc", dark: "#0f172a" },
    MANASSEH: { main: "#14b8a6", soft: "#f0fdfa", dark: "#134e4a" },
    EPHRAIM: { main: "#84cc16", soft: "#f7fee7", dark: "#365314" },
    BENJAMIN: { main: "#6366f1", soft: "#eef2ff", dark: "#1e1b4b" },
    REUBEN: { main: "#ef4444", soft: "#fef2f2", dark: "#7f1d1d" },
  };
  return (
    accents[code as string] ?? {
      main: "#94a3b8",
      soft: "#f1f5f9",
      dark: "#334155",
    }
  );
}
