"use client";

import { useEffect, useMemo, useState } from "react";
import { 
  createFirebaseWebRuntimeConfigFromEnv, 
  fetchGroups, 
  fetchPeople, 
  isFirebaseWebRuntimeConfigured 
} from "@alvo/firebase";
import type { Group, Person, TribeCode } from "@alvo/types";
import { useAppAuth } from "../../../app/providers";
import { activeGroups, recentPeople, tribeDefinitions } from "../../../src/lib/mock-data";
import { UsersRound, Waypoints, ChevronRight, Tent } from "lucide-react";
import Link from "next/link";

export function TribesView() {
  const { configured, firebaseReady, user, organizationId, firebaseConfig } = useAppAuth();
  const [realPeople, setRealPeople] = useState<Person[]>([]);
  const [realGroups, setRealGroups] = useState<Group[]>([]);
  const [selectedTribe, setSelectedTribe] = useState<TribeCode | null>(null);

  useEffect(() => {
    if (!configured || !firebaseReady || !user || !isFirebaseWebRuntimeConfigured(firebaseConfig)) return;

    async function loadTribesData() {
      try {
        const [people, groups] = await Promise.all([
          fetchPeople(firebaseConfig, { organizationId }, 200),
          fetchGroups(firebaseConfig, { organizationId }, 50)
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
  });

  const filteredGroups = selectedTribe 
    ? groupsSource.filter(g => g.tribeCode === selectedTribe)
    : groupsSource;

  return (
    <main className="tribes-page">
      <header className="topbar">
        <div>
          <p className="eyebrow">Ecossistema Pastoral</p>
          <h1>Tribes & Comunidades</h1>
        </div>
      </header>

      <section className="tribe-grid">
        {tribesWithStats.map((tribe) => (
          <article 
            key={tribe.code} 
            className={`tribe-card tone-${tribe.code.toLowerCase()} ${selectedTribe === tribe.code ? 'is-selected' : ''}`}
            onClick={() => setSelectedTribe(selectedTribe === tribe.code ? null : tribe.code as TribeCode)}
            style={{ 
              borderColor: selectedTribe === tribe.code ? tribe.accent.main : 'transparent',
              background: selectedTribe === tribe.code 
                ? `radial-gradient(circle at top right, ${tribe.accent.soft}, #fff)` 
                : '#fff'
            }}
          >
            <div className="tribe-icon" style={{ backgroundColor: tribe.accent.soft, color: tribe.accent.dark }}>
              <Tent size={24} />
            </div>
            <div className="tribe-info">
              <h2 style={{ color: tribe.accent.dark }}>{tribe.name}</h2>
              <p>{tribe.description}</p>
            </div>
            <div className="tribe-stats">
              <div className="stat" style={{ color: tribe.accent.main }}>
                <UsersRound size={14} />
                <span>{tribe.memberCount} pessoas</span>
              </div>
              <div className="stat" style={{ color: tribe.accent.main }}>
                <Waypoints size={14} />
                <span>{tribe.cellCount} células</span>
              </div>
            </div>
            <div className="tribe-selection-indicator" style={{ color: tribe.accent.main }}>
               <ChevronRight size={18} style={{ transform: selectedTribe === tribe.code ? 'rotate(90deg)' : 'none', transition: 'transform 0.3s' }} />
            </div>
          </article>
        ))}
      </section>

      <section className="tribes-cells-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              {selectedTribe ? `Células da Tribo ${selectedTribe}` : "Todas as Células"}
            </p>
            <h2>{selectedTribe ? "Comunidades Vinculadas" : "Visão Geral de Grupos"}</h2>
          </div>
          <div className="section-actions">
            <span className="soft-pill">{filteredGroups.length} grupos</span>
          </div>
        </div>

        <div className="cells-list-grid">
          {filteredGroups.length > 0 ? (
            filteredGroups.map(group => (
              <div key={group.id} className="cell-compact-card animate-entrance">
                <div 
                  className="cell-tribe-tag" 
                  style={{ 
                    backgroundColor: getTribeAccent(group.tribeCode).soft, 
                    color: getTribeAccent(group.tribeCode).dark 
                  }}
                >
                   {group.tribeCode || "Sem Tribo"}
                </div>
                <div className="cell-content">
                  <h3>{group.name}</h3>
                  <p>{group.city}, {group.state} • {group.meetingTime}</p>
                </div>
                <Link href={`/groups/${group.id}`} className="icon-button" style={{ color: getTribeAccent(group.tribeCode).main }}>
                   <ChevronRight size={16} />
                </Link>
              </div>
            ))
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
function getTribeAccent(code?: TribeCode) {
  const accents: Record<string, { main: string; soft: string; dark: string }> = {
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
    BENJAMIN: { main: "#6366f1", soft: "#f5f3ff", dark: "#1e1b4b" },
    REUBEN: { main: "#ef4444", soft: "#fef2f2", dark: "#7f1d1d" },
    default: { main: "#94a3b8", soft: "#f1f5f9", dark: "#334155" }
  };

  return accents[code as string] || accents.default;
}
