"use client";
import { useEffect, useRef, useState } from "react";
import {
  fetchEvents,
  fetchServiceTeams,
  fetchTenantUsers,
  fetchKidsSettings,
} from "@alvo/firebase";
import type { Event, ServiceTeam, KidsOperationSession } from "@alvo/types";
import { useAppAuth } from "../../../app/providers";
import { kidsOperation } from "./kids-operations-client";
const localDate = (iso: string) => {
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};
export function KidsSessionManager({
  sessions,
  onChange,
}: {
  sessions: KidsOperationSession[];
  onChange: () => void;
}) {
  const { user, organizationId, firebaseConfig, hasAnyRole } = useAppAuth();
  const admin = hasAnyRole([
    "super_admin",
    "church_admin",
    "pastor",
    "secretary",
  ]);
  const [teams, setTeams] = useState<ServiceTeam[]>([]),
    [events, setEvents] = useState<Event[]>([]);
  const [operators, setOperators] = useState<
    Array<{ id: string; label: string }>
  >([]);
  const [draft, setDraft] = useState({
    sessionId: crypto.randomUUID(),
    serviceTeamId: "",
    eventId: "",
    capacity: 20,
    expectedVersion: 0,
    startsAt: localDate(new Date().toISOString()),
    endsAt: localDate(new Date(Date.now() + 3 * 3600000).toISOString()),
    operatorIds: [] as string[],
  });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  useEffect(() => {
    if (!admin) return;
    let cancelled = false;
    setTeams([]);
    setEvents([]);
    setOperators([]);
    void Promise.all([
      fetchServiceTeams(firebaseConfig, { organizationId }, 100),
      fetchEvents(firebaseConfig, { organizationId }, 100),
      fetchTenantUsers(firebaseConfig, { organizationId }),
      fetchKidsSettings(firebaseConfig, { organizationId }),
    ])
      .then(([teams, events, users, settings]) => {
        if (cancelled) return;
        setTeams(teams.filter((t) => settings?.kidsTeamIds.includes(t.id)));
        setEvents(events.filter((e) => e.status !== "cancelled"));
        setOperators(
          users
            .filter(
              (u) =>
                u.isActive &&
                u.roles.some((r) =>
                  [
                    "super_admin",
                    "church_admin",
                    "pastor",
                    "secretary",
                    ...(settings?.qrGeneratorRoles ?? []),
                  ].includes(r),
                ),
            )
            .map((u) => ({ id: u.id, label: u.email || u.id })),
        );
      })
      .catch(() => {
        if (!cancelled)
          setMessage("Não foi possível carregar salas, eventos e equipe.");
      });
    return () => {
      cancelled = true;
    };
  }, [admin, firebaseConfig, organizationId]);
  if (!admin) return null;
  return (
    <details className="panel" style={{ padding: 16, marginBlock: 16 }}>
      <summary>Administrar salas, eventos e escalas Kids</summary>
      <p>
        Configure as salas e papéis em Configurações → Kids e cadastre o evento
        antes de abrir uma sessão.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (lock.current) return;
          lock.current = true;
          setBusy(true);
          try {
            await kidsOperation(user, organizationId, {
              action: "configure",
              ...draft,
              startsAt: new Date(draft.startsAt).toISOString(),
              endsAt: new Date(draft.endsAt).toISOString(),
            });
            setMessage("Sessão e equipe confirmadas.");
            setDraft((d) => ({
              ...d,
              sessionId: crypto.randomUUID(),
              expectedVersion: 0,
            }));
            onChange();
          } catch (e) {
            setMessage(e instanceof Error ? e.message : "Falha ao salvar.");
          } finally {
            lock.current = false;
            setBusy(false);
          }
        }}
        style={{ display: "grid", gap: 12, maxWidth: 640 }}
      >
        <label>
          Sala
          <select
            required
            disabled={busy || draft.expectedVersion > 0}
            value={draft.serviceTeamId}
            onChange={(e) =>
              setDraft((d) => ({ ...d, serviceTeamId: e.target.value }))
            }
          >
            <option value="">Selecione</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Evento
          <select
            required
            disabled={busy || draft.expectedVersion > 0}
            value={draft.eventId}
            onChange={(e) =>
              setDraft((d) => ({ ...d, eventId: e.target.value }))
            }
          >
            <option value="">Selecione</option>
            {events.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Início da entrada
          <input
            type="datetime-local"
            required
            value={draft.startsAt}
            onChange={(e) =>
              setDraft((d) => ({ ...d, startsAt: e.target.value }))
            }
          />
        </label>
        <label>
          Fim da entrada
          <input
            type="datetime-local"
            required
            value={draft.endsAt}
            onChange={(e) =>
              setDraft((d) => ({ ...d, endsAt: e.target.value }))
            }
          />
        </label>
        <label>
          Capacidade
          <input
            type="number"
            min={1}
            max={100}
            required
            value={draft.capacity}
            onChange={(e) =>
              setDraft((d) => ({ ...d, capacity: Number(e.target.value) }))
            }
          />
        </label>
        <fieldset>
          <legend>Equipe escalada</legend>
          {operators.map((op) => (
            <label key={op.id} style={{ display: "block" }}>
              <input
                type="checkbox"
                checked={draft.operatorIds.includes(op.id)}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    operatorIds: e.target.checked
                      ? [...d.operatorIds, op.id]
                      : d.operatorIds.filter((id) => id !== op.id),
                  }))
                }
              />{" "}
              {op.label}
            </label>
          ))}
        </fieldset>
        <button type="submit" disabled={busy}>
          Confirmar sessão e equipe
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            setDraft((d) => ({
              ...d,
              sessionId: crypto.randomUUID(),
              expectedVersion: 0,
            }))
          }
        >
          Nova sessão
        </button>
      </form>
      <p role="status">{message}</p>
      {sessions.map((session) => (
        <div key={session.id} style={{ marginBlock: 12 }}>
          {session.roomName} · {session.eventName} · {session.occupancy}/
          {session.capacity} presentes ·{" "}
          {new Date(session.startsAt).toLocaleString("pt-BR")} —{" "}
          {new Date(session.endsAt).toLocaleTimeString("pt-BR")}
          <button
            disabled={busy}
            onClick={() =>
              setDraft({
                ...session,
                sessionId: session.id,
                expectedVersion: session.version,
                startsAt: localDate(session.startsAt),
                endsAt: localDate(session.endsAt),
              })
            }
          >
            Editar equipe / horário
          </button>
          <button
            disabled={busy || session.occupancy > 0}
            onClick={async () => {
              if (lock.current) return;
              lock.current = true;
              setBusy(true);
              try {
                await kidsOperation(user, organizationId, {
                  action: "close",
                  sessionId: session.id,
                  expectedVersion: session.version,
                });
                onChange();
                setMessage("Sessão encerrada.");
              } catch (e) {
                setMessage(
                  e instanceof Error ? e.message : "Falha ao encerrar.",
                );
              } finally {
                lock.current = false;
                setBusy(false);
              }
            }}
          >
            Encerrar
          </button>
        </div>
      ))}
    </details>
  );
}
