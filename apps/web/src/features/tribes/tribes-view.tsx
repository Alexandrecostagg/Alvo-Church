"use client";

import { useEffect, useState } from "react";
import {
  fetchPeople,
  isFirebaseWebRuntimeConfigured
} from "@alvo/firebase";
import type { Person, TribeCode } from "@alvo/types";
import { useAppAuth } from "../../../app/providers";
import { recentPeople, tribeDefinitions } from "../../lib/mock-data";
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
  RotateCcw,
  User
} from "lucide-react";
import Link from "next/link";

type TribeAccent = { main: string; soft: string; dark: string };

export function TribesView() {
  const { configured, firebaseReady, user, organizationId, firebaseConfig } = useAppAuth();
  const [realPeople, setRealPeople] = useState<Person[]>([]);
  const [selectedTribe, setSelectedTribe] = useState<TribeCode | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!configured || !firebaseReady || !user || !isFirebaseWebRuntimeConfigured(firebaseConfig)) return;
    async function load() {
      try {
        const people = await fetchPeople(firebaseConfig, { organizationId }, 300);
        setRealPeople(people);
      } catch (e) {
        console.error("Failed to load people:", e);
      }
    }
    void load();
  }, [configured, firebaseConfig, firebaseReady, organizationId, user]);

  const peopleSource = (realPeople.length > 0 ? realPeople : recentPeople) as Person[];

  const classified   = peopleSource.filter(p => p.tribePrimaryCode);
  const unclassified = peopleSource.filter(p => !p.tribePrimaryCode);

  const tribesWithStats = tribeDefinitions
    .map(tribe => {
      const members = peopleSource.filter(p => p.tribePrimaryCode === tribe.code);
      const accent  = getTribeAccent(tribe.code as TribeCode);
      return { ...tribe, memberCount: members.length, members, accent };
    })
    .filter(t =>
      search === "" ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.ministrySummary.toLowerCase().includes(search.toLowerCase())
    );

  const selectedTribeData = selectedTribe
    ? tribesWithStats.find(t => t.code === selectedTribe)
    : null;

  const totalClassified   = classified.length;
  const totalUnclassified = unclassified.length;
  const coveragePct = peopleSource.length > 0
    ? Math.round((totalClassified / peopleSource.length) * 100)
    : 0;

  return (
    <div className="page-root">

      {/* Header */}
      <header className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Tribos Ministeriais</h1>
          <p className="page-subtitle">
            Identidade vocacional dos membros — classificada automaticamente pela IA a partir da ficha cadastral
          </p>
        </div>
        <div className="page-header-actions">
          <div className="tribes-search-bar">
            <Search size={14} style={{ color: "var(--alvo-ink-soft)" }} />
            <input
              type="text"
              placeholder="Buscar tribo..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="tribes-search-input"
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}>
                <X size={13} style={{ color: "var(--alvo-ink-soft)" }} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Stats row */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "var(--alvo-accent-soft)", color: "var(--alvo-accent)" }}>
            <Tent size={18} />
          </div>
          <div className="stat-body">
            <span className="stat-label">Tribos ativas</span>
            <span className="stat-value">{tribeDefinitions.length}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#dcfce7", color: "#16a34a" }}>
            <CheckCircle size={18} />
          </div>
          <div className="stat-body">
            <span className="stat-label">Classificados</span>
            <span className="stat-value">{totalClassified}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#fef3c7", color: "#d97706" }}>
            <AlertCircle size={18} />
          </div>
          <div className="stat-body">
            <span className="stat-label">Aguardando IA</span>
            <span className="stat-value">{totalUnclassified}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#ede9fe", color: "#7c3aed" }}>
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
            {" "}A tribo de cada membro é sugerida automaticamente com base no Perfil Ministerial preenchido na ficha de cadastro.
            O administrador pode revisar e reclassificar manualmente a qualquer momento.
          </span>
        </div>
      </div>

      {/* Grade das 12 tribos */}
      <section className="content-section">
        <div className="section-header">
          <h2 className="section-title">As 12 Tribos</h2>
          <span style={{ fontSize: 12, color: "var(--alvo-ink-soft)" }}>Clique para ver os membros</span>
        </div>

        <div className="tribe-grid">
          {tribesWithStats.map(tribe => {
            const isSelected = selectedTribe === tribe.code;
            return (
              <article
                key={tribe.code}
                className="tribe-card"
                onClick={() => setSelectedTribe(isSelected ? null : tribe.code as TribeCode)}
                style={{
                  borderColor: isSelected ? tribe.accent.main : "var(--alvo-line)",
                  background: isSelected
                    ? `linear-gradient(135deg, ${tribe.accent.soft}, white)`
                    : "var(--alvo-surface)",
                  cursor: "pointer",
                }}
              >
                <div className="tribe-card-icon" style={{ background: tribe.accent.soft, color: tribe.accent.dark }}>
                  <Tent size={20} />
                </div>
                <div className="tribe-card-body">
                  <h3 style={{ color: tribe.accent.dark, fontSize: 14, fontWeight: 800, margin: 0 }}>
                    {tribe.name}
                  </h3>
                  <p style={{ fontSize: 12, color: "var(--alvo-ink-soft)", margin: "4px 0 0", lineHeight: 1.4 }}>
                    {tribe.description}
                  </p>
                </div>
                <div className="tribe-card-footer" style={{ color: tribe.accent.main }}>
                  <UsersRound size={12} />
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{tribe.memberCount} membros</span>
                  <ChevronRight
                    size={14}
                    style={{
                      marginLeft: "auto",
                      transform: isSelected ? "rotate(90deg)" : "none",
                      transition: "transform 0.2s"
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
        <section className="tribe-detail-panel animate-entrance" style={{ borderLeft: `4px solid ${selectedTribeData.accent.main}` }}>
          <div className="tribe-detail-header">
            <div className="tribe-detail-icon" style={{ background: selectedTribeData.accent.soft, color: selectedTribeData.accent.dark }}>
              <Tent size={24} />
            </div>
            <div>
              <h2 style={{ color: selectedTribeData.accent.dark, fontSize: 18, fontWeight: 800, margin: 0 }}>
                Tribo de {selectedTribeData.name}
              </h2>
              <p style={{ color: "var(--alvo-ink-soft)", fontSize: 13, margin: "4px 0 0" }}>
                {selectedTribeData.ministrySummary}
              </p>
            </div>
            <button
              onClick={() => setSelectedTribe(null)}
              style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--alvo-ink-soft)", display: "flex" }}
            >
              <X size={16} />
            </button>
          </div>

          {selectedTribeData.memberCount === 0 ? (
            <div className="empty-state" style={{ padding: "32px 0" }}>
              <UsersRound size={32} style={{ color: "var(--alvo-line)", margin: "0 auto 12px" }} />
              <p style={{ color: "var(--alvo-ink-soft)", textAlign: "center" }}>
                Nenhum membro classificado nesta tribo ainda.
              </p>
            </div>
          ) : (
            <div className="tribe-members-list">
              {selectedTribeData.members.map(person => (
                <Link
                  key={person.id}
                  href={`/members/${person.id}`}
                  className="tribe-member-row"
                >
                  <div className="tribe-member-avatar" style={{ background: selectedTribeData.accent.soft, color: selectedTribeData.accent.dark }}>
                    {getInitials(person)}
                  </div>
                  <div className="tribe-member-info">
                    <strong style={{ fontSize: 13, color: "var(--alvo-ink)" }}>
                      {person.preferredName || person.firstName} {person.lastName}
                    </strong>
                    <span style={{ fontSize: 12, color: "var(--alvo-ink-soft)" }}>
                      {getMemberStatusLabel(person.memberStatus)}
                    </span>
                  </div>
                  {person.tribeSecondaryCode && (
                    <span className="tribe-secondary-badge">
                      + {person.tribeSecondaryCode}
                    </span>
                  )}
                  <ChevronRight size={14} style={{ color: "var(--alvo-line)", marginLeft: "auto" }} />
                </Link>
              ))}
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
              <p style={{ fontSize: 13, color: "var(--alvo-ink-soft)", margin: "2px 0 0" }}>
                Membros com Perfil Ministerial preenchido que ainda não receberam tribo
              </p>
            </div>
            <button className="btn-primary btn-sm" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Bot size={14} />
              Classificar todos com IA
            </button>
          </div>

          <div className="unclassified-list">
            {unclassified.slice(0, 10).map(person => (
              <div key={person.id} className="unclassified-row">
                <div className="tribe-member-avatar" style={{ background: "#f1f5f9", color: "#64748b" }}>
                  {getInitials(person)}
                </div>
                <div className="tribe-member-info">
                  <strong style={{ fontSize: 13, color: "var(--alvo-ink)" }}>
                    {person.preferredName || person.firstName} {person.lastName}
                  </strong>
                  <span style={{ fontSize: 12, color: "var(--alvo-ink-soft)" }}>
                    {getMemberStatusLabel(person.memberStatus)}
                    {(person as any).ministerialInterests?.length > 0 && " · perfil ministerial preenchido"}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
                  <button className="btn-secondary btn-sm" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Sparkles size={12} />
                    Classificar
                  </button>
                  <Link href={`/members/${person.id}`} className="btn-secondary btn-sm" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <User size={12} />
                    Ficha
                  </Link>
                </div>
              </div>
            ))}
            {unclassified.length > 10 && (
              <p style={{ fontSize: 13, color: "var(--alvo-ink-soft)", textAlign: "center", padding: "12px 0" }}>
                +{unclassified.length - 10} pessoas aguardando classificação
              </p>
            )}
          </div>
        </section>
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
          transition: box-shadow 0.15s, transform 0.15s;
        }
        .tribe-card:hover {
          box-shadow: 0 4px 16px rgba(0,0,0,0.08);
          transform: translateY(-1px);
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
        }
      `}</style>
    </div>
  );
}

function getInitials(person: Person) {
  const first = (person.preferredName || person.firstName || "").charAt(0);
  const last  = (person.lastName || "").charAt(0);
  return `${first}${last}`.toUpperCase();
}

function getMemberStatusLabel(status: Person["memberStatus"]) {
  const labels: Record<string, string> = {
    visitor:      "Visitante",
    congregant:   "Congregado",
    new_believer: "Novo Convertido",
    member:       "Membro",
    leader:       "Líder",
    volunteer:    "Voluntário",
  };
  return labels[status ?? ""] || "Membro";
}

function getTribeAccent(code?: TribeCode | string): TribeAccent {
  const accents: Record<string, TribeAccent> = {
    ASHER:    { main: "#10b981", soft: "#ecfdf5", dark: "#065f46" },
    LEVI:     { main: "#3b82f6", soft: "#eff6ff", dark: "#1e3a8a" },
    JUDAH:    { main: "#f97316", soft: "#fff7ed", dark: "#7c2d12" },
    ISSACHAR: { main: "#8b5cf6", soft: "#f5f3ff", dark: "#4c1d95" },
    JOSEPH:   { main: "#06b6d4", soft: "#ecfeff", dark: "#083344" },
    NAPHTALI: { main: "#ec4899", soft: "#fdf2f8", dark: "#831843" },
    ZEBULUN:  { main: "#f59e0b", soft: "#fffbeb", dark: "#78350f" },
    GAD:      { main: "#64748b", soft: "#f8fafc", dark: "#0f172a" },
    MANASSEH: { main: "#14b8a6", soft: "#f0fdfa", dark: "#134e4a" },
    EPHRAIM:  { main: "#84cc16", soft: "#f7fee7", dark: "#365314" },
    BENJAMIN: { main: "#6366f1", soft: "#eef2ff", dark: "#1e1b4b" },
    REUBEN:   { main: "#ef4444", soft: "#fef2f2", dark: "#7f1d1d" },
  };
  return accents[code as string] ?? { main: "#94a3b8", soft: "#f1f5f9", dark: "#334155" };
}
