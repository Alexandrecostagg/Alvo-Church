import { accountTransaction, AccountError } from "./member-account-store";
import { careContext, careName, leaderCanCare } from "./pastoral-care";
import { boundPerson } from "./journey-operations";
import { isActiveGroupMembership, isCellGroup } from "@alvo/domain";
type Data = Record<string, any>;
export async function pastoralRadar(body: Data, uid: string) {
  return accountTransaction(async (tx) => {
    const c = await careContext(tx, body, uid);
    if (c.profile === "network")
      throw new AccountError(
        403,
        "A rede recebe somente indicadores consolidados.",
      );
    const now = Date.now(),
      warnings: string[] = [],
      signals: Array<{
        personId: string;
        name: string;
        kind: string;
        detail: string;
        groupId?: string;
      }> = [];
    const loadedPeople = await tx.query(
      c.root,
      "people",
      "status",
      "active",
      "EQUAL",
      501,
    );
    const people = loadedPeople.filter((p) => p.organizationId === c.orgId);
    const peopleMap = new Map(
      people.filter((p) => p.organizationId === c.orgId).map((p) => [p.id, p]),
    );
    if (loadedPeople.length > 500)
      warnings.push(
        "Radar limitado a 500 cadastros ativos. Os sinais não representam toda a instituição.",
      );
    const [features] = await tx.read(c.root + "/settings/features");
    const enabled = (key: string) =>
      features?.modules?.[key]?.enabled !== false;
    const add = (p: Data, kind: string, detail: string, groupId?: string) =>
      signals.push({
        personId: p.id,
        name: careName(p),
        kind,
        detail,
        ...(groupId ? { groupId } : {}),
      });
    if (c.staff) {
      const attendance = await tx.query(
        c.root,
        "churchAttendance",
        undefined,
        undefined,
        "EQUAL",
        2001,
        undefined,
        { field: "serviceDate", direction: "DESCENDING" },
      );
      if (attendance.length > 2000)
        warnings.push(
          "Presença em culto: histórico acima do limite; sinais de intervalo não calculados.",
        );
      else {
        const last = new Map<string, string>();
        for (const r of attendance.filter(
          (a) =>
            a.organizationId === c.orgId && Date.parse(a.serviceDate) <= now,
        )) {
          if (!last.has(r.personId)) last.set(r.personId, r.serviceDate);
        }
        for (const p of people.slice(0, 500)) {
          const date = last.get(p.id);
          if (!date) continue;
          const days = Math.floor((now - Date.parse(date)) / 86400000);
          if (days >= 45)
            add(
              p,
              "culto",
              `${days} dias desde a última presença registrada (${date.slice(0, 10)}). Confirme se houve falha de registro antes de contatar.`,
            );
        }
        const unknown = people.filter((p) => !last.has(p.id)).length;
        if (unknown)
          warnings.push(
            `${unknown} cadastro(s) sem presença de culto registrada. Ausência de registro não comprova afastamento.`,
          );
      }
      if (enabled("volunteers")) {
        const upcoming = await tx.query(
          c.root,
          "serviceAssignments",
          "serviceDate",
          new Date(now).toISOString().slice(0, 10),
          "GREATER_THAN_OR_EQUAL",
          1001,
          {
            field: "serviceDate",
            value: new Date(now + 30 * 86400000).toISOString(),
            op: "LESS_THAN_OR_EQUAL",
          },
        );
        if (upcoming.length > 1000)
          warnings.push(
            "Escalas: período excede o limite; sinal de múltiplas equipes não calculado.",
          );
        else {
          const teams = new Map<string, Set<string>>();
          for (const a of upcoming.filter(
            (a) =>
              a.organizationId === c.orgId &&
              ["pending", "accepted", "confirmed"].includes(a.status) &&
              a.serviceTeamId,
          )) {
            const set = teams.get(a.personId) || new Set<string>();
            set.add(a.serviceTeamId);
            teams.set(a.personId, set);
          }
          for (const [id, set] of teams) {
            const p = peopleMap.get(id);
            if (p && set.size >= 3)
              add(
                p,
                "escala",
                `Escalas em ${set.size} equipes nos próximos 30 dias. Verifique a disponibilidade; isso não comprova sobrecarga.`,
              );
          }
        }
      }
      if (enabled("journeys")) {
        const newcomers = people
          .slice(0, 500)
          .filter((p) => p.memberStatus === "new_believer");
        const profiles = await tx.read(
          ...newcomers.map((p) => c.root + "/journeyProfiles/" + p.id),
        );
        newcomers.forEach((p, i) => {
          if (
            !profiles[i] ||
            profiles[i]?.organizationId !== c.orgId ||
            !(profiles[i]?.progressPercent > 0)
          )
            add(
              p,
              "integracao",
              "Novo convertido sem progresso de discipulado registrado. Confirme o acompanhamento.",
            );
        });
      }
    }
    const leaderPerson = c.staff
      ? null
      : await boundPerson(tx, c.root, c.orgId, uid);
    if (enabled("groups")) {
      const groups = await tx.query(
        c.root,
        "groups",
        "status",
        "active",
        "EQUAL",
        101,
      );
      if (groups.length > 100)
        warnings.push("Células: análise limitada a 100 grupos.");
      for (const g of groups
        .slice(0, 100)
        .filter((g) => g.organizationId === c.orgId && isCellGroup(g))) {
        const members = await tx.query(
          c.root + "/groups/" + g.id,
          "members",
          undefined,
          undefined,
          "EQUAL",
          501,
        );
        if (members.length > 500) {
          warnings.push(
            `Célula ${g.name}: vínculos acima do limite; análise indisponível.`,
          );
          continue;
        }
        if (
          !c.staff &&
          (!leaderPerson ||
            !(await leaderCanCare(tx, c, uid, leaderPerson, g.id)))
        )
          continue;
        const meetings = await tx.query(
          c.root + "/groups/" + g.id,
          "meetings",
          "meetingStatus",
          "completed",
          "EQUAL",
          31,
          undefined,
          { field: "scheduledStartAt", direction: "DESCENDING" },
        );
        const recent = meetings
          .filter(
            (m) =>
              m.organizationId === c.orgId &&
              m.groupId === g.id &&
              Date.parse(m.scheduledStartAt) <= now &&
              Date.parse(m.scheduledStartAt) >= now - 45 * 86400000,
          )
          .slice(0, 3);
        if (recent.length < 2) continue;
        const records = await Promise.all(
          recent.map((m) =>
            tx.query(
              c.root + "/groups/" + g.id + "/meetings/" + m.id,
              "attendance",
              undefined,
              undefined,
              "EQUAL",
              501,
            ),
          ),
        );
        if (records.some((r) => r.length > 500)) {
          warnings.push(
            `Célula ${g.name}: presenças acima do limite; análise indisponível.`,
          );
          continue;
        }
        for (const m of members.filter(
          (m) =>
            m.organizationId === c.orgId &&
            m.groupId === g.id &&
            isActiveGroupMembership(m),
        )) {
          const p = peopleMap.get(m.personId);
          if (!p) continue;
          const absent = records.filter((rows, i) =>
            rows.some(
              (a) =>
                a.organizationId === c.orgId &&
                a.groupId === g.id &&
                a.groupMeetingId === recent[i].id &&
                a.personId === p.id &&
                a.attendanceStatus === "absent",
            ),
          ).length;
          if (absent >= 2)
            add(
              p,
              "celula",
              `${absent} ausências registradas nos últimos ${recent.length} encontros concluídos de ${g.name}, dentro de 45 dias.`,
              g.id,
            );
        }
      }
    }
    return {
      signals,
      warnings,
      asOf: new Date(now).toISOString(),
      scope: c.staff ? "institution" : "cells",
    };
  });
}
