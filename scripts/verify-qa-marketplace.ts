import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { communityMarketplaceOperation } from "../apps/web/app/api/_lib/community-marketplace";
import { moderateMarketplaceStore } from "../apps/web/app/api/_lib/marketplace-moderation";
import { roleHomeOperation } from "../apps/web/app/api/_lib/role-home";
import { POST } from "../apps/web/app/api/marketplace/community/route";
import { NextRequest } from "next/server";

async function main() {
  if (
    process.env.FIREBASE_PROJECT_ID !== "demo-alvo-qa" ||
    process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:8080" ||
    process.env.FIREBASE_AUTH_EMULATOR_HOST !== "127.0.0.1:9099"
  )
    throw Error("Local QA only");
  initializeApp({ projectId: "demo-alvo-qa" });
  const db = getFirestore(),
    auth = getAuth();
  const org = "qa_marketplace_" + randomUUID().slice(0, 8),
    root = "organizations/" + org;
  const users = {
    owner: org + "_owner",
    member: org + "_member",
    pastor: org + "_pastor",
    leader: org + "_leader",
  };
  const realFetch = global.fetch;
  let external = false,
    checks = 0;
  global.fetch = (async (input: any, init: any) => {
    const url = new URL(
      typeof input === "string" ? input : input.url || String(input),
    );
    if (!["localhost", "127.0.0.1"].includes(url.hostname)) {
      external = true;
      throw Error("External access blocked");
    }
    return realFetch(input, init);
  }) as typeof fetch;
  const check = (actual: any, expected: any, label: string) => {
    assert.deepEqual(actual, expected, label);
    checks++;
    console.log("OK " + label);
  };
  const denied = async (
    fn: () => Promise<any>,
    status: number,
    label: string,
  ) => {
    await assert.rejects(fn, (e: any) => e.status === status, label);
    checks++;
    console.log("OK " + label);
  };
  const seed = (p: string, data: any) =>
    db.doc(root + "/" + p).set({ organizationId: org, ...data });
  const op = (body: any, uid = users.owner) =>
    communityMarketplaceOperation({ organizationId: org, ...body }, uid);
  const moderate = (body: any, uid = users.pastor) =>
    moderateMarketplaceStore(
      { organizationId: org, requestId: randomUUID(), ...body },
      uid,
    );
  const fields = {
    name: "Padaria fictícia QA",
    description: "Atendimento fictício",
    offerings: "Bolos e pães",
    category: "food",
    whatsapp: "(91) 99999-0001",
    website: "https://example.test",
    facebook: "https://www.facebook.com/example.test",
    street: "Rua de Teste",
    city: "Belém",
  };
  try {
    await db.doc(root).set({
      id: org,
      organizationId: org,
      status: "active",
      name: "Marketplace fictício",
      timezone: "America/Belem",
    });
    await seed("settings/subscription", { plan: "pastoral" });
    for (const [role, uid] of Object.entries(users)) {
      await auth.createUser({
        uid,
        email: uid + "@example.test",
        password: "Fictitious-QA-2026!",
      });
      await auth.setCustomUserClaims(uid, { organizationId: org });
      await seed("users/" + uid, {
        isActive: true,
        roles: [
          role === "pastor"
            ? "pastor"
            : role === "leader"
              ? "group_leader"
              : "member",
        ],
      });
    }
    await denied(
      () =>
        moderate({
          action: "toString",
          storeId: "unknown",
          reason: "Invalid operation",
        }),
      400,
      "Prototype action rejected",
    );
    const create = { action: "save", requestId: randomUUID(), fields };
    const result: any = await op(create),
      id = result.storeId;
    check(id, create.requestId, "Stable store ID");
    check(
      ((await op(create)) as any).replayed,
      true,
      "Create retry does not duplicate",
    );
    await denied(
      () => op({ ...create, fields: { ...fields, name: "Changed" } }),
      409,
      "Changed retry rejected",
    );
    check(
      ((await op({ action: "list" })) as any).stores.length,
      0,
      "Pending hidden from directory",
    );
    check(
      ((await op({ action: "list", scope: "mine" })) as any).stores.length,
      1,
      "Owner sees own pending store",
    );
    await denied(
      () => op({ action: "detail", storeId: id }, users.member),
      404,
      "Other member cannot see draft",
    );
    await denied(
      () => op({ action: "list", scope: "moderation" }, users.leader),
      403,
      "Cell leader cannot moderate",
    );
    await denied(
      () => moderate({ action: "approve", storeId: id }, users.owner),
      403,
      "Owner cannot self-approve",
    );
    await denied(
      () => moderate({ action: "approve", storeId: id, revision: 0 }),
      409,
      "Stale moderation rejected",
    );
    await moderate({ action: "approve", storeId: id, revision: 1 });
    const listing: any = await op({ action: "list" }, users.member);
    check(listing.stores.length, 1, "Approved in directory");
    check(
      listing.stores[0].ownerId,
      undefined,
      "Owner ID withheld from directory",
    );
    check(
      listing.stores[0].socialLinks.whatsapp,
      "5591999990001",
      "National phone normalized",
    );
    const detail: any = await op({ action: "detail", storeId: id });
    check(detail.store.revision, 2, "Moderation advances revision");
    check(detail.store.socialLinks.facebook,fields.facebook,"Facebook link preserved");
    await seed(`communityStores/${id}/offers/legacy`,{storeId:id,title:"Legacy offer",description:"Old offer",type:"percentage",discountPercentage:10,status:"active",validFrom:"2020-01-01",validUntil:"2099-01-01",images:[]});
    check((await op({action:"detail",storeId:id}) as any).legacyOffers[0].discountPercentage,10,"Legacy offer retained");
    check(detail.canEdit, true, "Owner edit permission");
    await denied(
      () =>
        op(
          {
            action: "save",
            storeId: id,
            revision: 2,
            requestId: randomUUID(),
            fields,
          },
          users.member,
        ),
      403,
      "Other member cannot edit",
    );
    await denied(
      () =>
        op({
          action: "save",
          storeId: id,
          revision: 1,
          requestId: randomUUID(),
          fields,
        }),
      409,
      "Stale edit rejected",
    );
    const edit = {
      action: "save",
      storeId: id,
      revision: 2,
      requestId: randomUUID(),
      fields: { ...fields, name: "Padaria QA editada" },
    };
    await op(edit);
    check(((await op(edit)) as any).replayed, true, "Edit retry safe");
    check(
      (await db.doc(root + "/communityStores/" + id).get()).data()?.status,
      "pending",
      "Edit requires new approval",
    );
    check(
      (await db.collection(root + "/communityStores").get()).size,
      1,
      "Edit preserves single store",
    );
    await moderate({
      action: "reject",
      storeId: id,
      revision: 3,
      reason: "Confira os contatos, por favor.",
    });
    check(
      ((await op({ action: "detail", storeId: id })) as any).store
        .rejectionReason,
      "Confira os contatos, por favor.",
      "Owner receives adjustment reason",
    );
    await op({ ...edit, revision: 4, requestId: randomUUID() });
    await moderate({ action: "approve", storeId: id, revision: 5 });
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Belem",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    const promo = {
      action: "publish",
      storeId: id,
      requestId: randomUUID(),
      title: "Oferta fictícia",
      description: "Somente QA",
      validUntil: today,
    };
    await denied(
      () => op(promo),
      403,
      "Owner cannot bypass promotion moderation",
    );
    await op(promo, users.pastor);
    check(
      ((await op(promo, users.pastor)) as any).replayed,
      true,
      "Publishing retry is idempotent",
    );
    const feed: any = await op({ action: "feed" }, users.member);
    check(feed.promotions.length, 1, "Same-day offer visible on mobile feed");
    check(
      decodeURIComponent(feed.promotions[0].whatsappUrl).includes(
        "Oferta fictícia",
      ),
      true,
      "Contextual WhatsApp message",
    );
    check(
      feed.promotions[0].mapsUrl.includes("maps/search"),
      true,
      "Address map link",
    );
    check(
      ((await op({ action: "detail", storeId: id })) as any).promotions[0].id,
      promo.requestId,
      "Web and mobile same promotion",
    );
    await moderate({
      action: "suspend",
      storeId: id,
      revision: 6,
      reason: "Revisão temporária de cadastro",
    });
    check(
      ((await op({ action: "feed" }, users.member)) as any).promotions.length,
      0,
      "Suspended store offers hidden",
    );
    await denied(
      () => op({ action: "detail", storeId: id }, users.member),
      404,
      "Suspended detail hidden",
    );
    await op({ ...edit, revision: 7, requestId: randomUUID() });
    await moderate({ action: "approve", storeId: id, revision: 8 });
    await op(
      { action: "expire", storeId: id, promotionId: promo.requestId },
      users.pastor,
    );
    check(
      ((await op({ action: "feed" })) as any).promotions.length,
      0,
      "Expired offer removed",
    );
    await denied(
      () =>
        op(
          { ...promo, requestId: randomUUID(), validUntil: "2026-02-30" },
          users.pastor,
        ),
      400,
      "Invalid calendar date rejected",
    );
    for (const bad of [
      { website: "javascript:alert(1)" },
      { facebook: "javascript:alert(1)" },
      { whatsapp: "123" },
      { category: "unknown" },
      { bannerImageUrl: "data:image/png;base64,AAAA" },
      { bannerImageUrl: "data:image/png;base64," + "A".repeat(220000) },
    ])
      await denied(
        () =>
          op({
            ...create,
            requestId: randomUUID(),
            fields: { ...fields, ...bad },
          }),
        400,
        "Invalid field rejected: " + Object.keys(bad)[0],
      );
    // Concurrent submissions based on the same revision cannot overwrite each other.
    const concurrent = await Promise.allSettled([
      op({ ...edit, revision: 9, requestId: randomUUID() }),
      op({
        ...edit,
        revision: 9,
        requestId: randomUUID(),
        fields: { ...fields, name: "Concurrent" },
      }),
    ]);
    check(
      concurrent.filter((r) => r.status === "fulfilled").length,
      1,
      "Concurrent edit accepts only one revision",
    );
    const home: any = await roleHomeOperation(
      { organizationId: org, action: "overview", profile: "pastoral" },
      users.pastor,
    );
    check(
      home.metrics.find((m: any) => m.key === "marketplace-pending")?.value,
      1,
      "Pastor sees pending attention",
    );
    const memberHome: any = await roleHomeOperation(
      { organizationId: org, action: "overview", profile: "member" },
      users.member,
    );
    check(
      memberHome.actions.some((a: any) => a.key === "marketplace"),
      true,
      "Member dashboard links catalog",
    );
    check(
      memberHome.metrics.some((m: any) => m.key === "marketplace-pending"),
      false,
      "Member does not see moderation metric",
    );
    await denied(
      () => op({ action: "list" }, "foreign_uid"),
      403,
      "Foreign tenant actor denied",
    );
    await seed("settings/features", {
      modules: { marketplace: { enabled: false } },
    });
    await denied(() => op({ action: "feed" }), 403, "Module pause enforced");
    await seed("settings/features", {
      modules: { marketplace: { enabled: true } },
    });
    await seed("settings/subscription", { plan: "free" });
    await denied(() => op({ action: "list" }), 403, "Plan enforced");
    await denied(
      () => moderate({ action: "approve", storeId: id }),
      403,
      "Moderation also enforces plan",
    );
    await seed("settings/subscription", { plan: "pastoral" });
    // Pagination does not silently drop stores beyond the first page.
    const batch = db.batch();
    for (let i = 0; i < 105; i++)
      batch.set(
        db.doc(root + "/communityStores/page_" + String(i).padStart(3, "0")),
        {
          ...fields,
          id: "page_" + i,
          organizationId: org,
          ownerId: users.owner,
          status: "approved",
          images: [],
        },
      );
    await batch.commit();
    const first: any = await op({ action: "list" }),
      second: any = await op({ action: "list", cursor: first.cursor });
    check(first.stores.length, 100, "First page bounded");
    check(second.stores.length, 5, "Next page preserves remaining stores");
    check(
      new Set([...first.stores, ...second.stores].map((s) => s.id)).size,
      105,
      "No duplicate cursor rows",
    );
    const unauthorized = await POST(
      new NextRequest("http://127.0.0.1/api/marketplace/community", {
        method: "POST",
        body: "{}",
      }),
    );
    check(unauthorized.status, 401, "HTTP requires authentication");
    const login = await fetch(
      "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-alvo-qa-key",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: users.pastor + "@example.test",
          password: "Fictitious-QA-2026!",
          returnSecureToken: true,
        }),
      },
    );
    const { idToken } = await login.json();
    assert.ok(idToken);
    const response = await POST(
      new NextRequest("http://127.0.0.1/api/marketplace/community", {
        method: "POST",
        headers: {
          authorization: "Bearer " + idToken,
          "content-type": "application/json",
        },
        body: JSON.stringify({ organizationId: org, action: "list" }),
      }),
    );
    check(response.status, 200, "Authenticated HTTP route");
    check(
      response.headers.get("cache-control")?.includes("no-store"),
      true,
      "Private response never cached",
    );
    for (const path of [
      "communityStores/forged",
      "marketplacePromotions/forged",
      "communityStores/" + id + "/offers/forged",
    ]) {
      const r = await fetch(
        `http://127.0.0.1:8080/v1/projects/demo-alvo-qa/databases/(default)/documents/${root}/${path}`,
        {
          method: "PATCH",
          headers: {
            authorization: "Bearer " + idToken,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            fields: {
              organizationId: { stringValue: org },
              ownerId: { stringValue: users.pastor },
              status: { stringValue: "pending" },
            },
          }),
        },
      );
      check(r.status, 403, "Direct client write denied: " + path);
    }
    check(external, false, "No external messages or services called");
    console.log(`Marketplace QA: ${checks} checks passed.`);
  } finally {
    global.fetch = realFetch;
    await db.recursiveDelete(db.doc(root));
    for (const uid of Object.values(users))
      await auth.deleteUser(uid).catch(() => {});
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
