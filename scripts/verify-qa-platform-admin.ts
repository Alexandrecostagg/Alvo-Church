import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { POST } from "../apps/web/app/api/platform/organizations/route";
import { planModuleDefaults } from "../packages/firebase/src/plans";

async function main() {
  if (
    process.env.FIREBASE_PROJECT_ID !== "demo-alvo-qa" ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== "demo-alvo-qa" ||
    process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:8080" ||
    process.env.FIREBASE_AUTH_EMULATOR_HOST !== "127.0.0.1:9099" ||
    process.env.NODE_ENV === "production"
  )
    throw new Error("Somente emuladores locais demo-alvo-qa.");
  initializeApp({ projectId: "demo-alvo-qa" });
  const db = getFirestore(),
    auth = getAuth();
  const suffix = randomUUID().replaceAll("-", ""),
    orgId = `qa_platform_${suffix}`;
  const adminId = `qa_platform_admin_${suffix}`,
    ownerId = `zz_owner_${suffix}`,
    outsiderId = `qa_outside_${suffix}`;
  const org = db.doc(`organizations/${orgId}`),
    platformAdmin = db.doc(`platformAdmins/${adminId}`);
  const password = "Fictitious-QA-2026!";
  let checks = 0;
  const equal = (actual: unknown, expected: unknown, label: string) => {
    assert.deepEqual(actual, expected, label);
    checks++;
  };
  async function signIn(uid: string) {
    const response = await fetch(
      "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-key",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: `${uid}@example.test`,
          password,
          returnSecureToken: true,
        }),
      },
    );
    const data = await response.json();
    assert(response.ok);
    return data.idToken as string;
  }
  async function api(body: Record<string, unknown>, token?: string) {
    const req = new Request("http://127.0.0.1/api/platform/organizations", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ organizationId: orgId, ...body }),
    });
    const response = await POST(req as Parameters<typeof POST>[0]);
    equal(
      response.headers.get("cache-control")?.includes("no-store"),
      true,
      "private response",
    );
    return { status: response.status, data: await response.json() };
  }
  try {
    for (const uid of [adminId, ownerId, outsiderId])
      await auth.createUser({
        uid,
        email: `${uid}@example.test`,
        password,
        displayName: "Pessoa fictícia de QA",
        emailVerified: true,
      });
    await platformAdmin.set({ email: `${adminId}@example.test` });
    await org.set({
      id: orgId,
      name: "Instituição fictícia QA",
      displayName: "Instituição fictícia QA",
      publicName: "Fictícia",
      status: "active",
      ownerUid: ownerId,
      memberCount: 10,
      legalName: "Empresa de teste isolado",
      taxId: "00000000000000",
      addressCity: "Cidade fictícia",
      addressState: "PA",
      addressPostalCode: "00000000",
      privateKey: "not-for-client",
    });
    await org
      .collection("settings")
      .doc("subscription")
      .set({ organizationId: orgId, plan: "free", billingStatus: "active" });
    await org
      .collection("settings")
      .doc("features")
      .set({
        organizationId: orgId,
        modules: {
          groups: { enabled: false, source: "plan" },
          finance: { enabled: false },
        },
      });
    const batch = db.batch();
    // The only administrator sorts after the old 250-user query limit.
    for (let n = 0; n < 261; n++)
      batch.set(
        org.collection("users").doc(`user_${String(n).padStart(3, "0")}`),
        {
          organizationId: orgId,
          email: `user${n}@example.test`,
          roles: ["member"],
          isActive: true,
          passwordHash: "not-for-client",
          createdAt: "2026-01-01T00:00:00Z",
        },
      );
    batch.set(org.collection("users").doc(ownerId), {
      organizationId: orgId,
      email: `${ownerId}@example.test`,
      roles: ["church_admin", "pastor"],
      isActive: true,
      campusIds: ["campus_qa"],
    });
    await batch.commit();
    const token = await signIn(adminId),
      outsiderToken = await signIn(outsiderId);
    equal(
      (await api({ action: "detail" })).status,
      401,
      "anonymous detail denied",
    );
    equal(
      (await api({ action: "detail" }, outsiderToken)).status,
      403,
      "tenant/foreign account denied",
    );
    equal(
      (await api({ action: "users" }, outsiderToken)).status,
      403,
      "foreign user listing denied",
    );
    equal(
      (
        await api(
          {
            action: "updatePlan",
            plan: "enterprise",
            billingStatus: "active",
            reason: "Pedido fictício",
          },
          outsiderToken,
        )
      ).status,
      403,
      "foreign plan change denied",
    );
    let result = await api({ action: "detail" }, token);
    equal(result.status, 200, "admin reads detail");
    equal(
      result.data.company.legalName,
      "Empresa de teste isolado",
      "company projection",
    );
    equal(
      result.data.company.addressPostalCode,
      "00000000",
      "postal code included",
    );
    equal(
      result.data.organization.registrationEmail,
      `${ownerId}@example.test`,
      "legacy owner email outside first page",
    );
    equal(
      result.data.owner.displayName,
      "Pessoa fictícia de QA",
      "owner Auth name",
    );
    equal(result.data.authWarning, "", "Auth profile lookup available");
    equal(
      JSON.stringify(result.data).includes("not-for-client"),
      false,
      "credentials/private fields excluded",
    );
    const users = [...result.data.users];
    let cursor = result.data.usersPage.nextCursor;
    while (cursor) {
      const page = await api({ action: "users", cursor }, token);
      equal(page.status, 200, "next page");
      users.push(...page.data.users);
      cursor = page.data.usersPage.nextCursor;
    }
    equal(users.length, 262, "all users loaded beyond old cap");
    equal(
      new Set(users.map((user) => user.id)).size,
      262,
      "no duplicated page boundary",
    );
    const owner = users.find((user) => user.id === ownerId);
    equal(
      owner.roles,
      ["church_admin", "pastor"],
      "all account roles preserved",
    );
    equal(owner.emailVerified, true, "Auth metadata displayed");
    equal(owner.authStatus, "active", "Auth state projected");
    equal(
      (await api({ action: "users", cursor: "../outside" }, token)).status,
      400,
      "malformed cursor denied",
    );
    equal(
      (
        await api(
          {
            action: "updatePlan",
            plan: "enterprise",
            billingStatus: "active",
            reason: "",
          },
          token,
        )
      ).status,
      400,
      "missing reason explained",
    );
    for (const plan of [
      "comunidade",
      "pastoral",
      "rede",
      "enterprise",
      "free",
    ] as const) {
      const applied = await api(
        {
          action: "updatePlan",
          plan,
          billingStatus: "active",
          reason: "Teste isolado de plano",
        },
        token,
      );
      equal(applied.status, 200, `apply ${plan}`);
      const saved = (
        await org.collection("settings").doc("features").get()
      ).data()!;
      equal(
        Object.fromEntries(
          Object.entries(saved.modules).map(([key, value]: [string, any]) => [
            key,
            value.enabled,
          ]),
        ),
        planModuleDefaults(plan),
        `persisted ${plan} defaults`,
      );
      result = await api({ action: "detail" }, token);
      equal(result.data.subscription.plan, plan, `reloaded ${plan}`);
      for (const [key, enabled] of Object.entries(result.data.modules))
        equal(
          enabled,
          planModuleDefaults(plan)[key],
          `reloaded ${plan}/${key}`,
        );
    }
    equal(
      (
        await api(
          {
            action: "updateModules",
            modules: { finance: true },
            reason: "Tentativa fictícia",
          },
          token,
        )
      ).status,
      400,
      "cannot exceed selected plan",
    );
    equal(
      (
        await api(
          {
            action: "updateUser",
            userId: "user_000",
            isActive: false,
            reason: "Bloqueio fictício solicitado",
          },
          token,
        )
      ).status,
      200,
      "admin after first 250 still protects institution access",
    );
    equal(
      (
        await api(
          {
            action: "updateUser",
            userId: ownerId,
            isActive: false,
            reason: "Bloqueio fictício solicitado",
          },
          token,
        )
      ).status,
      409,
      "last admin protected",
    );
    const update = await api(
      {
        action: "updateOrganization",
        displayName: "Nome fictício atualizado",
        publicName: "Público fictício",
        status: "suspended",
        legalName: "Razão fictícia atualizada",
        contactEmail: "contact@example.test",
        addressState: "pa",
        addressReference: "Somente teste",
        reason: "Correção fictícia de cadastro",
        registrationEmail: "cannot-change@example.test",
      },
      token,
    );
    equal(update.status, 200, "company profile saved");
    result = await api({ action: "detail" }, token);
    equal(
      result.data.organization.status,
      "suspended",
      "saved institution state",
    );
    equal(
      result.data.company.contactEmail,
      "contact@example.test",
      "saved contact email",
    );
    equal(result.data.company.addressState, "PA", "normalized state");
    equal(
      result.data.organization.registrationEmail,
      `${ownerId}@example.test`,
      "login identity unchanged",
    );
    equal(
      result.data.audits.some(
        (entry: any) => entry.action === "organization_updated",
      ),
      true,
      "audit present",
    );
    console.log(
      JSON.stringify({
        ok: true,
        checks,
        scope:
          "Fictional institution; real Auth/Firestore emulators and platform route; no billing providers",
      }),
    );
  } finally {
    await db.recursiveDelete(org);
    await platformAdmin.delete();
    await auth.deleteUsers([adminId, ownerId, outsiderId]);
    console.log("Fictional platform fixtures removed.");
  }
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
