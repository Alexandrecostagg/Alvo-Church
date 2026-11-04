import { afterEach, describe, expect, it, vi } from "vitest";
import { registerMember, validateRegistration } from "./member-registration";
import { isLocalQaFirebase } from "./firebase-server-env";

const payload = () => ({
  organizationId: "org_qa",
  requestId: "11111111-2222-4333-8444-555555555555",
  person: {
    firstName: "Pessoa",
    lastName: "Teste",
    cpf: "529.982.247-25",
    birthDate: "2000-02-29",
  },
});
describe("server member validation", () => {
  it("normalizes CPF and discards client-supplied IDs, plan and pass codes", () => {
    const input = payload();
    const result = validateRegistration({
      ...input,
      plan: "enterprise",
      person: {
        ...input.person,
        id: "foreign",
        organizationId: "foreign",
        memberCardCode: "guessed",
        consentLgpdAt: "fake",
      },
    });
    expect(result.person.cpf).toBe("52998224725");
    expect(result.person).not.toHaveProperty("memberCardCode");
    expect(result.person).not.toHaveProperty("consentLgpdAt");
    expect(result.person).not.toHaveProperty("organizationId");
  });
  it.each(["11111111111", "52998224724"])("rejects invalid CPF %s", (cpf) => {
    const input = payload();
    expect(() =>
      validateRegistration({ ...input, person: { ...input.person, cpf } }),
    ).toThrow("CPF");
  });
  it.each(["2001-02-29", "2099-01-01", "2000-2-29"])(
    "rejects birth date %s",
    (birthDate) => {
      const input = payload();
      expect(() =>
        validateRegistration({
          ...input,
          person: { ...input.person, birthDate },
        }),
      ).toThrow();
    },
  );
  it("requires explicit boolean consent for the pass", () => {
    const input = payload();
    const withPass = {
      ...input,
      person: { ...input.person, partnerBenefitsEnabled: true },
    };
    expect(() => validateRegistration(withPass)).toThrow("consentimento");
    expect(() =>
      validateRegistration({ ...withPass, consent: "true" }),
    ).toThrow();
    expect(validateRegistration({ ...withPass, consent: true }).consent).toBe(
      true,
    );
  });
  it("rejects injected paths and invalid body shapes", () => {
    expect(() =>
      validateRegistration({
        ...payload(),
        organizationId: "other/users/admin",
      }),
    ).toThrow();
    expect(() =>
      validateRegistration({ ...payload(), requestId: "../member" }),
    ).toThrow();
    expect(() => validateRegistration([])).toThrow();
    expect(() => validateRegistration({ ...payload(), person: [] })).toThrow();
  });
});
describe("emulator boundary", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("never enables the emulator bypass in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "demo-alvo-qa");
    vi.stubEnv("FIRESTORE_EMULATOR_HOST", "127.0.0.1:8080");
    vi.stubEnv("FIREBASE_AUTH_EMULATOR_HOST", "127.0.0.1:9099");
    expect(isLocalQaFirebase()).toBe(false);
    vi.stubEnv("NODE_ENV", "development");
    expect(isLocalQaFirebase()).toBe(true);
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "real-project");
    expect(isLocalQaFirebase()).toBe(false);
  });
});

describe("registration transaction contention", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });
  it("releases aborted transactions, identifies retries and stops after five attempts", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "demo-alvo-qa");
    vi.stubEnv("FIRESTORE_EMULATOR_HOST", "127.0.0.1:8080");
    vi.stubEnv("FIREBASE_AUTH_EMULATOR_HOST", "127.0.0.1:9099");
    let attempts = 0;
    const released: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      if (url.endsWith(":beginTransaction")) {
        expect(released).toHaveLength(attempts);
        if (attempts > 0)
          expect(body.options.readWrite.retryTransaction).toBe(`transaction-${attempts}`);
        return Response.json({ transaction: `transaction-${++attempts}` });
      }
      if (url.endsWith(":rollback")) {
        released.push(body.transaction);
        return Response.json({});
      }
      expect(url.endsWith(":batchGet")).toBe(true);
      return Response.json({ error: { status: "ABORTED" } }, { status: 409 });
    }));
    await expect(registerMember(payload(), "user-qa")).rejects.toMatchObject({ status: 409 });
    expect(attempts).toBe(5);
    expect(released).toHaveLength(5);
  });
});
