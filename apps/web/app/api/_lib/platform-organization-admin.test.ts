import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  docs: new Map<string, Record<string, any>>(),
  queries: new Map<string, Record<string, any>[]>(),
  writes: [] as Array<{
    kind: string;
    path: string;
    data?: Record<string, any>;
  }>,
  profiles: new Map<string, any>(),
}));

vi.mock("./platform-auth-profiles", () => ({
  readPlatformAuthProfiles: vi.fn(
    async (ids: string[]) =>
      new Map(
        ids
          .filter((id) => state.profiles.has(id))
          .map((id) => [id, state.profiles.get(id)]),
      ),
  ),
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
        query: async (
          parent: string,
          collection: string,
          _field: string,
          _value: unknown,
          _op: string,
          limit = 200,
          _and: unknown,
          order?: { field: string },
          after?: string,
        ) => {
          let rows = [...(state.queries.get(`${parent}/${collection}`) ?? [])];
          if (order?.field === "__name__")
            rows.sort((a, b) => a.id.localeCompare(b.id));
          if (after) rows = rows.filter((row) => row.id > after);
          return rows.slice(0, limit);
        },
        set: (path: string, data: Record<string, any>) =>
          state.writes.push({ kind: "set", path, data }),
        patch: (path: string, data: Record<string, any>) =>
          state.writes.push({ kind: "patch", path, data }),
        remove: (path: string) => state.writes.push({ kind: "remove", path }),
      }),
  };
});

import {
  readPlatformOrganization,
  readPlatformOrganizationUsers,
  updatePlatformOrganization,
  removePlatformUser,
  updatePlatformModules,
  updatePlatformPlan,
  updatePlatformUser,
} from "./platform-organization-admin";
import { readPlatformAuthProfiles } from "./platform-auth-profiles";
import { planHasModule } from "@alvo/firebase/src/plans";

const orgId = "org_test";
const root = `organizations/${orgId}`;

