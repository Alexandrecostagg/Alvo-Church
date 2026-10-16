import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
const memory = vi.hoisted(() => ({ docs: new Map<string, any>() }));
vi.mock("./member-account-store", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("./member-account-store")>();
  return {
    ...original,
    accountTransaction: async (work: any) => {
      const staged = new Map<string, any>();
      const read = (path: string) =>
        structuredClone(
          staged.has(path) ? staged.get(path) : (memory.docs.get(path) ?? null),
        );
      const result = await work({
        read: async (...paths: string[]) => paths.map(read),
        query: async (
          parent: string,
          collection: string,
          field?: string,
          value?: any,
          op = "EQUAL",
          limit = 200,
        ) => {
          const prefix = `${parent}/${collection}/`;
          return [...memory.docs]
            .filter(
              ([p, v]) =>
                p.startsWith(prefix) &&
                !p.slice(prefix.length).includes("/") &&
                (!field || v[field] === value),
            )
            .slice(0, limit)
            .map(([p, v]) => ({
              ...structuredClone(v),
              id: p.split("/").at(-1),
            }));
        },
        set: (p: string, v: any) => staged.set(p, structuredClone(v)),
        patch: (p: string, v: any) => {
          const current = read(p);
          if (!current) throw new Error(`Missing ${p}`);
          staged.set(p, { ...current, ...v });
        },
        remove: (p: string) => staged.set(p, null),
      });
      for (const [p, v] of staged)
        if (v === null) memory.docs.delete(p);
        else memory.docs.set(p, v);
      return result;
    },
  };
});
vi.mock("@alvo/ai", async (importOriginal) => ({
  ...(await importOriginal<any>()),
  callChatWithFallback: vi.fn(async () => ({
    content: "Informação geral da igreja.",
    model: "mock",
  })),
}));
import { verifyWhatsappSignature, receiveWhatsapp } from "./whatsapp-webhook";
import { dispatchWhatsapp, applyWhatsappStatus } from "./whatsapp-outbox";
import { submitParticipation } from "./participation";
import { assistantSettings, whatsappChannels } from "./whatsapp-config";
import { issueWhatsappLink, confirmOwnCellAttendance } from "./whatsapp-member";
import { digest } from "./participation";

const phone = "5562999991234",
  root = "organizations/igreja-a";
let fetcher: ReturnType<typeof vi.fn>;
function payload(
  text: string,
  id = crypto.randomUUID(),
  extra: Record<string, any> = {},
) {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        changes: [
          {
            field: "messages",
            value: {
              metadata: { phone_number_id: "123456" },
              contacts: [{ wa_id: phone, profile: { name: "Maria" } }],
              messages: [
                {
                  id,
                  from: phone,
                  type: "text",
                  text: { body: text },
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  ...extra,
                },
              ],
            },
          },
        ],
      },
    ],
  };
}
beforeEach(() => {
  memory.docs.clear();
  process.env.WHATSAPP_CHANNELS_JSON = JSON.stringify([
    {
      organizationId: "igreja-a",
      phoneNumberId: "123456",
      accessToken: "test-token",
      publicPhone: "556233334444",
      templates: ["lembrete"],
    },
  ]);
  process.env.WHATSAPP_GRAPH_VERSION = "v25.0";
  process.env.PUBLIC_APP_ORIGIN = "https://igreja.example";
  memory.docs.set(root, {
    id: "igreja-a",
    slug: "minha-igreja",
    name: "Igreja A",
    status: "active",
  });
  memory.docs.set("org_slugs/minha-igreja", { organizationId: "igreja-a" });
  memory.docs.set(`${root}/settings/pastoralAssistant`, {
    enabled: true,
    careEnabled: true,
    visitorsEnabled: true,
    eventsEnabled: true,
    groupsEnabled: true,
  });
  fetcher = vi.fn(
    async () =>
      new Response(JSON.stringify({ messages: [{ id: "provider-1" }] }), {
        status: 200,
      }),
  );
  vi.stubGlobal("fetch", fetcher);
});

