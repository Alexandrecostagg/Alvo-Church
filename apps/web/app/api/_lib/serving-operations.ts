import { assertWhatsappContactAllowed } from "./communication-operations";
import { SERVING_STATUSES } from "../../../src/features/serving/serving-contract";
import { createHash } from "node:crypto";
import {
  AccountError,
  accountTransaction,
  type AccountTransaction,
} from "./member-account-store";
import { financeActor, textField } from "./finance-operations";
import { assertModuleEnabled } from "./module-access";
import { documentId } from "./member-account";
import {
  servingInstant,
  servingDate,
} from "../../../src/features/serving/serving-contract";
import { channelForOrg } from "./whatsapp-config";
import { enqueueStaffWhatsapp } from "./whatsapp-outbox";
import { whatsappPhone } from "@alvo/utils";
import { isLocalQaFirebase } from "./firebase-server-env";
const digest = (s: string) => createHash("sha256").update(s).digest("hex");
async function actor(tx: AccountTransaction, orgId: string, uid: string) {
  await assertModuleEnabled(tx, `organizations/${orgId}`, "volunteers");
  return financeActor(tx, orgId, uid, true, null);
}
function areaOf(teams: Record<string, any>[], a: Record<string, any>) {
  return teams.find(
    (t) =>
      t.id === a.serviceTeamId ||
      t.code === a.ministryCode ||
      t.code === a.serviceTeamId,
  );
}
async function recipient(
  tx: AccountTransaction,
  root: string,
  orgId: string,
  personId: string,
) {
  const [claim] = await tx.read(`${root}/memberAccountClaims/${personId}`);
  if (
    !claim?.userId ||
    claim.organizationId !== orgId ||
    claim.personId !== personId
  )
    return null;
  const uid = documentId(claim.userId, "Conta");
  const [user, link] = await tx.read(
    `${root}/users/${uid}`,
    `${root}/memberAccountLinks/${uid}`,
  );
  return user?.isActive === true &&
    user.organizationId === orgId &&
    user.personId === personId &&
    link?.verifiedBy &&
    link.personId === personId &&
    link.userId === uid &&
    link.organizationId === orgId
    ? uid
    : null;
}
export async function servingOperation(raw: Record<string, any>, uid: string) {
  const orgId = documentId(raw.organizationId, "Instituição");
  return accountTransaction(async (tx) => {
    const { root, org } = await actor(tx, orgId, uid),
      timezone = org.timezone || "America/Belem";
    if (raw.action === "snapshot") {
      const [teams, rows, people] = await Promise.all([
        tx.query(root, "serviceTeams", undefined, undefined, "EQUAL", 501),
        tx.query(
          root,
          "serviceAssignments",
          undefined,
          undefined,
          "EQUAL",
          1000,
        ),
        tx.query(root, "people", "status", "active", "EQUAL", 1000),
      ]);
      const swaps = await tx.query(
        root,
        "scheduleSwapRequests",
        "status",
        "pending",
        "EQUAL",
        100,
      );
      if (teams.length > 500 || rows.length === 1000 || people.length === 1000)
        throw new AccountError(
          409,
          "Volume acima do limite desta consulta. Procure o suporte para dividir o período.",
        );
      return {
        timezone,
        whatsappConnected: !!channelForOrg(orgId),
        swaps: swaps.filter((row) => row.organizationId === orgId),
        teams: teams.filter((t) => t.organizationId === orgId),
        people: people
          .filter((p) => p.organizationId === orgId && p.personType !== "child")
          .map((p) => ({
            id: p.id,
            firstName: p.firstName,
            lastName: p.lastName,
            memberStatus: p.memberStatus,
            hasPhone: !!whatsappPhone(p.whatsappPhone || p.mobilePhone),
          })),
        assignments: rows
          .filter((a) => a.organizationId === orgId)
          .map((a) => ({
            ...a,
            areaName:
              areaOf(teams, a)?.name ||
              a.areaName ||
              a.ministryCode ||
              "Área antiga",
          })),
      };
    }
    if (raw.action === "save-area") {
      const id = raw.id
        ? documentId(raw.id, "Área")
        : `area_${crypto.randomUUID()}`;
      const name = textField(raw.name, "Nome da área", 100),
        summary = textField(raw.summary, "Descrição", 500, true);
      if (
        !Array.isArray(raw.roles) ||
        raw.roles.length < 1 ||
        raw.roles.length > 30
      )
        throw new AccountError(400, "Cadastre de 1 a 30 funções nesta área.");
      const roles = raw.roles.map((r: unknown) => textField(r, "Função", 80));
      if (
        new Set(roles.map((r: string) => r.toLocaleLowerCase("pt-BR"))).size !==
        roles.length
      )
        throw new AccountError(400, "Não repita funções.");
      const target = Number(raw.targetVolunteers);
      if (
        !Number.isInteger(target) ||
        target < 1 ||
        target > 200 ||
        !["active", "inactive"].includes(raw.status)
      )
        throw new AccountError(400, "Confira a meta e a situação da área.");
      const [existing] = await tx.read(`${root}/serviceTeams/${id}`);
      if (raw.id && (!existing || existing.organizationId !== orgId))
        throw new AccountError(404, "Área não encontrada.");
      const teams = await tx.query(
        root,
        "serviceTeams",
        undefined,
        undefined,
        "EQUAL",
        501,
      );
      if (
        teams.some(
          (t) =>
            t.id !== id &&
            t.name?.trim().toLocaleLowerCase("pt-BR") ===
              name.toLocaleLowerCase("pt-BR"),
        )
      )
        throw new AccountError(409, "Já existe uma área com esse nome.");
      if (!existing && teams.length >= 500)
        throw new AccountError(409, "Limite de áreas atingido.");
      const team = {
        ...existing,
        id,
        organizationId: orgId,
        code: existing?.code || id,
        name,
        summary,
        roles,
        targetVolunteers: target,
        status: raw.status,
        updatedAt: new Date().toISOString(),
      };
      tx.set(`${root}/serviceTeams/${id}`, team);
      tx.set(`${root}/servingAudit/${crypto.randomUUID()}`, {
        organizationId: orgId,
        actorId: uid,
        action: "save-area",
        areaId: id,
        at: new Date().toISOString(),
      });
      return { ok: true, team };
    }
    if (raw.action === "create") {
      const requestId = documentId(raw.requestId, "Tentativa"),
        teamId = documentId(raw.teamId, "Área"),
        role = textField(raw.role, "Função", 80),
        serviceName = textField(
          raw.serviceName,
          "Nome do culto ou evento",
          100,
        );
      if (
        !Array.isArray(raw.personIds) ||
        !raw.personIds.length ||
        raw.personIds.length > 30
      )
        throw new AccountError(400, "Selecione de 1 a 30 pessoas.");
      const personIds = raw.personIds
        .map((id: unknown) => documentId(id, "Pessoa"))
        .sort();
      if (new Set(personIds).size !== personIds.length)
        throw new AccountError(400, "Pessoas repetidas na escala.");
      let startsAt: string;
      try {
        startsAt = servingInstant(raw.date, raw.time, timezone);
      } catch (e) {
        throw new AccountError(
          400,
          e instanceof Error ? e.message : "Confira o horário.",
        );
      }
      if (Date.parse(startsAt) < Date.now() - 60000)
        throw new AccountError(400, "Escolha um horário futuro.");
      const duration = Number(raw.durationMinutes);
      if (!Number.isInteger(duration) || duration < 15 || duration > 720)
        throw new AccountError(400, "Duração deve ser entre 15 e 720 minutos.");
      const endsAt = new Date(
        Date.parse(startsAt) + duration * 60000,
      ).toISOString();
      const fingerprint = digest(
        JSON.stringify({
          teamId,
          role,
          serviceName,
          personIds,
          startsAt,
          endsAt,
        }),
      );
      const attemptPath = `${root}/servingAttempts/${uid}_${requestId}`;
      const [previous, team, ...people] = await tx.read(
        attemptPath,
        `${root}/serviceTeams/${teamId}`,
        ...personIds.map((id: string) => `${root}/people/${id}`),
      );
      if (previous) {
        if (previous.fingerprint !== fingerprint)
          throw new AccountError(
            409,
            "Tentativa já utilizada. Reabra o formulário.",
          );
        return { ...previous.result, replayed: true };
      }
      if (!team || team.organizationId !== orgId || team.status !== "active")
        throw new AccountError(
          409,
          "Escolha uma área ativa cadastrada nesta igreja.",
        );
      if (!Array.isArray(team.roles) || !team.roles.includes(role))
        throw new AccountError(
          409,
          "Cadastre esta função na área antes de escalar.",
        );
      if (
        people.some(
          (p) =>
            !p ||
            p.organizationId !== orgId ||
            p.status !== "active" ||
            p.personType === "child",
        )
      )
        throw new AccountError(
          409,
          "Confira os cadastros ativos das pessoas selecionadas.",
        );
      const histories = await Promise.all(
        personIds.map((id: string) =>
          tx.query(root, "serviceAssignments", "personId", id, "EQUAL", 501),
        ),
      );
      if (histories.some((rows) => rows.length > 500))
        throw new AccountError(
          409,
          "Muitas escalas para conferir conflitos. Procure o suporte.",
        );
      histories.forEach((rows, i) => {
        const conflict = rows.find(
          (a) =>
            !["declined", "cancelled", "absent"].includes(a.status) &&
            Date.parse(a.serviceDate) < Date.parse(endsAt) &&
            Date.parse(
              a.endsAt ||
                new Date(Date.parse(a.serviceDate) + 7200000).toISOString(),
            ) > Date.parse(startsAt),
        );
        if (conflict)
          throw new AccountError(
            409,
            `${people[i]?.firstName || "Pessoa"}: já existe uma escala nesse intervalo. Ajuste o horário ou a pessoa.`,
          );
      });
      const claims = await tx.read(
        ...personIds.map((id: string) => `${root}/memberAccountClaims/${id}`),
      );
      const recipients = await Promise.all(
        claims.map(async (c, i) => {
          if (
            !c?.userId ||
            c.organizationId !== orgId ||
            c.personId !== personIds[i]
          )
            return null;
          const userId = documentId(c.userId, "Conta");
          const [user, link] = await tx.read(
            `${root}/users/${userId}`,
            `${root}/memberAccountLinks/${userId}`,
          );
          return user?.isActive === true &&
            user.organizationId === orgId &&
            user.personId === personIds[i] &&
            link?.verifiedBy &&
            link.personId === personIds[i] &&
            link.userId === userId &&
            link.organizationId === orgId
            ? userId
            : null;
        }),
      );
      const now = new Date().toISOString();
      const rows = personIds.map((personId: string, i) => {
        const id = `scale_${digest(`${uid}:${requestId}:${personId}`).slice(0, 32)}`;
        const row = {
          id,
          organizationId: orgId,
          serviceTeamId: teamId,
          ministryCode: team.code,
          areaName: team.name,
          personId,
          role,
          serviceName,
          serviceDate: startsAt,
          endsAt,
          timezone,
          status: "pending",
          createdAt: now,
          updatedAt: now,
          createdByUserId: uid,
          pushStatus: recipients[i] ? "pending" : "unlinked",
          notificationUserId: recipients[i],
        };
        tx.set(`${root}/serviceAssignments/${id}`, row);
        return row;
      });
      const result = { ok: true, assignments: rows, replayed: false };
      tx.set(attemptPath, { fingerprint, result, createdAt: now });
      tx.set(`${root}/servingAudit/${crypto.randomUUID()}`, {
        organizationId: orgId,
        actorId: uid,
        action: "create",
        assignmentIds: rows.map((a) => a.id),
        at: now,
      });
      return result;
    }
    if (raw.action === "replace" || raw.action === "swap") {
      let swap: Record<string, any> | null = null;
      if (raw.action === "swap") {
        const [row] = await tx.read(
          `${root}/scheduleSwapRequests/${documentId(raw.swapId, "Troca")}`,
        );
        swap = row;
        if (!swap || swap.organizationId !== orgId || swap.status !== "pending")
          throw new AccountError(409, "Solicitação de troca indisponível.");
        if (raw.decision === "declined") {
          tx.patch(`${root}/scheduleSwapRequests/${raw.swapId}`, {
            status: "declined",
            updatedAt: new Date().toISOString(),
          });
          return { ok: true };
        }
      }
      const id = documentId(swap?.assignmentId || raw.assignmentId, "Escala"),
        personId = documentId(
          swap?.proposedReplacementPersonId ||
            swap?.targetPersonId ||
            raw.personId,
          "Substituto",
        );
      const [original, person] = await tx.read(
        `${root}/serviceAssignments/${id}`,
        `${root}/people/${personId}`,
      );
      if (
        original?.organizationId !== orgId ||
        original.status === "cancelled" ||
        !person ||
        person.organizationId !== orgId ||
        person.status !== "active" ||
        person.personType === "child" ||
        personId === original.personId ||
        (swap && swap.requestorPersonId !== original.personId)
      )
        throw new AccountError(
          409,
          "Confira a escala original e o substituto.",
        );
      if (Date.parse(original.serviceDate) < Date.now())
        throw new AccountError(
          409,
          "Só é possível substituir em uma escala futura.",
        );
      const rows = await tx.query(
          root,
          "serviceAssignments",
          "personId",
          personId,
          "EQUAL",
          501,
        ),
        end =
          original.endsAt ||
          new Date(Date.parse(original.serviceDate) + 7200000).toISOString();
      if (
        rows.length > 500 ||
        rows.some(
          (a) =>
            !["declined", "cancelled", "absent"].includes(a.status) &&
            Date.parse(a.serviceDate) < Date.parse(end) &&
            Date.parse(
              a.endsAt ||
                new Date(Date.parse(a.serviceDate) + 7200000).toISOString(),
            ) > Date.parse(original.serviceDate),
        )
      )
        throw new AccountError(
          409,
          "O substituto já tem escala nesse intervalo.",
        );
      const linked = await recipient(tx, root, orgId, personId),
        now = new Date().toISOString(),
        nextId = `replacement_${digest(id + ":" + personId).slice(0, 32)}`;
      const next = {
        ...original,
        id: nextId,
        personId,
        status: "pending",
        responseNote: "",
        responseSource: null,
        confirmedAt: null,
        declinedAt: null,
        pushTicketId: null,
        pushAttemptedAt: null,
        pushStatus: linked ? "pending" : "unlinked",
        notificationUserId: linked,
        createdAt: now,
        updatedAt: now,
        replacesAssignmentId: id,
      };
      tx.patch(`${root}/serviceAssignments/${id}`, {
        status: "cancelled",
        updatedAt: now,
        replacedByAssignmentId: nextId,
      });
      tx.set(`${root}/serviceAssignments/${nextId}`, next);
      if (swap)
        tx.patch(`${root}/scheduleSwapRequests/${raw.swapId}`, {
          status: "accepted",
          updatedAt: now,
        });
      tx.set(`${root}/servingAudit/${crypto.randomUUID()}`, {
        organizationId: orgId,
        action: "replacement",
        actorId: uid,
        originalId: id,
        replacementId: nextId,
        at: now,
      });
      return { ok: true, notifyAssignmentIds: [nextId] };
    }
    const id = documentId(raw.assignmentId, "Escala"),
      path = `${root}/serviceAssignments/${id}`,
      [assignment] = await tx.read(path);
    if (!assignment || assignment.organizationId !== orgId)
      throw new AccountError(404, "Escala não encontrada.");
    if (raw.action === "notify") {
      if (assignment.status !== "pending")
        throw new AccountError(
          409,
          "O convite já foi respondido ou cancelado.",
        );
      if (["accepted", "sending", "uncertain"].includes(assignment.pushStatus))
        throw new AccountError(
          409,
          "O aviso anterior foi aceito ou tem resultado incerto. Não será duplicado.",
        );
      const linked = await recipient(tx, root, orgId, assignment.personId);
      tx.patch(path, {
        notificationUserId: linked,
        pushStatus: linked ? "pending" : "unlinked",
      });
      return { ok: true, notifyAssignmentIds: linked ? [id] : [] };
    }
    if (raw.action === "status") {
      if (
        ![
          "pending",
          "confirmed",
          "declined",
          "present",
          "absent",
          "cancelled",
        ].includes(raw.status)
      )
        throw new AccountError(400, "Situação inválida.");
      if (assignment.status === "cancelled")
        throw new AccountError(
          409,
          "Uma escala cancelada não pode ser reativada. Crie uma nova.",
        );
      tx.patch(path, {
        status: raw.status,
        responseNote:
          raw.note === undefined
            ? assignment.responseNote || ""
            : textField(raw.note, "Observação", 500, true),
        confirmedAt:
          raw.status === "confirmed" ? new Date().toISOString() : null,
        declinedAt: raw.status === "declined" ? new Date().toISOString() : null,
        updatedAt: new Date().toISOString(),
        responseSource: "admin",
      });
      tx.set(`${root}/servingAudit/${crypto.randomUUID()}`, {
        organizationId: orgId,
        actorId: uid,
        assignmentId: id,
        action: "status",
        before: assignment.status,
        after: raw.status,
        at: new Date().toISOString(),
      });
      return { ok: true };
    }
    throw new AccountError(400, "Operação inválida.");
  });
}
/** Claim once before the provider call. Accepted is not proof of delivery to a phone. */
export async function dispatchServingPush(
  orgId: string,
  id: string,
  transport: typeof fetch = fetch,
) {
  const attempt = await accountTransaction(async (tx) => {
    const root = `organizations/${orgId}`,
      [a] = await tx.read(`${root}/serviceAssignments/${id}`);
    if (
      !a ||
      a.status === "cancelled" ||
      a.pushStatus !== "pending" ||
      !a.notificationUserId
    )
      return null;
    await assertModuleEnabled(tx, root, "volunteers");
    const [org, user, link, claim, person] = await tx.read(
      root,
      `${root}/users/${a.notificationUserId}`,
      `${root}/memberAccountLinks/${a.notificationUserId}`,
      `${root}/memberAccountClaims/${a.personId}`,
      `${root}/people/${a.personId}`,
    );
    if (
      org?.status !== "active" ||
      user?.isActive !== true ||
      user.organizationId !== orgId ||
      user.personId !== a.personId ||
      person?.status !== "active" ||
      !link?.verifiedBy ||
      link.personId !== a.personId ||
      claim?.userId !== a.notificationUserId ||
      claim?.organizationId !== orgId ||
      claim?.personId !== a.personId ||
      link?.userId !== a.notificationUserId ||
      link?.organizationId !== orgId ||
      person?.organizationId !== orgId
    ) {
      tx.patch(`${root}/serviceAssignments/${id}`, { pushStatus: "unlinked" });
      return null;
    }
    const token = user.expoPushToken;
    if (
      typeof token !== "string" ||
      !/^(Expo|Exponent)PushToken\[[A-Za-z0-9_-]+\]$/.test(token)
    ) {
      tx.patch(`${root}/serviceAssignments/${id}`, { pushStatus: "no_device" });
      return null;
    }
    if (isLocalQaFirebase() && transport === fetch) {
      tx.patch(`${root}/serviceAssignments/${id}`, { pushStatus: "test_mode" });
      return null;
    }
    tx.patch(`${root}/serviceAssignments/${id}`, {
      pushStatus: "sending",
      pushAttemptedAt: new Date().toISOString(),
    });
    return { a, token };
  });
  if (!attempt) return;
  let patch: Record<string, unknown> = { pushStatus: "uncertain" };
  try {
    const response = await transport("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.EXPO_ACCESS_TOKEN
          ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` }
          : {}),
      },
      body: JSON.stringify({
        to: attempt.token,
        title: "Nova escala para responder",
        body: "A liderança incluiu você em uma escala. Abra o app para conferir e responder.",
        sound: "default",
        data: {
          type: "serving_assignment",
          organizationId: orgId,
          assignmentId: id,
        },
      }),
      signal: AbortSignal.timeout(8000),
      redirect: "error",
    });
    const result = await response.json();
    const ticket = Array.isArray(result.data) ? result.data[0] : result.data;
    patch =
      response.ok && ticket?.status === "ok" && typeof ticket.id === "string"
        ? { pushStatus: "accepted", pushTicketId: ticket.id }
        : { pushStatus: response.status >= 500 ? "uncertain" : "failed" };
  } catch {}
  await accountTransaction(async (tx) => {
    const path = `organizations/${orgId}/serviceAssignments/${id}`,
      [a] = await tx.read(path);
    if (a?.pushStatus === "sending") tx.patch(path, patch);
  });
}
export async function sendServingWhatsapp(
  orgId: string,
  id: string,
  uid: string,
  requestId: string,
) {
  const data = await accountTransaction(async (tx) => {
    const { root, org } = await actor(tx, orgId, uid);
    const [a] = await tx.read(`${root}/serviceAssignments/${id}`);
    if (a?.organizationId !== orgId || a.status === "cancelled")
      throw new AccountError(404, "Escala indisponível.");
    const [p, binding, team] = await tx.read(
      `${root}/people/${a.personId}`,
      `${root}/whatsappBindings/${a.personId}`,
      `${root}/serviceTeams/${a.serviceTeamId}`,
    );
    const phone = whatsappPhone(p?.whatsappPhone || p?.mobilePhone);
    const linked = await recipient(tx, root, orgId, a.personId);
    const [contact] = await tx.read(
      `${root}/whatsappContacts/${digest(phone || "invalid")}`,
    );
    if (
      !phone ||
      !linked ||
      p?.organizationId !== orgId ||
      p?.status !== "active" ||
      binding?.phone !== phone ||
      binding?.userId !== linked ||
      binding?.organizationId !== orgId ||
      binding?.personId !== a.personId ||
      contact?.userId !== linked ||
      contact?.personId !== a.personId
    )
      throw new AccountError(
        409,
        "O membro precisa vincular este WhatsApp pelo portal antes do envio automático.",
      );
    return {
      to: phone,
      text: `Você foi escalado(a) em ${team?.name || a.areaName || a.ministryCode}, função ${a.role}, para ${servingDate(a.serviceDate, org.timezone)}.\nEnvie MINHAS ESCALAS para consultar e responder sem instalar aplicativo.`,
    };
  });
  // Existing dispatcher enforces opt-out, the 24-hour window and approved paid templates.
  if (isLocalQaFirebase())
    throw new AccountError(409, "Envio real bloqueado no ambiente de teste.");
  return enqueueStaffWhatsapp(
    { organizationId: orgId, requestId, kind: "text", ...data },
    uid,
  );
}

export async function prepareServingWhatsapp(
  orgId: string,
  id: string,
  uid: string,
  requestId: string,
) {
  return accountTransaction(async (tx) => {
    const { root, org } = await actor(tx, orgId, uid);
    await assertModuleEnabled(tx, root, "communication");
    const [assignment] = await tx.read(`${root}/serviceAssignments/${id}`);
    if (
      assignment?.organizationId !== orgId ||
      assignment.status === "cancelled"
    )
      throw new AccountError(404, "Escala indisponível.");
    const [person, team] = await tx.read(
      `${root}/people/${assignment.personId}`,
      `${root}/serviceTeams/${assignment.serviceTeamId}`,
    );
    if (
      person?.organizationId !== orgId ||
      person.status !== "active" ||
      person.communicationOptOut ||
      person.whatsappOptOutAt
    )
      throw new AccountError(409, "O cadastro não permite mensagens.");
    const phone = whatsappPhone(person.whatsappPhone || person.mobilePhone);
    if (!phone)
      throw new AccountError(409, "Confira o WhatsApp no cadastro da pessoa.");
    await assertWhatsappContactAllowed(tx, root, phone);
    const status =
      assignment.status === "pending"
        ? "Por favor, confirme sua disponibilidade."
        : `Situação registrada: ${SERVING_STATUSES[assignment.status] || assignment.status}.`;
    const text = `Olá! Sua escala em ${team?.name || assignment.areaName || assignment.ministryCode}, função ${assignment.role}, é em ${servingDate(assignment.serviceDate, org.timezone)} (${assignment.serviceName || "Serviço"}). ${status}\n${channelForOrg(orgId) ? "Se seu WhatsApp já está vinculado à igreja, envie MINHAS ESCALAS ao número da igreja para consultar e responder." : "Responda à liderança. No envio manual, o administrador registra a resposta no sistema."}`;
    tx.set(`${root}/communicationAudit/serving_${uid}_${requestId}`, {
      organizationId: orgId,
      assignmentId: id,
      action: "manual_serving_contact_prepared",
      actorId: uid,
      at: new Date().toISOString(),
    });
    return {
      url: `https://wa.me/${phone}?text=${encodeURIComponent(text)}`,
      status: "prepared",
    };
  });
}