beforeEach(() => {
  state.docs.clear();
  state.queries.clear();
  state.writes.length = 0;
  state.profiles.clear();
  vi.mocked(readPlatformAuthProfiles).mockClear();
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
  it("só consulta perfis Auth depois de autorizar a administração da plataforma", async () => {
    await expect(
      readPlatformOrganization({ organizationId: orgId }, "intruder"),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      readPlatformOrganizationUsers({ organizationId: orgId }, "intruder"),
    ).rejects.toMatchObject({ status: 403 });
    expect(readPlatformAuthProfiles).not.toHaveBeenCalled();
  });

  it("inclui o cadastro completo e os perfis das contas pertencentes à instituição", async () => {
    state.docs.set(root, {
      ownerUid: "owner",
      legalName: "Instituição fictícia",
      taxId: "12345678901",
      addressLine: "Rua de QA",
      addressReference: "Dado fictício",
      registrationEmail: "original@example.test",
      secret: "never-return",
    });
    state.queries.set(`${root}/users`, [
      {
        id: "owner",
        email: "old@example.test",
        roles: ["pastor", "church_admin"],
        isActive: true,
        secret: "never-return",
        personId: "person",
        campusIds: ["campus_1"],
      },
    ]);
    state.profiles.set("owner", {
      displayName: "Responsável fictício",
      email: "current@example.test",
      phone: "+5500000000000",
      emailVerified: true,
      disabled: false,
      createdAt: "2026-01-01T00:00:00Z",
      lastSignInAt: "2026-02-01T00:00:00Z",
    });
    const result = await readPlatformOrganization(
      { organizationId: orgId, userId: "outside" },
      "platform_owner",
    );
    expect(result.company).toMatchObject({
      legalName: "Instituição fictícia",
      addressReference: "Dado fictício",
    });
    expect(result.organization.registrationEmail).toBe("original@example.test");
    expect(result.owner.email).toBe("current@example.test");
    expect(result.users[0]).toMatchObject({
      displayName: "Responsável fictício",
      roles: ["pastor", "church_admin"],
      campusIds: ["campus_1"],
      authStatus: "active",
      emailVerified: true,
    });
    expect(JSON.stringify(result)).not.toContain("never-return");
    expect(readPlatformAuthProfiles).toHaveBeenCalledWith(["owner", "owner"]);
  });

  it("pagina usuários sem omitir os registros além do limite antigo", async () => {
    state.queries.set(
      `${root}/users`,
      Array.from({ length: 271 }, (_, n) => ({
        id: `user_${String(n).padStart(3, "0")}`,
        roles: ["member"],
      })),
    );
    const first = await readPlatformOrganization(
      { organizationId: orgId },
      "platform_owner",
    );
    const second = await readPlatformOrganizationUsers(
      { organizationId: orgId, cursor: first.usersPage.nextCursor },
      "platform_owner",
    );
    const third = await readPlatformOrganizationUsers(
      { organizationId: orgId, cursor: second.usersPage.nextCursor },
      "platform_owner",
    );
    expect(
      new Set(
        [...first.users, ...second.users, ...third.users].map((row) => row.id),
      ).size,
    ).toBe(271);
    expect(third.usersPage.nextCursor).toBeNull();
  });

  it("salva dados cadastrais sem alterar a conta de login ou a assinatura", async () => {
    await updatePlatformOrganization(
      {
        organizationId: orgId,
        reason: "Correção solicitada",
        displayName: "Fictícia",
        publicName: "Fictícia",
        status: "active",
        legalName: "Instituição de QA",
        contactEmail: "contact@example.test",
        addressState: "pa",
        registrationEmail: "cannot-change@example.test",
        ownerUid: "intruder",
      },
      "platform_owner",
    );
    const saved = state.writes.find((row) => row.path === root)?.data;
    expect(saved).toMatchObject({
      legalName: "Instituição de QA",
      contactEmail: "contact@example.test",
      addressState: "PA",
    });
    expect(saved).not.toHaveProperty("registrationEmail");
    expect(saved).not.toHaveProperty("ownerUid");
    expect(
      state.writes.some((row) => row.path.endsWith("settings/subscription")),
    ).toBe(false);
  });

  it.each(["free", "comunidade", "pastoral", "rede", "enterprise"])(
    "aplica assinatura e módulos padrão de %s atomicamente",
    async (plan) => {
      state.docs.set(`${root}/settings/features`, {
        organizationId: orgId,
        customMetadata: "preserved",
        modules: {
          core: { enabled: true },
          finance: { enabled: false, source: "manual", beta: true },
          groups: { enabled: false },
        },
      });
      await updatePlatformPlan(
        {
          organizationId: orgId,
          reason: "Plano solicitado",
          plan,
          billingStatus: "active",
        },
        "platform_owner",
      );
      const modules = state.writes.find((row) =>
        row.path.endsWith("settings/features"),
      )?.data?.modules;
      for (const key of Object.keys(modules))
        expect(modules[key].enabled).toBe(planHasModule(plan as any, key));
      expect(modules.finance).toMatchObject({ source: "plan", beta: true });
      expect(
        state.writes.find((row) => row.path.endsWith("settings/subscription"))
          ?.data?.plan,
      ).toBe(plan);
      expect(
        state.writes.find((row) => row.path.endsWith("settings/features"))?.data
          ?.customMetadata,
      ).toBe("preserved");
    },
  );

  it("não permite marcar uma função acima do plano e valida motivo antes de gravar", async () => {
    await expect(
      updatePlatformModules(
        {
          organizationId: orgId,
          reason: "Teste de plano",
          modules: { children: true },
        },
        "platform_owner",
      ),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      updatePlatformPlan(
        {
          organizationId: orgId,
          reason: "",
          plan: "enterprise",
          billingStatus: "active",
        },
        "platform_owner",
      ),
    ).rejects.toMatchObject({ status: 400 });
    expect(state.writes).toHaveLength(0);
  });
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