describe("signed WhatsApp boundaries", () => {
  it("rejects forged and mutated signatures before processing", () => {
    const body = new TextEncoder().encode(
      '{"object":"whatsapp_business_account"}',
    );
    const signature =
      "sha256=" + createHmac("sha256", "secret").update(body).digest("hex");
    expect(() =>
      verifyWhatsappSignature(body, signature, "secret"),
    ).not.toThrow();
    expect(() =>
      verifyWhatsappSignature(body, "sha256=" + "0".repeat(64), "secret"),
    ).toThrow();
    expect(() =>
      verifyWhatsappSignature(
        new TextEncoder().encode("changed"),
        signature,
        "secret",
      ),
    ).toThrow();
  });
  it("rejects ambiguous channel mappings", () => {
    process.env.WHATSAPP_CHANNELS_JSON = JSON.stringify([
      {
        organizationId: "a",
        phoneNumberId: "123456",
        accessToken: "x",
        publicPhone: phone,
      },
      {
        organizationId: "b",
        phoneNumberId: "123456",
        accessToken: "x",
        publicPhone: phone,
      },
    ]);
    expect(whatsappChannels).toThrow();
  });
  it("ignores an unprovisioned number without touching tenant data", async () => {
    const p = payload("MENU");
    p.entry[0].changes[0].value.metadata.phone_number_id = "999999";
    await receiveWhatsapp(p);
    expect(fetcher).not.toHaveBeenCalled();
    expect(memory.docs.size).toBe(3);
  });
  it("deduplicates repeated inbound messages and provider sends", async () => {
    const p = payload("MENU", "same-id");
    await receiveWhatsapp(p);
    await receiveWhatsapp(p);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(
      [...memory.docs.keys()].filter((k) => k.includes("/whatsappOutbox/")),
    ).toHaveLength(1);
  });
  it("does not re-send uncertain provider outcomes", async () => {
    fetcher.mockRejectedValue(new Error("timeout"));
    const p = payload("MENU", "uncertain");
    await receiveWhatsapp(p);
    await receiveWhatsapp(p);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(
      memory.docs.get(`${root}/whatsappOutbox/reply_${digest("uncertain")}`)
        .status,
    ).toBe("uncertain");
  });
  it("stores private care only after explicit confirmation and only once", async () => {
    await receiveWhatsapp(payload("ORACAO Preciso de apoio", "care-question"));
    expect(
      [...memory.docs.keys()].some((p) => p.includes("/prayerRequests/")),
    ).toBe(false);
    const confirmation = payload("CONFIRMAR", "care-confirm");
    await receiveWhatsapp(confirmation);
    await receiveWhatsapp(confirmation);
    const prayers = [...memory.docs].filter(([p]) =>
      p.includes("/prayerRequests/"),
    );
    expect(prayers).toHaveLength(1);
    expect(prayers[0][1]).toMatchObject({
      isPublic: false,
      source: "whatsapp",
      phone,
      message: "Preciso de apoio",
      status: "open",
    });
  });
  it("cancels a pending operation without writing a care request", async () => {
    await receiveWhatsapp(payload("ORACAO Apoio"));
    await receiveWhatsapp(payload("CANCELAR"));
    await receiveWhatsapp(payload("CONFIRMAR"));
    expect(
      [...memory.docs.keys()].some((p) => p.includes("/prayerRequests/")),
    ).toBe(false);
  });
  it("does not accept an expired confirmation", async () => {
    await receiveWhatsapp(payload("ORACAO Apoio"));
    const contact = memory.docs.get(
      `${root}/whatsappContacts/${digest(phone)}`,
    );
    contact.state.expiresAt = 1;
    await receiveWhatsapp(payload("CONFIRMAR"));
    expect(
      [...memory.docs.keys()].some((p) => p.includes("/prayerRequests/")),
    ).toBe(false);
  });
  it("persists human handoff and keeps arbitrary messages out of AI", async () => {
    await receiveWhatsapp(payload("HUMANO"));
    await receiveWhatsapp(payload("Quero conversar sobre um problema pessoal"));
    expect(
      memory.docs.get(`${root}/whatsappHandoffs/${digest(phone)}`).status,
    ).toBe("open");
    expect(
      memory.docs.get(`${root}/whatsappContacts/${digest(phone)}`).handoff,
    ).toBe(true);
  });
  it("honors opt-out for provider messages and allows explicit return", async () => {
    await receiveWhatsapp(payload("SAIR"));
    expect(
      memory.docs.get(`${root}/whatsappContacts/${digest(phone)}`).optOut,
    ).toBe(true);
    const id = "blocked";
    memory.docs.set(`${root}/whatsappOutbox/${id}`, {
      status: "pending",
      to: phone,
      kind: "text",
      text: "Oi",
      createdAt: new Date().toISOString(),
      createdBy: "staff",
    });
    await dispatchWhatsapp("igreja-a", id);
    expect(memory.docs.get(`${root}/whatsappOutbox/${id}`).status).toBe(
      "blocked",
    );
    await receiveWhatsapp(payload("VOLTAR"));
    expect(
      memory.docs.get(`${root}/whatsappContacts/${digest(phone)}`).optOut,
    ).toBe(false);
  });
  it("never regresses delivered/read statuses on late callbacks", async () => {
    memory.docs.set(`${root}/whatsappOutbox/status`, {
      id: "status",
      to: phone,
      status: "read",
      providerId: "p1",
    });
    await applyWhatsappStatus("igreja-a", "p1", phone, "sent");
    await applyWhatsappStatus("igreja-a", "p1", phone, "failed");
    expect(memory.docs.get(`${root}/whatsappOutbox/status`).status).toBe(
      "read",
    );
  });
  it("does not send plain text outside the service window", async () => {
    memory.docs.set(`${root}/whatsappContacts/${digest(phone)}`, {
      lastInboundAt: new Date(Date.now() - 25 * 3600000).toISOString(),
    });
    memory.docs.set(`${root}/whatsappOutbox/old`, {
      status: "pending",
      to: phone,
      kind: "text",
      text: "Oi",
      createdAt: new Date().toISOString(),
      createdBy: "staff",
    });
    await dispatchWhatsapp("igreja-a", "old");
    expect(fetcher).not.toHaveBeenCalled();
    expect(memory.docs.get(`${root}/whatsappOutbox/old`).status).toBe(
      "expired",
    );
  });
  it("keeps delivery callbacks that arrive before the local send receipt", async () => {
    fetcher.mockImplementation(async () => {
      await applyWhatsappStatus("igreja-a","early-provider",phone,"read");
      return new Response(JSON.stringify({messages:[{id:"early-provider"}]}),{status:200});
    });
    await receiveWhatsapp(payload("MENU","early-callback"));
    expect(memory.docs.get(`${root}/whatsappOutbox/reply_${digest("early-callback")}`).status).toBe("read");
  });
  it("validates assistant switches and field lengths", () => {
    expect(() => assistantSettings({ enabled: "true" })).toThrow();
    expect(() =>
      assistantSettings({ churchHistory: "x".repeat(2001) }),
    ).toThrow();
    expect(
      assistantSettings({ enabled: true, assistantName: " Ester " }),
    ).toMatchObject({
      enabled: true,
      assistantName: "Ester",
      aiEnabled: false,
    });
  });
});

