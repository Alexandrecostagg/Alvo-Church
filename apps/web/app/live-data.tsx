"use client";

import { useEffect, useMemo, useState } from "react";
import { getBrandModeLabel, getEnabledModuleCount, getPlanTierLabel } from "@alvo/domain";
import type {
  Event,
  EventCheckIn,
  EventRegistration,
  Family,
  FollowUpTask,
  Group,
  GroupAttendance,
  GroupMeeting,
  Person,
  VisitorJourney
} from "@alvo/types";
import {
  createFirebaseWebRuntimeConfigFromEnv,
  fetchEventCheckIns,
  fetchEventRegistrations,
  fetchEvents,
  fetchFamilies,
  fetchFollowUpTasks,
  fetchGroupAttendance,
  fetchGroupMeetings,
  fetchGroups,
  fetchPeople,
  fetchVisitorJourneys,
  isFirebaseWebRuntimeConfigured
} from "@alvo/firebase";
import { useAppAuth } from "./providers";

interface LiveTenantDataProps {
  organizationId: string;
}

export function LiveTenantData({ organizationId }: LiveTenantDataProps) {
  const [people, setPeople] = useState<Person[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [visitorJourneys, setVisitorJourneys] = useState<VisitorJourney[]>([]);
  const [followUpTasks, setFollowUpTasks] = useState<FollowUpTask[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupMeetings, setGroupMeetings] = useState<GroupMeeting[]>([]);
  const [groupAttendance, setGroupAttendance] = useState<GroupAttendance[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [eventRegistrations, setEventRegistrations] = useState<EventRegistration[]>([]);
  const [eventCheckIns, setEventCheckIns] = useState<EventCheckIn[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { firebaseReady, tenantReady, tenantRuntime, user } = useAppAuth();

  const firebaseConfig = useMemo(
    () =>
      createFirebaseWebRuntimeConfigFromEnv({
        NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:
          process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:
          process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:
          process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
      }),
    []
  );

  const configured = isFirebaseWebRuntimeConfigured(firebaseConfig);

  useEffect(() => {
    if (!configured || !firebaseReady || !user) {
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [nextPeople, nextFamilies, nextVisitorJourneys, nextFollowUpTasks, nextGroups, nextEvents] = await Promise.all([
          fetchPeople(firebaseConfig, { organizationId }),
          fetchFamilies(firebaseConfig, { organizationId }),
          fetchVisitorJourneys(firebaseConfig, { organizationId }),
          fetchFollowUpTasks(firebaseConfig, { organizationId }),
          fetchGroups(firebaseConfig, { organizationId }),
          fetchEvents(firebaseConfig, { organizationId })
        ]);

        const [nextGroupMeetings, nextEventRegistrations, nextEventCheckIns] =
          await Promise.all([
            fetchGroupMeetings(firebaseConfig, { organizationId }, nextGroups),
            fetchEventRegistrations(firebaseConfig, { organizationId }, nextEvents),
            fetchEventCheckIns(firebaseConfig, { organizationId }, nextEvents)
          ]);

        const nextGroupAttendance = await fetchGroupAttendance(
          firebaseConfig,
          { organizationId },
          nextGroupMeetings
        );

        if (cancelled) {
          return;
        }

        setPeople(nextPeople);
        setFamilies(nextFamilies);
        setVisitorJourneys(nextVisitorJourneys);
        setFollowUpTasks(nextFollowUpTasks);
        setGroups(nextGroups);
        setGroupMeetings(nextGroupMeetings);
        setGroupAttendance(nextGroupAttendance);
        setEvents(nextEvents);
        setEventRegistrations(nextEventRegistrations);
        setEventCheckIns(nextEventCheckIns);
      } catch (nextError) {
        if (cancelled) {
          return;
        }

        setError(
          nextError instanceof Error
            ? nextError.message
            : "Nao foi possivel carregar dados reais do Firebase."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [configured, firebaseConfig, firebaseReady, organizationId, user]);

  if (!configured) {
    return null;
  }

  if (!firebaseReady) {
    return (
      <article className="dashboard-card">
        <strong>Leitura real do Firebase</strong>
        <p style={{ margin: "8px 0 0", lineHeight: 1.6 }}>
          Inicializando autenticacao para consultar o Firestore...
        </p>
      </article>
    );
  }

  if (!user) {
    return (
      <article className="dashboard-card">
        <strong>Leitura real do Firebase</strong>
        <p style={{ margin: "8px 0 0", lineHeight: 1.6 }}>
          Entre no painel para consultar organization, people e families com as regras atuais.
        </p>
      </article>
    );
  }

  return (
    <article className="dashboard-card">
      <strong>Leitura real do Firebase</strong>
      <p style={{ margin: "8px 0 0", lineHeight: 1.6 }}>
        {loading
          ? "Carregando organization, people, families, visitors, groups e events..."
          : tenantRuntime?.organization
            ? `${tenantRuntime.organization.name} carregada com ${people.length} pessoa(s) e ${families.length} familia(s).`
            : "Nenhum documento encontrado ainda para a organization inicial."}
      </p>
      {tenantRuntime?.organization ? (
        <div
          style={{
            display: "grid",
            gap: 8,
            marginTop: 12,
            fontSize: 14,
            lineHeight: 1.5
          }}
        >
          <span>
            Visitantes: <strong>{visitorJourneys.length}</strong> jornada(s) e{" "}
            <strong>{followUpTasks.length}</strong> follow-up(s)
          </span>
          <span>
            Grupos: <strong>{groups.length}</strong> grupo(s),{" "}
            <strong>{groupMeetings.length}</strong> encontro(s) e{" "}
            <strong>{groupAttendance.length}</strong> presenca(s)
          </span>
          <span>
            Eventos: <strong>{events.length}</strong> evento(s),{" "}
            <strong>{eventRegistrations.length}</strong> inscricao(oes) e{" "}
            <strong>{eventCheckIns.length}</strong> check-in(s)
          </span>
          {tenantRuntime.settings ? (
            <span>
              Plano: <strong>{getPlanTierLabel(tenantRuntime.settings.subscription.planTier)}</strong> ·
              Marca: <strong>{getBrandModeLabel(tenantRuntime.settings.branding.brandMode)}</strong> ·
              Modulos ativos: <strong>{getEnabledModuleCount(tenantRuntime.settings.features)}</strong>
            </span>
          ) : null}
        </div>
      ) : null}
      {tenantReady && !tenantRuntime ? (
        <p style={{ margin: "10px 0 0", color: "#6941c6", lineHeight: 1.6 }}>
          O tenant autenticado ainda nao devolveu branding e assinatura completos.
        </p>
      ) : null}
      {error ? (
        <p style={{ margin: "10px 0 0", color: "#b42318", lineHeight: 1.6 }}>{error}</p>
      ) : null}
    </article>
  );
}
