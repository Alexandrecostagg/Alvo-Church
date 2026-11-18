import { homeDestination } from "../packages/domain/src/home-navigation";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { NextRequest } from "next/server";
import { planModuleDefaults } from "../packages/firebase/src/plans";
import { POST } from "../apps/web/app/api/home/route";
import { roleHomeOperation } from "../apps/web/app/api/_lib/role-home";
import type { RoleHomeSnapshot } from "../packages/domain/src/home-profiles";
async function main() {
  if (
    process.env.FIREBASE_PROJECT_ID !== "demo-alvo-qa" ||
    process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:8080" ||
    process.env.FIREBASE_AUTH_EMULATOR_HOST !== "127.0.0.1:9099"
  )
    throw Error("Somente emuladores demo-alvo-qa.");
  const realFetch = global.fetch;
  let external = 0;
  global.fetch = (async (input: any, init: any) => {
    const u = new URL(
      typeof input === "string" ? input : input.url || String(input),
    );
    if (!["localhost", "127.0.0.1"].includes(u.hostname)) {
      external++;
      throw Error("Rede externa proibida no teste de painéis.");
    }
    return realFetch(input, init);
  }) as typeof fetch;
  initializeApp({ projectId: "demo-alvo-qa" });
  const db = getFirestore(),
    auth = getAuth();
  const suffix = randomUUID().slice(0, 8),
    org = `qa_home_${suffix}`,
    child = `qa_home_child_${suffix}`,
    root = `organizations/${org}`;
  const now = Date.now(),
    date = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Belem",
    }).format(now);
  const ids = {
    pastor: `hp_${suffix}`,
    leader: `hl_${suffix}`,
    member: `hm_${suffix}`,
    network: `hn_${suffix}`,
    unlinked: `hu_${suffix}`,
  };
  let checks = 0;
  const check = (condition: unknown, label: string) => {
    assert.ok(condition, label);
    checks++;
    console.log(`OK ${label}`);
  };
  const denied = async (
    body: object,
    uid: string,
    status: number,
    label: string,
  ) => {
    await assert.rejects(
      () => op(body, uid),
      (e: any) => e.status === status,
      label,
    );
    checks++;
    console.log(`OK ${label}`);
  };
  const op = (body: object, uid = ids.pastor) =>
    roleHomeOperation(
      { organizationId: org, ...body },
      uid,
      now,
    ) as Promise<any>;
  const overview = (profile: string, uid: string) =>
    op({ action: "overview", profile }, uid) as Promise<RoleHomeSnapshot>;
  const token = async (uid: string) =>
    (
      await (
        await fetch(
          "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-alvo-qa-key",
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              email: `${uid}@example.test`,
              password: "Local-QA-2026!",
              returnSecureToken: true,
            }),
          },
        )
      ).json()
    ).idToken as string;
  try {
    await db.doc(root).set({
      id: org,
      name: "Igreja fictícia do painel",
      displayName: "Igreja fictícia do painel",
      status: "active",
      timezone: "America/Belem",
      organizationTier: "network",
      slug: `painel-${suffix}`,
    });
    await db
      .doc(`${root}/settings/subscription`)
      .set({ organizationId: org, plan: "rede", billingStatus: "active" });
    await db.doc(`${root}/settings/features`).set({
      organizationId: org,
      modules: Object.fromEntries(
        Object.entries(planModuleDefaults("rede")).map(([key, enabled]) => [
          key,
          { enabled, source: "plan" },
        ]),
      ),
    });
    await db.doc(`${root}/settings/branding`).set({
      organizationId: org,
      publicProductName: "Esdras QA · responsabilidades",
      primaryColor: "#173d30",
      groupsModuleLabel: "Células",
    });
    const roleMap = {
      pastor: ["pastor", "group_leader"],
      leader: ["group_leader"],
      member: ["member"],
      network: ["church_admin"],
      unlinked: ["group_leader"],
    };
    for (const [key, uid] of Object.entries(ids)) {
      await auth.createUser({
        uid,
        email: `${uid}@example.test`,
        password: "Local-QA-2026!",
        displayName: `QA ${key}`,
      });
      await auth.setCustomUserClaims(uid, { organizationId: org });
      await db.doc(`${root}/users/${uid}`).set({
        id: uid,
        organizationId: org,
        isActive: true,
        roles: roleMap[key as keyof typeof roleMap],
        personId: key,
        email: `${uid}@example.test`,
      });
      await db.doc(`${root}/people/${key}`).set({
        id: key,
        organizationId: org,
        status: "active",
        firstName: `Pessoa fictícia ${key}`,
        lastName: "QA",
        birthDate: `1980-${date.slice(5)}`,
        phone: "PRIVATE_PHONE",
        cpf: "PRIVATE_DOCUMENT",
        pastoralNotes: "PRIVATE_NOTES",
      });
      if (key !== "unlinked") {
        await db.doc(`${root}/memberAccountLinks/${uid}`).set({
          organizationId: org,
          userId: uid,
          personId: key,
          verifiedBy: ids.network,
        });
        await db
          .doc(`${root}/memberAccountClaims/${key}`)
          .set({ organizationId: org, userId: uid, personId: key });
      }
    }
    for (const g of ["alpha", "beta"]) {
      await db.doc(`${root}/groups/${g}`).set({
        id: g,
        organizationId: org,
        name: `Célula ${g}`,
        status: "active",
        meetingTime: "19:30",
      });
      await db.doc(`${root}/groups/${g}/meetings/today`).set({
        id: "today",
        organizationId: org,
        groupId: g,
        scheduledStartAt: new Date(now - 3600000).toISOString(),
        meetingStatus: "scheduled",
      });
    }
    for (const [g, personId, role] of [
      ["alpha", "leader", "leader"],
      ["alpha", "member", "member"],
      ["alpha", "pastor", "co_leader"],
      ["beta", "leader", "member"],
      ["beta", "network", "leader"],
    ])
      await db
        .doc(`${root}/groups/${g}/members/${g}_${personId}`)
        .set({ organizationId: org, groupId: g, personId, roleInGroup: role });
    await db.doc(`${root}/events/next`).set({
      organizationId: org,
      name: "Encontro fictício",
      status: "published",
      startsAt: new Date(now + 86400000).toISOString(),
      locationName: "Local fictício",
    });
    await db.doc(`${root}/events/draft`).set({
      organizationId: org,
      name: "DRAFT_SECRET",
      status: "draft",
      startsAt: new Date(now + 86400000).toISOString(),
    });
    await db.doc(`${root}/serviceAssignments/own`).set({
      organizationId: org,
      personId: "member",
      status: "pending",
      serviceDate: new Date(now + 86400000).toISOString(),
    });
    await db.doc(`${root}/serviceAssignments/other`).set({
      organizationId: org,
      personId: "leader",
      status: "pending",
      serviceDate: new Date(now + 86400000).toISOString(),
    });
    await db.doc(`${root}/followUpTasks/task`).set({
      organizationId: org,
      title: "Acompanhamento privado da secretaria",
      status: "open",
      assignedToUserId: ids.pastor,
    });
    const p = await overview("pastoral", ids.pastor);
    check(
      p.profiles.includes("cell_leader") && p.profiles.includes("member"),
      "cargos acumulados oferecem visões autorizadas",
    );
    check(
      p.metrics.find((m) => m.key === "people")?.value === 5,
      "agregação REST conta pessoas ativas",
    );
    check(
      p.birthdays.length === 5,
      "pastor consulta aniversários da instituição",
    );
    const l = await overview("cell_leader", ids.leader);
    check(
      l.groups.length === 1 && l.groups[0].id === "alpha",
      "líder vê somente célula de que é responsável",
    );
    check(
      l.birthdays.length === 3 && !l.birthdays.some((b) => b.id === "network"),
      "aniversários limitados ao roster do líder",
    );
    check(
      l.tasks.length === 0,
      "tarefa de outra pessoa não aparece para líder",
    );
    check(
      !JSON.stringify(l).includes("PRIVATE_"),
      "resposta exclui telefone, documentos e notas pastorais",
    );
    const m = await overview("member", ids.member);
    check(
      m.birthdays.length === 0 &&
        m.absences.length === 0 &&
        m.tasks.length === 0,
      "membro não recebe listas de cuidado nem aniversários gerais",
    );
    check(
      m.metrics.find((x) => x.key === "serving")?.value === 1,
      "membro conta apenas escalas próprias",
    );
    check(
      m.events.length === 1 && !JSON.stringify(m).includes("DRAFT_SECRET"),
      "agenda inclui somente eventos publicados",
    );
    check(
      !m.actions.some((a) =>
        ["finance", "people", "operations"].includes(a.key),
      ),
      "ações de membro excluem gestão da igreja",
    );
    await denied(
      { action: "overview", profile: "pastoral" },
      ids.member,
      403,
      "perfil forjado não amplia acesso",
    );
    await denied(
      { action: "overview", organizationId: child },
      ids.member,
      403,
      "instituição forjada não amplia acesso",
    );
    await denied(
      { action: "group-detail", profile: "cell_leader", groupId: "beta" },
      ids.leader,
      403,
      "ser membro de outra célula não dá acesso de líder",
    );
    await denied(
      { action: "group-detail", profile: "member", groupId: "alpha" },
      ids.member,
      403,
      "membro não consulta roster nem presenças de terceiros",
    );
    const d = await op(
      { action: "group-detail", profile: "cell_leader", groupId: "alpha" },
      ids.leader,
    );
    check(
      d.people.length === 3 && d.meetingId === "today",
      "líder consulta encontro e roster próprio",
    );
    await op(
      {
        action: "attendance",
        profile: "cell_leader",
        groupId: "alpha",
        meetingId: "today",
        personId: "member",
        status: "present",
        expectedStatus: null,
      },
      ids.leader,
    );
    check(
      (
        await db
          .doc(`${root}/groups/alpha/meetings/today/attendance/today_member`)
          .get()
      ).data()?.attendanceStatus === "present",
      "presença persiste no contrato usado pelo app",
    );
    await denied(
      {
        action: "attendance",
        profile: "cell_leader",
        groupId: "alpha",
        meetingId: "today",
        personId: "member",
        status: "absent",
        expectedStatus: null,
      },
      ids.leader,
      409,
      "conflito de presença exige atualização",
    );
    await denied(
      {
        action: "attendance",
        profile: "cell_leader",
        groupId: "alpha",
        meetingId: "today",
        personId: "network",
        status: "present",
        expectedStatus: null,
      },
      ids.leader,
      403,
      "presença de pessoa fora da célula bloqueada",
    );
    const created = await op(
      {
        action: "create-meeting",
        profile: "cell_leader",
        groupId: "alpha",
        date,
        time: "19:30",
        requestId: "same_attempt",
      },
      ids.leader,
    );
    const again = await op(
      {
        action: "create-meeting",
        profile: "cell_leader",
        groupId: "alpha",
        date,
        time: "19:30",
        requestId: "same_attempt",
      },
      ids.leader,
    );
    check(
      created.id === again.id && again.replayed,
      "criação de encontro é idempotente",
    );
    await denied(
      {
        action: "create-meeting",
        profile: "cell_leader",
        groupId: "alpha",
        date: "2030-01-01",
        time: "19:30",
        requestId: "far_future",
      },
      ids.leader,
      400,
      "data de encontro fora do período bloqueada",
    );
    const absence = await op(
      {
        action: "absence",
        profile: "cell_leader",
        groupId: "alpha",
        personId: "member",
        date,
        note: "Fazer contato fictício",
      },
      ids.leader,
    );
    check(
      (await overview("cell_leader", ids.leader)).absences.length === 1,
      "ausência percebida aparece no acompanhamento do líder",
    );
    check(
      (await overview("member", ids.member)).absences.length === 0,
      "registro de cuidado não é exposto ao perfil membro",
    );
    await denied(
      {
        action: "absence",
        profile: "cell_leader",
        groupId: "alpha",
        personId: "network",
        date,
      },
      ids.leader,
      403,
      "líder não registra cuidado para pessoa de outra célula",
    );
    await db.doc(`${root}/groups/alpha/members/alpha_member`).delete();
    check(
      (await overview("cell_leader", ids.leader)).absences.length === 0,
      "pessoa desvinculada deixa o cuidado do líder",
    );
    await denied(
      { action: "close-absence", profile: "cell_leader", id: absence.id },
      ids.leader,
      403,
      "líder não altera cuidado de pessoa desvinculada",
    );
    await db.doc(`${root}/groups/alpha/members/alpha_member`).set({
      organizationId: org,
      groupId: "alpha",
      personId: "member",
      roleInGroup: "member",
    });
    await op(
      { action: "close-absence", profile: "cell_leader", id: absence.id },
      ids.leader,
    );
    check(
      (await overview("cell_leader", ids.leader)).absences.length === 0,
      "contato realizado encerra acompanhamento",
    );
    await denied(
      { action: "search-people", profile: "cell_leader", search: "Pessoa" },
      ids.leader,
      403,
      "líder não pesquisa diretório de toda igreja",
    );
    const search = await op({
      action: "search-people",
      profile: "pastoral",
      search: "member",
    });
    check(
      search.people.length === 1 &&
        Object.keys(search.people[0]).sort().join() === "id,name",
      "busca pastoral retorna somente identificador e nome",
    );
    check(
      (await overview("cell_leader", ids.unlinked)).groups.length === 0,
      "cargo sem vínculo verificado não recebe células",
    );
    await db
      .doc(`${root}/memberAccountClaims/leader`)
      .update({ userId: ids.member });
    await denied(
      { action: "group-detail", profile: "cell_leader", groupId: "alpha" },
      ids.leader,
      403,
      "vínculo contraditório bloqueia liderança",
    );
    await db
      .doc(`${root}/memberAccountClaims/leader`)
      .update({ userId: ids.leader });
    await db
      .doc(`${root}/groups/alpha/members/alpha_leader`)
      .update({ roleInGroup: "member" });
    check(
      (await overview("cell_leader", ids.leader)).groups.length === 0,
      "remoção da responsabilidade vale na próxima consulta",
    );
    await db
      .doc(`${root}/groups/alpha/members/alpha_leader`)
      .update({ roleInGroup: "leader" });
    await db
      .doc(`${root}/settings/features`)
      .update({ "modules.groups.enabled": false });
    await denied(
      { action: "group-detail", profile: "cell_leader", groupId: "alpha" },
      ids.leader,
      403,
      "módulo desligado bloqueia operação mesmo com cargo",
    );
    check(
      !(await overview("member", ids.member)).actions.some(
        (a) => a.key === "groups",
      ),
      "módulo desligado remove atalho pessoal",
    );
    await db.doc(`${root}/settings/features`).set({
      organizationId: org,
      modules: Object.fromEntries(
        Object.entries(planModuleDefaults("rede")).map(([key, enabled]) => [
          key,
          { enabled, source: "plan" },
        ]),
      ),
    });
    await db
      .doc(`organizations/${child}`)
      .set({ id: child, name: "Filial fictícia", status: "active" });
    await db.doc(`${root}/affiliates/aff`).set({
      id: "aff",
      parentOrganizationId: org,
      childOrganizationId: child,
      status: "active",
      childName: "Filial fictícia",
    });
    await db.doc(`networkAffiliations/${child}`).set({
      parentOrganizationId: org,
      childOrganizationId: child,
      affiliateId: "aff",
      status: "active",
    });
    await db.doc(`organizations/${child}/networkSnapshots/today`).set({
      organizationId: child,
      date,
      totalMembers: 800,
      activeGroups: 40,
    });
    await db
      .doc(`organizations/${child}/people/secret`)
      .set({ organizationId: child, firstName: "CHILD_PRIVATE_PERSON" });
    const n = await overview("network", ids.network);
    check(
      n.churches.length === 1 &&
        n.metrics.find((x) => x.key === "members")?.value === 800,
      "rede consolida indicadores de vínculo bilateral ativo",
    );
    check(
      !JSON.stringify(n).includes("CHILD_PRIVATE_PERSON") &&
        !n.birthdays.length,
      "painel de rede não lê fichas pessoais de filiais",
    );
    await db
      .doc(`organizations/${child}/networkSnapshots/today`)
      .update({ totalMembers: "invalid" });
    const invalidSnapshot = await overview("network", ids.network);
    check(
      invalidSnapshot.churches[0].members === null &&
        invalidSnapshot.warnings.some((w) => w.includes("inválido")),
      "consolidado inválido não vira número ou zero na rede",
    );
    await db
      .doc(`organizations/${child}/networkSnapshots/today`)
      .update({
        totalMembers: 800,
        date: new Date(now - 10 * 86400000).toISOString().slice(0, 10),
      });
    const staleSnapshot = await overview("network", ids.network);
    check(
      staleSnapshot.churches[0].members === 800 &&
        staleSnapshot.warnings.some((w) => w.includes("mais de 7 dias")),
      "rede distingue consolidados antigos dos indicadores atuais",
    );
    await db
      .doc(`organizations/${child}/networkSnapshots/today`)
      .update({ date });
    await denied(
      { action: "overview", profile: "network" },
      ids.pastor,
      403,
      "cargo pastor não concede liderança de rede",
    );
    await db.doc(`networkAffiliations/${child}`).update({ status: "revoked" });
    check(
      (await overview("network", ids.network)).churches.length === 0,
      "vínculo de rede revogado exclui consolidado",
    );
    await db.doc(`networkAffiliations/${child}`).update({ status: "active" });
    await db.doc(`organizations/${child}/networkSnapshots/today`).delete();
    const noSnapshot = await overview("network", ids.network);
    check(
      noSnapshot.churches[0].members === null &&
        noSnapshot.metrics.find((m) => m.key === "members")?.value === null,
      "falta de consolidado não vira zero",
    );
    await db.doc(`organizations/${child}/networkSnapshots/today`).set({
      organizationId: child,
      date,
      totalMembers: 800,
      activeGroups: 40,
    });
    await db.doc(`organizations/${child}`).update({ status: "suspended" });
    check(
      (await overview("network", ids.network)).churches.length === 0,
      "igreja suspensa não entra no consolidado",
    );
    await db.doc(`organizations/${child}`).update({ status: "active" });
    await db.doc(`${root}/users/${ids.member}`).update({ isActive: false });
    await denied(
      { action: "overview" },
      ids.member,
      403,
      "conta desativada não consulta painel",
    );
    await db.doc(`${root}/users/${ids.member}`).update({ isActive: true });
    await db.doc(`${root}/settings/subscription`).update({ plan: "free" });
    await denied(
      { action: "group-detail", profile: "cell_leader", groupId: "alpha" },
      ids.leader,
      403,
      "plano gratuito não libera gestão de células",
    );
    await denied(
      { action: "overview", profile: "network" },
      ids.network,
      403,
      "plano gratuito não libera rede de igrejas",
    );
    await db.doc(`${root}/settings/subscription`).update({ plan: "rede" });
    await db.doc(`${root}/people/member`).update({
      whatsappPhone: "62999990000",
      address: {
        street: "Rua Fictícia",
        number: "10",
        city: "Cidade QA",
        state: "PA",
      },
    });
    const contactBody = {
      action: "contact",
      profile: "cell_leader",
      groupId: "alpha",
      personId: "member",
      reason: "care",
      channel: "whatsapp",
    };
    const contact = await op(contactBody, ids.leader);
    check(
      contact.url.startsWith("https://wa.me/5562999990000?text=") &&
        contact.message.includes("Pessoa fictícia member"),
      "WhatsApp direto com nome e mensagem contextual",
    );
    const optedOut = db.doc(
      `${root}/whatsappContacts/${createHash("sha256").update("5562999990000").digest("hex")}`,
    );
    await optedOut.set({ organizationId: org, optOut: true });
    await denied(
      contactBody,
      ids.leader,
      409,
      "dashboard respeita saída registrada no WhatsApp sem depender do cadastro",
    );
    await optedOut.delete();
    await db
      .doc(`${root}/settings/features`)
      .update({ "modules.communication.enabled": false });
    await denied(
      contactBody,
      ids.leader,
      403,
      "dashboard bloqueia contato quando Comunicação está desativada",
    );
    await db
      .doc(`${root}/settings/features`)
      .update({ "modules.communication.enabled": true });
    const birthday = await op(
      { ...contactBody, reason: "birthday" },
      ids.leader,
    );
    check(
      birthday.message.includes("aniversário") &&
        birthday.message !== contact.message,
      "mensagem de aniversário difere do cuidado",
    );
    const map = await op({ ...contactBody, channel: "map" }, ids.leader);
    check(
      new URL(map.url).searchParams.get("query")?.includes("Rua Fictícia"),
      "mapa usa endereço cadastrado e codificado",
    );
    await denied(
      { ...contactBody, personId: "network" },
      ids.leader,
      403,
      "contato de outra célula não exposto",
    );
    await denied(
      { ...contactBody, profile: "member" },
      ids.member,
      403,
      "membro não obtém endereço de terceiros",
    );
    await db.doc(`${root}/people/member`).update({ communicationOptOut: true });
    await denied(
      contactBody,
      ids.leader,
      409,
      "preferência de não receber WhatsApp respeitada",
    );
    await db
      .doc(`${root}/people/member`)
      .update({ communicationOptOut: false });
    await denied(
      { ...contactBody, personId: "leader", channel: "map" },
      ids.leader,
      409,
      "endereço incompleto não abre mapa genérico",
    );
    const evolution = await op(
      { action: "evolution", profile: "cell_leader" },
      ids.leader,
    );
    check(
      evolution.weeks.length === 8 &&
        evolution.groups.length === 1 &&
        evolution.groups[0].id === "alpha",
      "gráficos usam oito semanas e somente células lideradas",
    );
    check(
      evolution.weeks.reduce((s: number, w: any) => s + w.present, 0) === 1,
      "gráfico conta presença persistida",
    );
    await db.doc(`${root}/groups/alpha/meetings/no_call`).set({
      organizationId: org,
      groupId: "alpha",
      scheduledStartAt: new Date(now - 2 * 86400000).toISOString(),
      meetingStatus: "completed",
    });
    const missing = await op(
      { action: "evolution", profile: "cell_leader" },
      ids.leader,
    );
    check(
      missing.groups[0].missing >= 1 &&
        missing.weeks.reduce((s: number, w: any) => s + w.absent, 0) === 0,
      "sem chamada não inventa ausências",
    );
    await denied(
      { action: "evolution", profile: "member" },
      ids.member,
      403,
      "membro não obtém evolução dos participantes",
    );
    const memberToken = await token(ids.member);
    const api = async (body: object, authToken: string) =>
      POST(
        new NextRequest("http://127.0.0.1:3001/api/home", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ organizationId: org, ...body }),
        }),
      );
    check(
      (await api({ action: "overview" }, "")).status === 401,
      "rota exige autenticação",
    );
    const http = await api({ action: "overview" }, memberToken);
    check(
      http.status === 200 &&
        http.headers.get("cache-control")?.includes("no-store"),
      "rota pessoal autenticada sem cache compartilhado",
    );
    check(
      (await api({ action: "overview", profile: "pastoral" }, memberToken))
        .status === 403,
      "rota rejeita perfil pastoral forjado",
    );
    for (const path of [
      `${root}/perceivedAbsences/${absence.id}`,
      `${root}/groups/beta/members/beta_network`,
    ]) {
      const direct = await fetch(
        `http://127.0.0.1:8080/v1/projects/demo-alvo-qa/databases/(default)/documents/${path}`,
        { headers: { Authorization: `Bearer ${memberToken}` } },
      );
      check(
        direct.status === 403,
        `Firestore não permite contornar escopo: ${path.split("/").slice(-2).join("/")}`,
      );
    }
    for (let start = 0; start < 510; start += 300) {
      const batch = db.batch();
      for (let i = start; i < Math.min(start + 300, 510); i++)
        batch.set(db.doc(`${root}/people/count_${i}`), {
          organizationId: org,
          status: "active",
          firstName: `Fictício ${i}`,
        });
      await batch.commit();
    }
    const many = await overview("pastoral", ids.pastor);
    check(
      many.metrics.find((x) => x.key === "people")?.value === 515 &&
        many.warnings.some((w) => w.includes("incompleta")),
      "indicador exato acima do limite de exibição, com aviso de lista parcial",
    );
    for (let start = 0; start < 510; start += 300) {
      const remove = db.batch();
      for (let i = start; i < Math.min(start + 300, 510); i++)
        remove.delete(db.doc(`${root}/people/count_${i}`));
      await remove.commit();
    }
    for (const [profile, uid] of [
      ["pastoral", ids.pastor],
      ["administration", ids.network],
      ["cell_leader", ids.leader],
      ["member", ids.member],
      ["network", ids.network],
    ]) {
      const snapshot = await overview(profile, uid);
      check(
        snapshot.actions.every((a) =>
          homeDestination(a.href, snapshot.profile),
        ) &&
          snapshot.metrics.every(
            (m) => !m.href || homeDestination(m.href, snapshot.profile),
          ),
        `todos os atalhos e indicadores abrem no app: ${profile}`,
      );
      if (profile !== "network")
        check(
          snapshot.actions.some((a) => a.key === "events") &&
            snapshot.actions.some((a) => a.key === "learning"),
          `agenda e aprendizado acessíveis: ${profile}`,
        );
    }
    for (let start = 0; start < 510; start += 300) {
      const batch = db.batch();
      for (let i = start; i < Math.min(start + 300, 510); i++)
        batch.set(db.doc(`${root}/events/old_${i}`), {
          organizationId: org,
          status: "published",
          name: "Evento antigo",
          startsAt: new Date(now - 86400000).toISOString(),
        });
      await batch.commit();
    }
    check(
      (await overview("member", ids.member)).events.some(
        (e) => e.id === "next",
      ),
      "mais de 500 eventos passados não ocultam a agenda futura",
    );
    const nextBatch = db.batch();
    for (let i = 1; i <= 8; i++)
      nextBatch.set(db.doc(`${root}/events/future_${i}`), {
        organizationId: org,
        status: "published",
        name: `Futuro ${i}`,
        startsAt: new Date(now + (i + 1) * 86400000).toISOString(),
      });
    await nextBatch.commit();
    const agenda = await overview("member", ids.member);
    check(
      agenda.events.length === 6 &&
        agenda.events[0].id === "next" &&
        agenda.events[5].id === "future_5" &&
        agenda.warnings.some((w) => w.includes("6 eventos")),
      "agenda ordenada, limitada e com aviso explícito",
    );
    const classBatch = db.batch();
    for (let i = 0; i < 35; i++)
      classBatch.set(db.doc(`${root}/groups/000_class_${i}`), {
        organizationId: org,
        status: "active",
        type: "class",
        name: "Classe",
      });
    await classBatch.commit();
    const withClasses = await op({ action: "evolution", profile: "pastoral" });
    check(
      withClasses.groups.length === 2 && !withClasses.partial,
      "classes anteriores na consulta não ocultam células do gráfico",
    );
    // Remove classes before exercising roster limits for leaders.
    const deleteClasses = db.batch();
    for (let i = 0; i < 35; i++)
      deleteClasses.delete(db.doc(`${root}/groups/000_class_${i}`));
    await deleteClasses.commit();
    await db.doc(`${root}/people/inactive`).set({
      organizationId: org,
      status: "inactive",
      firstName: "INACTIVE_SECRET",
    });
    const careBatch = db.batch();
    careBatch.set(db.doc(`${root}/perceivedAbsences/000_inactive`), {
      organizationId: org,
      personId: "inactive",
      status: "open",
      date,
    });
    for (let i = 0; i < 35; i++)
      careBatch.set(db.doc(`${root}/perceivedAbsences/many_${i}`), {
        organizationId: org,
        personId: "member",
        status: "open",
        date,
      });
    await careBatch.commit();
    const careList = await overview("pastoral", ids.pastor);
    check(
      !JSON.stringify(careList).includes("INACTIVE_SECRET") &&
        careList.warnings.some((w) => w.includes("inativos")),
      "cadastros inativos não são exibidos como contatos ativos",
    );
    check(
      careList.absences.length <= 30 &&
        careList.warnings.some((w) =>
          w.includes("lista rápida de acompanhamento"),
        ),
      "limite de contatos é informado também ao pastor",
    );
    // Restore fixtures used by visual QA.
    for (const collection of ["events", "perceivedAbsences"]) {
      const docs = await db.collection(`${root}/${collection}`).get();
      for (let start = 0; start < docs.size; start += 300) {
        const batch = db.batch();
        for (const doc of docs.docs.slice(start, start + 300))
          if (
            doc.id.startsWith("old_") ||
            doc.id.startsWith("future_") ||
            doc.id.startsWith("many_") ||
            doc.id === "000_inactive"
          )
            batch.delete(doc.ref);
        await batch.commit();
      }
    }
    await db.doc(`${root}/people/inactive`).delete();
    check(
      external === 0,
      "nenhum serviço externo, mensagem ou cobrança acionado",
    );
    console.log(
      JSON.stringify(
        {
          checks,
          organizationId: org,
          accounts: Object.fromEntries(
            Object.entries(ids).map(([k, v]) => [k, `${v}@example.test`]),
          ),
          password: "Local-QA-2026!",
          kept: process.env.QA_KEEP_HOME_DEMO === "1",
        },
        null,
        2,
      ),
    );
  } finally {
    global.fetch = realFetch;
    if (process.env.QA_KEEP_HOME_DEMO !== "1") {
      await db.recursiveDelete(db.doc(root));
      await db.recursiveDelete(db.doc(`organizations/${child}`));
      await db.doc(`networkAffiliations/${child}`).delete();
      for (const uid of Object.values(ids))
        await auth.deleteUser(uid).catch(() => {});
    }
  }
}
main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