describe("anonymous participation", () => {
  const input = () => ({
    orgSlug: "minha-igreja",
    requestId: crypto.randomUUID(),
    name: "Maria Silva",
    phone,
    consent: true,
    message: "Pedido privado",
    eventId: "evento",
  });
  it("registers a private request without a member account and replays safely", async () => {
    const data = input();
    await submitParticipation(data, "care", "client");
    await submitParticipation(data, "care", "client");
    const rows = [...memory.docs].filter(([p]) =>
      p.includes("/prayerRequests/"),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0][1].isPublic).toBe(false);
  });
  it("requires contact authorization", async () => {
    await expect(
      submitParticipation({ ...input(), consent: false }, "care", "client"),
    ).rejects.toThrow();
  });
  it("rejects an unknown church and a disabled module", async () => {
    await expect(
      submitParticipation(
        { ...input(), orgSlug: "outra-igreja" },
        "care",
        "client",
      ),
    ).rejects.toThrow();
    memory.docs.set(`${root}/settings/features`, {
      modules: { events: { enabled: false } },
    });
    await expect(
      submitParticipation(input(), "event", "client"),
    ).rejects.toThrow();
  });
  it("enforces capacity, deduplicates phone and does not reveal an existing receipt", async () => {
    memory.docs.set(`${root}/events/evento`, {
      id: "evento",
      organizationId: "igreja-a",
      status: "published",
      startsAt: new Date(Date.now() + 3600000).toISOString(),
      capacity: 1,
      isPaid: true,
    });
    const first = await submitParticipation(input(), "event", "client");
    expect(first).toMatchObject({ paymentStatus: "pending" });
    expect(first.registrationCode).toMatch(/^ESD-/);
    const duplicate = await submitParticipation(input(), "event", "client");
    expect(duplicate).toMatchObject({ alreadyRegistered: true });
    expect(duplicate.registrationCode).toBeUndefined();
    await expect(
      submitParticipation(
        { ...input(), phone: "5511988887777" },
        "event",
        "client2",
      ),
    ).rejects.toThrow(/vagas/);
  });
  it("does not register an attendee for a past or draft event", async () => {
    memory.docs.set(`${root}/events/evento`, {
      organizationId: "igreja-a",
      status: "draft",
      startsAt: new Date(Date.now() + 3600000).toISOString(),
    });
    await expect(
      submitParticipation(input(), "event", "client"),
    ).rejects.toThrow();
  });
});

