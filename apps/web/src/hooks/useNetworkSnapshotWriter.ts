"use client";

import { useEffect } from "react";
import {
  saveNetworkSnapshot,
  fetchPeople,
  fetchGroups,
  isFirebaseWebRuntimeConfigured,
} from "@alvo/firebase";
import { cachedFetchPeople, cachedFetchGroups } from "../lib/org-data-cache";
import type { NetworkSnapshot } from "@alvo/types";
import { useAppAuth } from "../../app/providers";

// O snapshot é diário — depois que um navegador escreveu o de hoje, não há
// motivo pra refazer a leitura pesada (até 2000 pessoas + grupos) em cada
// navegação/reload. A guarda por localStorage derruba esse custo pra 1x/dia
// por navegador.
const LS_SNAPSHOT_KEY = "alvo_network_snapshot_written";

/**
 * Writes a daily NetworkSnapshot for the current org so the parent network
 * dashboard can read aggregated managerial data without accessing individual records.
 * Runs at most once per day per browser, silently in the background.
 */
export function useNetworkSnapshotWriter() {
  const { configured, firebaseReady, user, organizationId, firebaseConfig } = useAppAuth();

  useEffect(() => {
    if (!configured || !firebaseReady || !user || !organizationId) return;
    if (!isFirebaseWebRuntimeConfigured(firebaseConfig)) return;

    const today = new Date().toISOString().slice(0, 10);
    const month = today.slice(0, 7);

    // Já escreveu o snapshot de hoje para esta organização? Então nada a fazer.
    try {
      if (localStorage.getItem(LS_SNAPSHOT_KEY) === `${organizationId}:${today}`) return;
    } catch {
      // localStorage indisponível — segue com o write normal
    }

    async function writeSnapshot() {
      try {
        const [people, groups] = await Promise.all([
          cachedFetchPeople(firebaseConfig, { organizationId }, 2000),
          cachedFetchGroups(firebaseConfig, { organizationId }),
        ]);

        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        const totalMembers    = people.filter(p => p.memberStatus !== "visitor").length;
        const visitors        = people.filter(p => p.memberStatus === "visitor").length;
        const newThisMonth    = people.filter(p => (p as unknown as { createdAt?: string }).createdAt && (p as unknown as { createdAt?: string }).createdAt! >= monthStart).length;
        const activeMembers   = people.filter(p =>
          p.memberStatus === "member" || p.memberStatus === "leader" || p.memberStatus === "volunteer"
        ).length;

        const totalGroups     = groups.length;
        const activeGroupsCount = groups.filter(g => g.status === "active").length;

        const snapshot: NetworkSnapshot = {
          id:                    today,
          organizationId:        organizationId,
          date:                  today,
          month,
          totalMembers,
          newMembersThisMonth:   newThisMonth,
          activeMembers,
          visitors,
          totalGroups,
          activeGroups:          activeGroupsCount,
          avgGroupAttendance:    0,
          eventsThisMonth:       0,
          totalEventAttendance:  0,
          givingThisMonth:       0,
          givingLastMonth:       0,
          serviceAttendanceRate: totalMembers > 0 ? Math.round((activeMembers / totalMembers) * 100) : 0,
          createdAt:             new Date().toISOString(),
        };

        await saveNetworkSnapshot(firebaseConfig, snapshot);

        try {
          localStorage.setItem(LS_SNAPSHOT_KEY, `${organizationId}:${today}`);
        } catch {
          // best-effort
        }
      } catch (e) {
        // Silent — snapshot write is best-effort
        console.warn("[NetworkSnapshot] write failed:", e);
      }
    }

    void writeSnapshot();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured, firebaseReady, user, organizationId]);
}
