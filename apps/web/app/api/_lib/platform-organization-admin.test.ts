import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  docs: new Map<string, Record<string, any>>(),
  queries: new Map<string, Record<string, any>[]>(),
  writes: [] as Array<{
    kind: string;
    path: string;
    data?: Record<string, any>;
  }>,
}));

vi.mock("./member-account-store", async () => {
  class AccountError extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
    }
  }
  return {
    AccountError,
    accountTransaction: async (work: (tx: any) => Promise<unknown>) =>
      work({
        read: async (...paths: string[]) =>
          paths.map((path) => state.docs.get(path) ?? null),
        query: async (parent: string, collection: string) =>
          state.queries.get(`${parent}/${collection}`) ?? [],
        set: (path: string, data: Record<string, any>) =>
          state.writes.push({ kind: "set", path, data }),
        patch: (path: string, data: Record<string, any>) =>
          state.writes.push({ kind: "patch", path, data }),
        remove: (path: string) => state.writes.push({ kind: "remove", path }),
      }),
  };
});

import {
  removePlatformUser,
  updatePlatformModules,
  updatePlatformPlan,
  updatePlatformUser,
} from "./platform-organization-admin";

const orgId = "org_test";
const root = `organizations/${orgId}`;

beforeEach(() => {
  state.docs.clear();
  state.queries.clear();
  state.writes.length = 0;
  state.docs.set("platformAdmins/platform_owner", {
    email: "owner@example.com",
  });
  state.docs.set(root, {
    displayName: "Igreja Teste",
    status: "active",
    memberCount: 40,
  });
  state.docs.set(`${root}/settings/subscription`, {
    organizationId: orgId,
    plan: "comunidade",
    billingStatus: "active",
    startedAt: "2026-01-01T00:00:00.000Z",
  });
});

describe("administração de instituições da plataforma", () => {
  it("recusa qualquer mutação fora de platformAdmins", async () => {
    await expect(
      updatePlatformPlan(
        {
          organizationId: orgId,
          plan: "free",
          billingStatus: "active",
          reason: "Ajuste solicitado",
        },
        "intruder",
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect(state.writes).toHaveLength(0);
  });

  it("mantém o teto de 50 e exige confirmação ao rebaixar acima do limite", async () => {
    state.docs.set(root, {
      displayName: "Igreja Teste",
      status: "active",
      memberCount: 51,
    });
    const input = {
      organizationId: orgId,
      plan: "free",
      billingStatus: "active",
      reason: "Rebaixamento solicitado",
    };
    await expect(
      updatePlatformPlan(input, "platform_owner"),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      updatePlatformPlan(
        { ...input, confirmOverLimit: true },
        "platform_owner",
      ),
    ).resolves.toMatchObject({ memberLimit: 50 });
    const subscription = state.writes.find((write) =>
      write.path.endsWith("settings/subscription"),
    );
    expect(subscription?.data).toMatchObject({
      plan: "free",
      planCode: "gratuito",
      aiQuota: 0,
    });
    expect(
      state.writes.some((write) => write.path.includes("platformAdminAudit")),
    ).toBe(true);
  });

  it("não permite bloquear o último administrador ativo", async () => {
    const user = {
      id: "admin_one",
      organizationId: orgId,
      email: "admin@example.com",
      roles: ["church_admin"],
      isActive: true,
    };
    state.docs.set(`${root}/users/admin_one`, user);
    state.queries.set(`${root}/users`, [user]);
    await expect(
      updatePlatformUser(
        {
          organizationId: orgId,
          userId: "admin_one",
          isActive: false,
          reason: "Bloqueio por segurança",
        },
        "platform_owner",
      ),
    ).rejects.toMatchObject({ status: 409 });
    expect(state.writes).toHaveLength(0);
  });

  it("bloqueia uma conta quando outro administrador permanece ativo", async () => {
    const target = {
      id: "user_two",
      organizationId: orgId,
      email: "user@example.com",
      roles: ["member"],
      isActive: true,
    };
    const admin = {
      id: "admin_one",
      organizationId: orgId,
      email: "admin@example.com",
      roles: ["church_admin"],
      isActive: true,
    };
    state.docs.set(`${root}/users/user_two`, target);
    state.queries.set(`${root}/users`, [admin, target]);
    await updatePlatformUser(
      {
        organizationId: orgId,
        userId: "user_two",
        isActive: false,
        reason: "Acesso não autorizado",
      },
      "platform_owner",
    );
    expect(
      state.writes.find((write) => write.path.endsWith("users/user_two"))?.data,
    ).toMatchObject({ isActive: false });
  });

  it("preserva conta ligada a membro e permite remover somente acesso sem vínculo", async () => {
    const admin = {
      id: "admin_one",
      organizationId: orgId,
      roles: ["church_admin"],
      isActive: true,
    };
    const linked = {
      id: "linked_user",
      organizationId: orgId,
      roles: ["member"],
      isActive: false,
      personId: "person_1",
    };
    state.docs.set(`${root}/users/linked_user`, linked);
    state.queries.set(`${root}/users`, [admin, linked]);
    await expect(
      removePlatformUser(
        {
          organizationId: orgId,
          userId: "linked_user",
          reason: "Conta indesejada vinculada",
        },
        "platform_owner",
      ),
    ).rejects.toMatchObject({ status: 409 });

    const loose = {
      id: "loose_user",
      organizationId: orgId,
      roles: ["member"],
      isActive: false,
    };
    state.docs.set(`${root}/users/loose_user`, loose);
    state.queries.set(`${root}/users`, [admin, loose]);
    await removePlatformUser(
      {
        organizationId: orgId,
        userId: "loose_user",
        reason: "Convite criado por engano",
      },
      "platform_owner",
    );
    expect(
      state.writes.some(
        (write) =>
          write.kind === "remove" && write.path.endsWith("users/loose_user"),
      ),
    ).toBe(true);
  });

  it("grava bloqueios de módulos sem desligar o núcleo", async () => {
    state.docs.set(`${root}/settings/features`, {
      organizationId: orgId,
      modules: {
        core: { enabled: true, source: "plan" },
        children: { enabled: true, source: "plan" },
      },
    });
    await updatePlatformModules(
      {
        organizationId: orgId,
        modules: { children: false, finance: false },
        reason: "Módulos pausados no contrato",
      },
      "platform_owner",
    );
    const features = state.writes.find((write) =>
      write.path.endsWith("settings/features"),
    );
    expect(features?.data?.modules).toMatchObject({
      core: { enabled: true },
      children: { enabled: false, source: "manual" },
      finance: { enabled: false, source: "manual" },
    });
  });
});