describe("verified member binding", () => {
  function member() {
    memory.docs.set(`${root}/users/u1`, {
      organizationId: "igreja-a",
      isActive: true,
      personId: "p1",
    });
    memory.docs.set(`${root}/memberAccountLinks/u1`, {
      organizationId: "igreja-a",
      userId: "u1",
      personId: "p1",
      verifiedBy: "admin",
    });
    memory.docs.set(`${root}/memberAccountClaims/p1`, {
      organizationId: "igreja-a",
      userId: "u1",
      personId: "p1",
    });
    memory.docs.set(`${root}/people/p1`, {
      organizationId: "igreja-a",
      status: "active",
    });
  }
  it("refuses a legacy self-declared users.personId", async () => {
    memory.docs.set(`${root}/users/u1`, {
      organizationId: "igreja-a",
      isActive: true,
      personId: "p1",
    });
    await expect(issueWhatsappLink("minha-igreja", "u1")).rejects.toThrow();
  });
  it("requires a one-time code and records only the bound member's presence", async () => {
    member();
    const issued = await issueWhatsappLink("minha-igreja", "u1");
    const command = new URL(issued.url).searchParams.get("text")!;
    await receiveWhatsapp(payload(command));
    const contact = memory.docs.get(
      `${root}/whatsappContacts/${digest(phone)}`,
    );
    expect(contact.personId).toBe("p1");
    memory.docs.set(`${root}/groups/g1`, {
      organizationId: "igreja-a",
      status: "active",
    });
    memory.docs.set(`${root}/groups/g1/members/g1_p1`, {
      organizationId: "igreja-a",
      personId: "p1",
    });
    memory.docs.set(`${root}/groups/g1/meetings/m1`, {
      organizationId: "igreja-a",
      groupId: "g1",
      meetingStatus: "scheduled",
      scheduledStartAt: new Date().toISOString(),
    });
    await confirmOwnCellAttendance("igreja-a", phone, "g1", "m1");
    expect(
      memory.docs.get(`${root}/groups/g1/meetings/m1/attendance/m1_p1`),
    ).toMatchObject({
      personId: "p1",
      selfReported: true,
      attendanceStatus: "present",
    });
    memory.docs.set(`${root}/memberAccountClaims/p1`, {
      organizationId: "igreja-a",
      userId: "another",
      personId: "p1",
    });
    await expect(
      confirmOwnCellAttendance("igreja-a", phone, "g1", "m1"),
    ).rejects.toThrow();
  });
  it("does not mark presence on the basis of a phone number alone", async () => {
    await expect(
      confirmOwnCellAttendance("igreja-a", phone, "g1", "m1"),
    ).rejects.toThrow();
  });
});
