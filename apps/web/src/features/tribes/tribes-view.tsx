"use client";

import { useEffect, useState } from "react";
import { 
  createFirebaseWebRuntimeConfigFromEnv, 
  fetchGroups, 
  fetchPeople, 
  isFirebaseWebRuntimeConfigured 
} from "@alvo/firebase";
import type { Group, Person, TribeCode } from "@alvo/types";
import { useAppAuth } from "../../../app/providers";
import { activeGroups, recentPeople, tribeDefinitions } from "../../../src/lib/mock-data";
import { UsersRound, Waypoints, ChevronRight, Tent, Search, X } from "lucide-react";
import Link from "next/link";

export function TribesView() {
  const { configured, firebaseReady, user, organizationId, firebaseConfig } = useAppAuth();
  const [realPeople, setRealPeople] = useState<Person[]>([]);
  const [realGroups, setRealGroups] = useState<Group[]>([]);
  const [selectedTribe, setSelectedTribe] = useState<TribeCode | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!configured || !firebaseReady || !user || !isFirebaseWebRuntimeConfigured(firebaseConfig)) return;

    async function loadTribesData() {
      try {
        const [people, groups] = await Promise.all([
          fetchPeople(firebaseConfig, { organizationId }, 200),
          fetchGroups(firebaseConfig, { organizationId }, 100)
        ]);
        setRealPeople(people);
        setRealGroups(groups);
      } catch (error) {
        console.error("Failed to sync tribes data:", error);
      }
    }
    void loadTribesData();
  }, [configured, firebaseConfig, firebaseReady, organizationId, user]);

  const peopleSource = (realPeople.length > 0 ? realPeople : recentPeople) as Person[];
  const groupsSource = (realGroups.length > 0 ? realGroups : activeGroups) as Group[];

  const tribesWithStats = tribeDefinitions.map(tribe => {
    const tribeMembers = peopleSource.filter(p => p.tribePrimaryCode === tribe.code);
    const tribeCells = groupsSource.filter(g => g.tribeCode === tribe.code);
    const accent = getTribeAccent(tribe.code as TribeCode);
    return {
      ...tribe,
      memberCount: tribeMembers.length,
      cellCount: tribeCells.length,
      accent
    };
  }).filter(t => 
    search === "" || 
    t.name.toLowerCase().includes(search.toLowerCase()) || 
    t.description.toLowerCase().includes(search.toLowerCase())
  );

  const filteredGroups = selectedTribe 
    ? groupsSource.filter(g => g.tribeCode === selectedTribe)
    : groupsSource;

  const selectedTribeData = selectedTribe 
    ? tribesWithStats.find(t => t.code === selectedTribe) 
    : null;

  return (
    <main className="tribes-page">
      <header className="topbar">
        <div>
          <p className="eyebrow">Ecossistema Pastoral</p>
          <h1>Tribos & Comunidades</h1>
        </div>
        <Link href="/tribes/test" className="primary-pill compact" style={{ textDecoration: "none" }}>
          Fazer Teste de Dons
        </Link>
      </header>

      {/* Search */}
      <div className="tribes-search-bar">
        <Search size={16} style={{ opacity: 0.4 }} />
        <input
          type="text"
          placeholder="Buscar tribo..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="tribes-search-input"
        />
        {search && (
          <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            <X size={14} style={{ opacity: 0.5 }} />
          </button>
        )}
      </div>

      {/* Stats summary */}
      <div className="tribes-stats-bar">
        <div className="tribes-stat-pill">
          <Tent size={14} />
          <span><strong>{tribeDefinitions.length}</strong> tribos ativas</span>
        </div>
        <div className="tribes-stat-pill">
          <UsersRound size={14} />
          <span><strong>{peopleSource.length}</strong> pessoas mapeadas</span>
        </div>
        <div className="tribes-stat-pill">
          <Waypoints size={14} />
          <span><strong>{groupsSource.length}</strong> células vinculadas</span>
        </div>
      </div>

      {/* Tribe Grid - 12 tribes */}
      <section className="tribe-grid tribe-grid-full">
        {tribesWithStats.map((tribe) => (
          <article 
            key={tribe.code} 
            className={`tribe-card tone-${tribe.code.toLowerCase()} ${selectedTribe === tribe.code ? 'is-selected' : ''}`}
            onClick={() => setSelectedTribe(selectedTribe === tribe.code ? null : tribe.code as TribeCode)}
            style={{ 
              borderColor: selectedTribe === tribe.code ? tribe.accent.main : 'transparent',
              background: selectedTribe === tribe.code 
                ? `radial-gradient(circle at top right, ${tribe.accent.soft}, #fff)` 
                : '#fff',
              cursor: 'pointer'
            }}
          >
            <div className="tribe-icon" style={{ backgroundColor: tribe.accent.soft, color: tribe.accent.dark }}>
              <Tent size={22} />
            </div>
            <div className="tribe-info">
              <h2 style={{ color: tribe.accent.dark, fontSize: '15px' }}>{tribe.name}</h2>
              <p style={{ fontSize: '12px', lineHeight: '1.4' }}>{tribe.description}</p>
            </div>
            <div className="tribe-stats">
              <div className="stat" style={{ color: tribe.accent.main }}>
                <UsersRound size={12} />
                <span>{tribe.memberCount}</span>
              </div>
              <div className="stat" style={{ color: tribe.accent.main }}>
                <Waypoints size={12} />
                <span>{tribe.cellCount} cél.</span>
              </div>
            </div>
            <div className="tribe-selection-indicator" style={{ color: tribe.accent.main }}>
              <ChevronRight size={16} style={{ transform: selectedTribe === tribe.code ? 'rotate(90deg)' : 'none', transition: 'transform 0.3s' }} />
            </div>
          </article>
        ))}
      </section>

      {/* Tribe Detail Panel */}
      {selectedTribeData && (
        <div className="tribe-detail-panel animate-entrance" style={{ borderLeft: `4px solid ${selectedTribeData.accent.main}`, backgroundColor: selectedTribeData.accent.soft }}>
          <div className="tribe-detail-header">
            <div className="tribe-icon" style={{ backgroundColor: selectedTribeData.accent.main + '20', color: selectedTribeData.accent.dark }}>
              <Tent size={28} />
            </div>
            <div>
              <h2 style={{ color: selectedTribeData.accent.dark }}>Tribo de {selectedTribeData.name}</h2>
              <p style={{ color: selectedTribeData.accent.dark, opacity: 0.8, fontSize: '13px' }}>{selectedTribeData.ministrySummary}</p>
            </div>
          </div>
          <div className="tribe-detail-stats">
            <div className="tribe-stat-box" style={{ backgroundColor: 'white' }}>
              <strong style={{ color: selectedTribeData.accent.dark, fontSize: '24px' }}>{selectedTribeData.memberCount}</strong>
              <span>Membros</span>
            </div>
            <div className="tribe-stat-box" style={{ backgroundColor: 'white' }}>
              <strong style={{ color: selectedTribeData.accent.dark, fontSize: '24px' }}>{selectedTribeData.cellCount}</strong>
              <span>Células</span>
            </div>
          </div>
        </div>
      )}

      {/* Cells Section */}
      <section className="tribes-cells-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              {selectedTribe ? `Células da Tribo ${selectedTribeData?.name}` : "Todas as Células"}
            </p>
            <h2>{selectedTribe ? "Comunidades Vinculadas" : "Visão Geral de Grupos"}</h2>
          </div>
          <div className="section-actions">
            <span className="soft-pill">{filteredGroups.length} grupos</span>
            {selectedTribe && (
              <button 
                className="soft-pill" 
                style={{ cursor: 'pointer', border: 'none', background: '#f1f5f9' }}
                onClick={() => setSelectedTribe(null)}
              >
                Ver todos
              </button>
            )}
          </div>
        </div>

        <div className="cells-list-grid">
          {filteredGroups.length > 0 ? (
            filteredGroups.map(group => {
              const accent = getTribeAccent(group.tribeCode);
              const dayLabel = getDayLabel(group.meetingDayOfWeek);
              return (
                <div key={group.id} className="cell-compact-card animate-entrance">
                  <div 
                    className="cell-tribe-tag" 
                    style={{ backgroundColor: accent.soft, color: accent.dark }}
                  >
                    <Tent size={10} />
                    {group.tribeCode || "Sem Tribo"}
                  </div>
                  <div className="cell-content">
                    <h3>{group.name}</h3>
                    <p>{group.city}, {group.state} • {dayLabel} {group.meetingTime}</p>
                  </div>
                  <Link href={`/groups/${group.id}`} className="icon-button" style={{ color: accent.main }}>
                    <ChevronRight size={16} />
                  </Link>
                </div>
              );
            })
          ) : (
            <div className="empty-state-card">
              <Waypoints size={32} opacity={0.2} />
              <p>Nenhuma célula vinculada a esta tribo ainda.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function getDayLabel(day?: number) {
  const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  return day !== undefined ? days[day] : "";
}

function getTribeAccent(code?: TribeCode | string) {
  const accents: Record<string, { main: string; soft: string; dark: string }> = {
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
    default:  { main: "#94a3b8", soft: "#f1f5f9", dark: "#334155" }
  };

  return accents[code as string] || accents.default;
}
