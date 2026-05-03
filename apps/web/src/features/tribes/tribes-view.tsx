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

const organizationId = "org_alvo_demo";

export function TribesView() {
  const { configured, firebaseReady, user } = useAppAuth();
  const [realPeople, setRealPeople] = useState<Person[]>([]);
  const [realGroups, setRealGroups] = useState<Group[]>([]);
  const [selectedTribe, setSelectedTribe] = useState<TribeCode | null>(null);

  const firebaseConfig = useMemo(
    () =>
      createFirebaseWebRuntimeConfigFromEnv({
        NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
      }),
    []
  );

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
  }, [configured, firebaseConfig, firebaseReady, user]);

  const peopleSource = (realPeople.length > 0 ? realPeople : recentPeople) as Person[];
  const groupsSource = (realGroups.length > 0 ? realGroups : activeGroups) as Group[];

  const tribesWithStats = tribeDefinitions.map(tribe => {
    const tribeMembers = peopleSource.filter(p => p.tribePrimaryCode === tribe.code);
    const tribeCells = groupsSource.filter(g => g.tribeCode === tribe.code);
    return {
      ...tribe,
      memberCount: tribeMembers.length,
      cellCount: tribeCells.length
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
          >
            <div className="tribe-icon">
              <Tent size={24} />
            </div>
            <div className="tribe-info">
              <h2>{tribe.name}</h2>
              <p>{tribe.description}</p>
            </div>
            <div className="tribe-stats">
              <div className="stat">
                <UsersRound size={14} />
                <span>{tribe.memberCount} pessoas</span>
              </div>
              <div className="stat">
                <Waypoints size={14} />
                <span>{tribe.cellCount} células</span>
              </div>
            </div>
            <div className="tribe-selection-indicator">
               <ChevronRight size={18} />
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
                <div className={`cell-tribe-tag tone-${group.tribeCode?.toLowerCase() || 'default'}`}>
                   {group.tribeCode || "Sem Tribo"}
                </div>
                <div className="cell-content">
                  <h3>{group.name}</h3>
                  <p>{group.city}, {group.state} • {group.meetingTime}</p>
                </div>
                <Link href={`/groups/${group.id}`} className="icon-button">
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
