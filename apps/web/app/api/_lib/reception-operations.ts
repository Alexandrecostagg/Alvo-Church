import { createHash } from "node:crypto";
import {
  accountTransaction,
  AccountError,
  type AccountTransaction,
} from "./member-account-store";
import { financeActor, textField } from "./finance-operations";
import { documentId } from "./member-account";
import { assertModuleEnabled } from "./module-access";
import { registerMember } from "./member-registration";
import { currentIntegration, journeyEnabled } from "./journey-operations";
import { campaignLocalDate, campaignDay } from "@alvo/domain";
import { whatsappPhone, whatsappHref } from "@alvo/utils";
import { careEnabled } from "./pastoral-care";
import { assertWhatsappContactAllowed } from "./communication-operations";
type Data = Record<string, any>;
const digest = (v: unknown) =>
  createHash("sha256").update(JSON.stringify(v)).digest("hex");
const fullName = (p: Data) =>
  p.preferredName ||
  [p.firstName, p.lastName].filter(Boolean).join(" ") ||
  "Pessoa";
async function context(tx: AccountTransaction, body: Data, uid: string) {
  const orgId = documentId(body.organizationId, "Instituição");
  const c = await financeActor(tx, orgId, uid, true, null);
  await assertModuleEnabled(tx, c.root, "visitors");
  return { ...c, orgId, uid, timezone: c.org.timezone || "America/Belem" };
}
function approval(value: unknown) {
  if (typeof value !== "boolean")
    throw new AccountError(400, "Confirme a preferência de contato.");
  return value;
}
function audit(
  tx: AccountTransaction,
  root: string,
  id: string,
  uid: string,
  action: string,
  revision: number,
) {
  tx.set(`${root}/receptionAudit/${id}_${revision}`, {
    requestId: id,
    actorUserId: uid,
    action,
    revision,
    at: new Date().toISOString(),
  });
}
async function intake(
  tx: AccountTransaction,
  c: Awaited<ReturnType<typeof context>>,
  id: unknown,
): Promise<Data & { id: string }> {
  const key = documentId(id, "Entrada"),
    [r] = await tx.read(c.root + "/visitorIntakes/" + key);
  if (!r || r.organizationId !== c.orgId)
    throw new AccountError(404, "Entrada indisponível.");
  return { ...r, id: key };
}
export async function receptionSummary(tx: AccountTransaction, root: string) {
  const [total, pending] = await Promise.all([
    tx.count(root, "visitorIntakes"),
    tx.count(root, "visitorIntakes", "status", "captured"),
  ]);
  return { total, pending };
}
async function linkExisting(
  tx: AccountTransaction,
  c: Awaited<ReturnType<typeof context>>,
  r: Data,
  personId: unknown,
) {
  await journeyEnabled(tx, c.root);
  await assertModuleEnabled(tx, c.root, "core");
  const id = documentId(personId, "Pessoa"),
    [p] = await tx.read(c.root + "/people/" + id);
  if (p?.organizationId !== c.orgId || p.status !== "active")
    throw new AccountError(404, "Cadastro indisponível.");
  const journeys = await tx.query(
    c.root,
    "visitorJourneys",
    "personId",
    id,
    "EQUAL",
    101,
  );
  if (journeys.length > 100)
    throw new AccountError(
      409,
      "Revise as jornadas deste cadastro antes de integrar.",
    );
  const existing = currentIntegration(
    journeys.filter((j) => j.organizationId === c.orgId),
  );
  const at = new Date().toISOString(),
    journeyId = existing?.id || "reception_" + r.id;
  if (!existing) {
    const isMember = ["member", "leader", "volunteer"].includes(p.memberStatus);
    tx.set(c.root + "/visitorJourneys/" + journeyId, {
      organizationId: c.orgId,
      id: journeyId,
      personId: id,
      currentStage: isMember ? "completed" : "new_visitor",
      status: isMember ? "completed" : "active",
      assignedToUserId: c.uid,
      firstVisitDate: r.createdAt,
      createdAt: at,
      originChannel:
        r.source === "whatsapp"
          ? "whatsapp"
          : r.source === "public_form"
            ? "form"
            : "secretary",
    });
    if (!isMember)
      for (const [suffix, type, title] of [
        ["welcome", "welcome_message", "Realizar acolhimento pessoal"],
        ["group", "invite_to_group", "Convidar para uma célula"],
      ]) {
        const key = journeyId + "_" + suffix;
        tx.set(c.root + "/followUpTasks/" + key, {
          organizationId: c.orgId,
          id: key,
          personId: id,
          visitorJourneyId: journeyId,
          assignedToUserId: c.uid,
          title,
          type,
          status: "open",
          createdAt: at,
          dueAt: at,
        });
      }
  }
  return {
    personId: id,
    journeyId,
    status: "journey_created",
    integratedAt: at,
    integratedByUserId: c.uid,
  };
}
export async function receptionOperation(
  body: Data,
  uid: string,
): Promise<any> {
  // New-person registration keeps the existing atomic plan quota and idempotency checks.
  if (
    (body.action === "capture" && !body.existingPersonId) ||
    body.action === "integrate-new"
  ) {
    const data: Data = await accountTransaction(async (tx) => {
      const c = await context(tx, body, uid);
      await journeyEnabled(tx, c.root);
      if (body.action === "integrate-new") {
        const r = await intake(tx, c, body.intakeId);
        if (r.personId) {
          const [op] = await tx.read(
            c.root +
              "/memberRegistrations/" +
              documentId(body.requestId, "Tentativa"),
          );
          if (op?.uid === uid && op.result?.intakeId === r.id)
            return { replay: op.result };
          throw new AccountError(
            409,
            "Entrada já integrada. Atualize a lista.",
          );
        }
        return {
          name: r.name,
          phone: r.phone || "",
          source: r.source,
          note: r.greeting || "",
          email: r.email,
          birthDate: r.birthDate,
          neighborhood: r.neighborhood,
          consentContact: r.consentMarketing === true,
          intakeId: r.id,
        };
      }
      return {
        name: textField(body.name, "Nome", 120),
        phone: textField(body.phone, "Telefone", 30, true),
        source: textField(body.source || "Recepção", "Origem", 120),
        note: textField(body.note, "Observação interna", 1000, true),
        consentContact: approval(body.consentContact),
      };
    });
    if (data.replay) return { ...data.replay, replayed: true };
    const [firstName, ...last] = data.name.split(/\s+/);
    return registerMember(
      {
        organizationId: body.organizationId,
        requestId: body.requestId,
        workflow: "reception",
        person: {
          firstName,
          lastName: last.join(" "),
          whatsappPhone: data.phone || undefined,
          email: data.email,
          birthDate: data.birthDate,
          address: { district: data.neighborhood },
          memberStatus: "visitor",
        },
        reception: {
          source: data.source,
          note: data.note,
          intakeId: data.intakeId,
          consentContact: data.consentContact,
        },
      },
      uid,
    );
  }
  return accountTransaction(async (tx) => {
    const c = await context(tx, body, uid),
      at = new Date().toISOString(),
      today = campaignLocalDate(at, c.timezone);
    if (body.action === "overview" || body.action === "pulpit") {
      const day = body.day || today;
      try {
        campaignDay(day);
      } catch {
        throw new AccountError(400, "Data inválida.");
      }
      const greetings = await tx.query(
        c.root,
        "visitorIntakes",
        "greetingDate",
        day,
        "EQUAL",
        1001,
      );
      const approved = greetings.filter(
        (r) =>
          r.organizationId === c.orgId &&
          r.greetingApproved === true &&
          !r.greetedAt &&
          r.status !== "archived",
      );
      const pulpit = approved.slice(0, 1000).map((r) => ({
        id: r.id,
        name: r.name,
        text: r.greetingText || "",
        revision: r.revision || 0,
      }));
      if (body.action === "pulpit")
        return {
          day,
          timezone: c.timezone,
          items: pulpit,
          partial: greetings.length > 1000,
          asOf: at,
        };
      const rows =
        body.view === "pending"
          ? await tx.query(
              c.root,
              "visitorIntakes",
              "status",
              "captured",
              "EQUAL",
              1001,
            )
          : await tx.query(
              c.root,
              "visitorIntakes",
              undefined,
              undefined,
              "EQUAL",
              1001,
              undefined,
              { field: "createdAt", direction: "DESCENDING" },
            );
      const offset = body.offset ?? 0;
      if (
        !Number.isInteger(offset) ||
        offset < 0 ||
        offset > 1000 ||
        offset % 100 !== 0
      )
        throw new AccountError(400, "Página inválida.");
      const page = rows
        .filter((r) => r.organizationId === c.orgId)
        .slice(0, 1000)
        .slice(offset, offset + 100);
      const records = await tx.read(
        ...page.map((r) =>
          r.journeyId
            ? c.root + "/visitorJourneys/" + documentId(r.journeyId, "Jornada")
            : c.root + "/visitorJourneys/_none",
        ),
      );
      const [features] = await tx.read(c.root + "/settings/features");
      const summary = await receptionSummary(tx, c.root);
      const activeJourneys =
        features?.modules?.journeys?.enabled === false
          ? null
          : await tx.count(c.root, "visitorJourneys", "status", "active");
      return {
        organizationId: c.orgId,
        summary: {
          ...summary,
          greetings: greetings.length > 1000 ? null : approved.length,
          activeJourneys,
        },
        day,
        today,
        timezone: c.timezone,
        asOf: at,
        publicUrl: c.org.slug
          ? "/p/" + encodeURIComponent(c.org.slug) + "/visit"
          : null,
        publicFormsEnabled: features?.modules?.publicForms?.enabled !== false,
        canCare: c.actor.roles?.some((r: string) =>
          ["pastor", "church_admin", "super_admin"].includes(r),
        ),
        partial: rows.length > 1000 || greetings.length > 1000,
        hasMore: offset + 100 < Math.min(rows.length, 1000),
        items: page.map((r, i) => ({
          id: r.id,
          name: r.name,
          phone: r.phone || "",
          source: r.source,
          status: r.status,
          personId: r.personId || null,
          journeyId: r.journeyId || null,
          stage:
            records[i]?.organizationId === c.orgId
              ? records[i]?.currentStage
              : null,
          note: r.greeting || "",
          careRequestId: r.careRequestId || null,
          consentContact: r.consentMarketing === true,
          contactState: r.welcomeContactAt
            ? "recorded"
            : r.whatsappPreparedAt
              ? "prepared"
              : "pending",
          greetingApproved: r.greetingApproved === true,
          greetingDate: r.greetingDate || "",
          greetingText: r.greetingText || "",
          greetedAt: r.greetedAt || null,
          createdAt: r.createdAt,
          revision: r.revision || 0,
        })),
        pulpit,
      };
    }
    if (body.action === "directory") {
      await assertModuleEnabled(tx, c.root, "core");
      const people = await tx.query(
        c.root,
        "people",
        "status",
        "active",
        "EQUAL",
        501,
      );
      return {
        people: people
          .filter((p) => p.organizationId === c.orgId)
          .slice(0, 500)
          .map((p) => ({
            id: p.id,
            name: fullName(p),
            phone: p.whatsappPhone || p.mobilePhone || "",
          })),
        partial: people.length > 500,
      };
    }
    if (body.action === "capture") {
      const attempt = documentId(body.requestId, "Tentativa"),
        id = "reception_" + digest(attempt).slice(0, 40),
        path = c.root + "/visitorIntakes/" + id;
      const data = {
        existingPersonId: documentId(body.existingPersonId, "Pessoa"),
        name: textField(body.name, "Nome", 120),
        phone: textField(body.phone, "Telefone", 30, true),
        source: textField(body.source || "Recepção", "Origem", 120),
        note: textField(body.note, "Observação interna", 1000, true),
        consentContact: approval(body.consentContact),
      };
      if (data.phone && !whatsappPhone(data.phone))
        throw new AccountError(400, "Telefone inválido.");
      const [previous] = await tx.read(path);
      const fingerprint = digest(data);
      if (previous) {
        if (
          previous.createdByUserId !== uid ||
          previous.fingerprint !== fingerprint
        )
          throw new AccountError(409, "Tentativa usada com outros dados.");
        return { intakeId: id, personId: previous.personId, replayed: true };
      }
      const r = {
        id,
        organizationId: c.orgId,
        name: data.name,
        phone: data.phone,
        source: data.source,
        greeting: data.note,
        consentMarketing: data.consentContact,
        status: "captured",
        createdAt: at,
        createdByUserId: uid,
        fingerprint,
        revision: 0,
      };
      const linked = await linkExisting(tx, c, r, data.existingPersonId);
      tx.set(path, { ...r, ...linked });
      audit(tx, c.root, id, uid, "captured_existing", 0);
      return {
        intakeId: id,
        personId: linked.personId,
        journeyId: linked.journeyId,
      };
    }
    const r = await intake(tx, c, body.intakeId),
      path = c.root + "/visitorIntakes/" + r.id;
    if (body.action === "history") {
      const events = await tx.query(
        c.root,
        "receptionAudit",
        "requestId",
        r.id,
        "EQUAL",
        51,
        undefined,
        { field: "at", direction: "DESCENDING" },
      );
      return {
        items: events.slice(0, 50).map((e) => ({ action: e.action, at: e.at })),
        partial: events.length > 50,
      };
    }
    if (r.status === "archived")
      throw new AccountError(
        409,
        "Entrada arquivada; consulte o acompanhamento em Jornadas.",
      );
    if (body.revision !== (r.revision || 0))
      throw new AccountError(
        409,
        "Entrada atualizada por outra pessoa. Atualize antes de salvar.",
      );
    const revision = (r.revision || 0) + 1,
      patch: Data = { revision, updatedAt: at, updatedByUserId: uid };
    let result: Data = { ok: true };
    if (body.action === "integrate-existing") {
      if (r.personId) throw new AccountError(409, "Entrada já integrada.");
      Object.assign(patch, await linkExisting(tx, c, r, body.personId));
    } else if (body.action === "prepare-whatsapp") {
      await assertModuleEnabled(tx, c.root, "communication");
      if (r.consentMarketing !== true)
        throw new AccountError(
          409,
          "Registre a autorização de contato antes de preparar WhatsApp.",
        );
      const phone = whatsappPhone(r.phone);
      if (!phone) throw new AccountError(400, "Telefone inválido.");
      if (r.personId) {
        const [p] = await tx.read(
          c.root + "/people/" + documentId(r.personId, "Pessoa"),
        );
        if (
          p?.organizationId !== c.orgId ||
          p.status !== "active" ||
          p.communicationOptOut ||
          p.whatsappOptOutAt
        )
          throw new AccountError(
            409,
            "Confira a preferência atual no cadastro.",
          );
      }
      await assertWhatsappContactAllowed(tx, c.root, phone);
      const message = textField(body.message, "Mensagem", 2000);
      result.url = whatsappHref({ mobilePhone: phone }, message);
      patch.whatsappPreparedAt = at;
    } else if (body.action === "contact-consent") {
      patch.consentMarketing = approval(body.allowed);
      patch.contactConsentAt = at;
      patch.contactConsentByUserId = uid;
      // An intake authorization never overrides an existing person's opt-out.
    } else if (body.action === "contact-complete") {
      if (!["presential", "phone", "whatsapp"].includes(body.channel))
        throw new AccountError(400, "Canal inválido.");
      patch.welcomeContactAt = at;
      patch.welcomeContactByUserId = uid;
      patch.welcomeContactChannel = body.channel;
      // Integration stages and tasks remain controlled by Jornadas, which records its own revision and history.
    } else if (body.action === "pastoral-care") {
      if (
        !c.actor.roles?.some((role: string) =>
          ["pastor", "church_admin", "super_admin"].includes(role),
        )
      )
        throw new AccountError(
          403,
          "Encaminhamento restrito à equipe pastoral.",
        );
      await careEnabled(tx, c.root);
      const message = textField(body.message, "Pedido de cuidado", 2000),
        id = "reception_" + digest(r.id).slice(0, 40),
        carePath = c.root + "/prayerRequests/" + id;
      const [existing] = await tx.read(carePath);
      if (existing) {
        if (existing.message !== message)
          throw new AccountError(
            409,
            "Esta entrada já tem um pedido. Abra Cuidado Pastoral para acompanhar.",
          );
        return { id, replayed: true };
      }
      if (r.personId) {
        const [person] = await tx.read(
          c.root + "/people/" + documentId(r.personId, "Pessoa"),
        );
        if (person?.organizationId !== c.orgId || person.status !== "active")
          throw new AccountError(
            409,
            "Cadastro indisponível para encaminhamento.",
          );
      }
      tx.set(carePath, {
        id,
        organizationId: c.orgId,
        personId: r.personId || null,
        personName: r.name,
        message,
        category: "Acolhimento",
        phone: r.phone || "",
        source: "reception",
        receptionIntakeId: r.id,
        status: "open",
        stage: "new",
        priority: "normal",
        isPublic: false,
        prayerCount: 0,
        revision: 0,
        createdAt: at,
        createdByUserId: uid,
      });
      tx.set(c.root + "/pastoralAudit/" + id + "_0", {
        requestId: id,
        action: "created",
        actorId: uid,
        organizationId: c.orgId,
        at,
        revision: 0,
      });
      patch.careRequestId = id;
      result.id = id;
    } else if (body.action === "approve-greeting") {
      if (typeof body.approved !== "boolean")
        throw new AccountError(400, "Confirme a autorização de saudação.");
      const day = body.day || today;
      try {
        campaignDay(day);
      } catch {
        throw new AccountError(400, "Data inválida.");
      }
      Object.assign(patch, {
        greetingApproved: body.approved,
        greetingDate: day,
        greetingText: textField(body.text, "Texto público", 300, true),
        greetingApprovedByUserId: uid,
        greetingApprovedAt: at,
        greetedAt: null,
      });
    } else if (body.action === "greet") {
      if (r.greetingApproved !== true || r.greetingDate !== today)
        throw new AccountError(409, "Saudação não autorizada para hoje.");
      if (r.greetedAt) return { ok: true, replayed: true };
      patch.greetedAt = at;
      patch.greetedByUserId = uid;
    } else throw new AccountError(400, "Ação de recepção inválida.");
    tx.patch(path, patch);
    audit(tx, c.root, r.id, uid, body.action, revision);
    return { ...result, revision };
  });
}
