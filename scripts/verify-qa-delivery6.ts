import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
if (
  process.env.FIREBASE_PROJECT_ID !== "demo-alvo-qa" ||
  process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:8080" ||
  process.env.FIREBASE_AUTH_EMULATOR_HOST !== "127.0.0.1:9099"
)
  throw new Error("Somente QA local.");
initializeApp({ projectId: "demo-alvo-qa" });
const db = getFirestore(),
  orgId = `qa_d6_${randomUUID()}`,
  org = db.doc(`organizations/${orgId}`),
  slug = `qa-d6-${randomUUID()}`;
const admin = "qa_admin_principal",
  member = "qa_admin_secundaria";
let checks = 0;
function equal(a: unknown, b: unknown, label: string) {
  assert.deepEqual(a, b, label);
  checks++;
}
async function login(who: string) {
  const r = await fetch(
    "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-alvo-qa-key",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: `admin.${who}@example.test`,
        password: "Local-QA-2026!",
        returnSecureToken: true,
      }),
    },
  );
  assert.equal(r.status, 200);
  return (await r.json()).idToken as string;
}
async function api(path: string, body: object, token?: string) {
  const r = await fetch(`http://127.0.0.1:3001/api/${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ organizationId: orgId, ...body }),
  });
  return { status: r.status, data: await r.json() };
}
async function direct(
  path: string,
  token: string,
  method = "GET",
  fields?: object,
) {
  return (
    await fetch(
      `http://127.0.0.1:8080/v1/projects/demo-alvo-qa/databases/(default)/documents/${org.path}/${path}`,
      {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        ...(fields ? { body: JSON.stringify({ fields }) } : {}),
      },
    )
  ).status;
}
const person = {
  firstName: "Visitante QA",
  lastName: "",
  whatsappPhone: "91999999999",
};
const reception = () => ({
  requestId: randomUUID(),
  workflow: "reception",
  person,
  reception: { source: "Recepção" },
});
const session = (id = randomUUID()) => ({
  action: "configure",
  sessionId: id,
  serviceTeamId: "kids",
  eventId: "service",
  startsAt: new Date(Date.now() - 60000).toISOString(),
  endsAt: new Date(Date.now() + 3600000).toISOString(),
  capacity: 1,
  expectedVersion: 0,
  operatorIds: [member],
});
const child = (sessionId: string) => ({
  action: "check_in",
  sessionId,
  requestId: randomUUID(),
  childName: "Criança QA",
  guardianName: "Responsável QA",
  guardianEmail: "",
  authorizedNames: [],
  identityConfirmed: true,
});
async function run() {
  const a = await login("principal"),
    m = await login("secundaria");
  await org.set({ organizationId: orgId, status: "active", memberCount: 0 });
  await org
    .collection("settings")
    .doc("subscription")
    .set({ plan: "free", billingStatus: "active" });
  await org
    .collection("users")
    .doc(admin)
    .set({
      organizationId: orgId,
      isActive: true,
      roles: ["church_admin"],
      email: "admin.principal@example.test",
    });
  await org
    .collection("users")
    .doc(member)
    .set({
      organizationId: orgId,
      isActive: true,
      roles: ["ministry_leader"],
      email: "admin.secundaria@example.test",
    });
  await org
    .collection("settings")
    .doc("kids")
    .set({
      qrGeneratorRoles: ["ministry_leader"],
      kidsTeamIds: ["kids", "other-room"],
    });
  await org.collection("serviceTeams").doc("kids").set({
    id: "kids",
    organizationId: orgId,
    name: "Sala QA",
    status: "active",
  });
  await org.collection("serviceTeams").doc("other-room").set({
    id: "other-room",
    organizationId: orgId,
    name: "Outra sala",
    status: "active",
  });
  await org.collection("events").doc("service").set({
    organizationId: orgId,
    name: "Culto QA",
    status: "published",
    startsAt: new Date().toISOString(),
  });
  await db.doc(`org_slugs/${slug}`).set({ organizationId: orgId });
  // Central creation: atomic workflow, all origins and direct-rule rejection.
  equal((await api("members", reception())).status, 401, "Sem login");
  equal(
    (await api("members", reception(), m)).status,
    403,
    "Papel sem cadastro",
  );
  const sample = reception();
  const registered = await Promise.all([
    api("members", sample, a),
    api("members", sample, a),
  ]);
  equal(
    registered.map((r) => r.status),
    [200, 200],
    JSON.stringify(registered),
  );
  equal((await org.collection("people").get()).size, 1, "Uma pessoa por retry");
  equal((await org.collection("visitorJourneys").get()).size, 1, "Uma jornada");
  equal(
    (await org.collection("followUpTasks").get()).size,
    2,
    "Duas tarefas atômicas",
  );
  equal(
    await direct("people/bypass", a, "PATCH", {
      organizationId: { stringValue: orgId },
      firstName: { stringValue: "Bypass" },
    }),
    403,
    "Admin não cria pessoa direto",
  );
  const serving = {
    requestId: randomUUID(),
    workflow: "serving",
    person,
    serving: {
      serviceTeamId: "kids",
      role: "Apoio",
      serviceDate: new Date().toISOString().replace(/\.\d{3}Z$/, ".000Z"),
    },
  };
  equal(
    (
      await api(
        "members",
        {
          ...serving,
          serving: { ...serving.serving, serviceTeamId: "missing" },
        },
        a,
      )
    ).status,
    409,
    "Ministério ausente",
  );
  equal(
    (await org.collection("people").get()).size,
    1,
    "Falha sem pessoa parcial",
  );
  const volunteer = await api("members", serving, a);
  equal(volunteer.status, 200, JSON.stringify(volunteer));
  equal(
    (
      await org
        .collection("serviceAssignments")
        .doc(volunteer.data.assignmentId)
        .get()
    ).data()?.personId,
    volunteer.data.personId,
    "Escala vinculada",
  );
  equal((await api("members", serving, a)).status, 200, "Retry escala");
  equal(
    (await org.collection("serviceAssignments").get()).size,
    1,
    "Escala única",
  );
  // Public persistent limits, retries, consent, inactive tenant and safe conversion.
  const visit = {
    orgSlug: slug,
    name: "Pessoa pública QA",
    phone: "91999999999",
    consent: false,
    firstVisit: true,
  };
  equal(
    (await api("public/visit", { ...visit, consent: "false" })).status,
    400,
    "Booleano estrito",
  );
  equal(
    (await api("public/visit", { ...visit, name: { attack: true } })).status,
    400,
    "Formato inválido",
  );
  const captured = await api("public/visit", visit);
  equal(captured.status, 200, JSON.stringify(captured));
  equal(
    (await api("public/visit", visit)).data.replayed,
    true,
    "Reenvio público idempotente",
  );
  equal(
    (await org.collection("people").get()).size,
    2,
    "Público não cria membros",
  );
  equal(
    (
      await org.collection("visitorIntakes").doc(captured.data.intakeId).get()
    ).data()?.consentMarketing,
    false,
    "Opt-out preservado",
  );
  const convert = {
    ...reception(),
    reception: { source: "public_form", intakeId: captured.data.intakeId },
  };
  const conversion = await Promise.all([
    api("members", convert, a),
    api("members", { ...convert, requestId: randomUUID() }, a),
  ]);
  equal(
    conversion.map((r) => r.status).sort(),
    [200, 409],
    "Intake convertido uma vez",
  );
  equal((await org.collection("people").get()).size, 3, "Uma conversão");
  for (let i = 0; i < 4; i++)
    equal(
      (await api("public/visit", { ...visit, name: `Visitante limite ${i}` }))
        .status,
      200,
      "Cota até cinco",
    );
  equal(
    (await api("public/visit", { ...visit, name: "Excesso" })).status,
    429,
    "Cota persistente aplicada",
  );
  const limitDocs = await org.collection("publicIntakeLimits").get();
  equal(limitDocs.size, 3, "Contadores persistidos");
  equal(
    await direct(`publicIntakeLimits/${limitDocs.docs[0].id}`, a),
    403,
    "Contador privado inclusive admin",
  );
  equal(
    (
      await api("public/visit", {
        ...visit,
        name: "Bot",
        companyWebsite: "https://bot.invalid",
      })
    ).status,
    200,
    "Honeypot neutro",
  );
  equal(
    (await org.collection("visitorIntakes").where("name", "==", "Bot").get())
      .size,
    0,
    "Honeypot não grava",
  );
  // Simultaneous final free slot across different entry points.
  const batch = db.batch();
  for (let i = 3; i < 49; i++)
    batch.set(org.collection("people").doc(`existing_${i}`), {
      organizationId: orgId,
      firstName: "Existente",
    });
  await batch.commit();
  await org.update({ memberCount: 0 }); // A stale helper counter cannot bypass the actual count.
  const race = await Promise.all([
    api("members", reception(), a),
    api("members", { ...serving, requestId: randomUUID() }, a),
    api(
      "members",
      {
        requestId: randomUUID(),
        person: { firstName: "Membro", lastName: "QA" },
      },
      a,
    ),
  ]);
  equal(
    race.map((r) => r.status).sort(),
    [200, 409, 409],
    JSON.stringify(race),
  );
  equal(
    (await org.collection("people").get()).size,
    50,
    "Limite total preservado",
  );
  equal(
    (await org.get()).data()?.memberCount,
    50,
    "Contador corrigido pela contagem real",
  );
  const before = (await org.collection("followUpTasks").get()).size;
  equal((await api("members", reception(), a)).status, 409, "Plano cheio");
  equal(
    (await org.collection("followUpTasks").get()).size,
    before,
    "Limite sem tarefas órfãs",
  );
  // Session authorization, room capacity and revocation.
  const config = session();
  equal(
    (await api("kids/operations", config, m)).status,
    403,
    "Operador não configura escala",
  );
  equal(
    (await api("kids/operations", { ...config, operatorIds: ["missing"] }, a))
      .status,
    409,
    "Conta escalada inexistente",
  );
  equal(
    (await api("kids/operations", { ...config, eventId: "foreign" }, a)).status,
    409,
    "Evento de outro tenant negado",
  );
  const configured = await api("kids/operations", config, a);
  equal(configured.status, 200, JSON.stringify(configured));
  equal(
    (await api("kids/operations", { ...config, sessionId: randomUUID() }, a))
      .status,
    409,
    "Sala não duplica sessão sobreposta",
  );
  equal(
    (await api("kids/operations", { ...config, capacity: 20 }, a)).status,
    409,
    "CAS impede sobrescrita",
  );
  equal(
    (await api("kids/operations", { action: "sessions" }, m)).data.sessions
      .length,
    1,
    "Equipe vê a sessão atribuída",
  );
  equal(
    await direct(`kidsOperationSessions/${config.sessionId}`, m),
    403,
    "Sessão lida pela API filtrada",
  );
  const room2 = {
    ...session(),
    serviceTeamId: "other-room",
    operatorIds: [admin],
  };
  equal((await api("kids/operations", room2, a)).status, 200, "Outra sessão");
  equal(
    (
      await api(
        "kids/operations",
        { action: "list", sessionId: room2.sessionId },
        m,
      )
    ).status,
    403,
    "Lista de outra sala negada",
  );
  equal(
    (await api("kids/custody", child(room2.sessionId), m)).status,
    403,
    "Entrada de outra sala negada",
  );
  const occupied = await Promise.all([
    api("kids/custody", child(config.sessionId), a),
    api("kids/custody", child(config.sessionId), m),
  ]);
  equal(
    occupied.map((r) => r.status).sort(),
    [200, 409],
    JSON.stringify(occupied),
  );
  const ci = occupied.find((r) => r.status === 200)!.data.checkIn;
  equal(
    (
      await org.collection("kidsOperationSessions").doc(config.sessionId).get()
    ).data()?.occupancy,
    1,
    "Uma vaga ocupada",
  );
  equal(
    (
      await api(
        "kids/operations",
        { action: "close", sessionId: config.sessionId, expectedVersion: 1 },
        a,
      )
    ).status,
    409,
    "Não encerra com criança",
  );
  equal(
    (
      await api(
        "kids/operations",
        { action: "lookup", proof: ci.pickupCode },
        m,
      )
    ).status,
    200,
    "Operador escalado identifica criança",
  );
  equal(
    await direct(`kidsCheckIns/${ci.id}`, m),
    403,
    "Papel Kids não baixa todos os dados direto",
  );
  equal(
    (
      await api(
        "kids/operations",
        { ...config, expectedVersion: 1, operatorIds: [admin] },
        a,
      )
    ).status,
    200,
    "Revogar operador",
  );
  equal(
    (await api("kids/qr", { checkInId: ci.id }, m)).status,
    403,
    "Mídia revogada junto da escala",
  );
  const release = {
    action: "check_out",
    requestId: randomUUID(),
    checkInId: ci.id,
    expectedGuardianVersion: 1,
    proof: ci.pickupCode,
    receiverId: "primary",
    identityConfirmed: true,
  };
  equal(
    (await api("kids/custody", release, m)).status,
    403,
    "Retirada por operador revogado negada",
  );
  equal(
    (await api("kids/custody", release, a)).status,
    200,
    "Admin encerra custódia",
  );
  equal(
    (
      await org.collection("kidsOperationSessions").doc(config.sessionId).get()
    ).data()?.occupancy,
    0,
    "Vaga liberada atomicamente",
  );
  equal(
    (await api("kids/custody", release, a)).status,
    200,
    "Retry retirada não decrementa outra vez",
  );
  equal(
    (
      await org.collection("kidsOperationSessions").doc(config.sessionId).get()
    ).data()?.occupancy,
    0,
    "Ocupação nunca negativa",
  );
  const expired = {
    ...config,
    expectedVersion: 2,
    operatorIds: [admin],
    startsAt: new Date(Date.now() - 7200000).toISOString(),
    endsAt: new Date(Date.now() - 3600000).toISOString(),
  };
  equal(
    (await api("kids/operations", expired, a)).status,
    200,
    "Ajustar janela",
  );
  equal(
    (await api("kids/custody", child(config.sessionId), a)).status,
    409,
    "Entrada fora do horário negada",
  );
  equal(
    (
      await api(
        "kids/operations",
        { action: "close", sessionId: config.sessionId, expectedVersion: 3 },
        a,
      )
    ).status,
    200,
    "Encerrar sala vazia",
  );
  equal(
    (await api("kids/operations", { ...config, expectedVersion: 4 }, a)).status,
    409,
    "Sem reabertura de sessão encerrada",
  );
  // Registered child binds an existing identity and cannot occupy two rooms.
  await org.collection("people").doc("existing_3").set({
    organizationId: orgId,
    firstName: "Nome cadastral",
    lastName: "QA",
    status: "active",
    personType: "child",
  });
  const identity = {
    ...child(room2.sessionId),
    childId: "existing_3",
    childName: "Nome adulterado",
  };
  const bound = await api("kids/custody", identity, a);
  equal(bound.status, 200, JSON.stringify(bound));
  equal(
    bound.data.checkIn.childName,
    "Nome cadastral QA",
    "Nome autoritativo cadastral",
  );
  equal(
    (await api("kids/custody", { ...identity, requestId: randomUUID() }, a))
      .status,
    409,
    "Segunda presença negada",
  );
  const alternate = {
    ...config,
    sessionId: randomUUID(),
    operatorIds: [admin],
  };
  equal(
    (await api("kids/operations", alternate, a)).status,
    200,
    "Nova sessão na sala já encerrada",
  );
  const doublePresence = await api(
    "kids/custody",
    { ...identity, sessionId: alternate.sessionId, requestId: randomUUID() },
    a,
  );
  equal(
    doublePresence.status,
    409,
    "Presença cadastral bloqueada também em outra sala com vagas",
  );
  equal(
    doublePresence.data.error.includes("entrada ativa"),
    true,
    "Bloqueio por identidade, independente da lotação",
  );
  equal(
    (await org.collection("people").get()).size,
    50,
    "Kids não cria pessoa nem amplia limite",
  );
  equal(
    (
      await api(
        "kids/custody",
        {
          ...release,
          requestId: randomUUID(),
          checkInId: bound.data.checkIn.id,
          proof: bound.data.checkIn.pickupCode,
        },
        a,
      )
    ).status,
    200,
    "Retirada cadastral",
  );
  equal(
    (await org.collection("kidsChildPresence").doc("existing_3").get()).exists,
    false,
    "Presença cadastral liberada",
  );
  // Privacy rules: sensitive records and unpublished shops are not tenant-wide.
  await org.collection("leaderEmotionalPulse").doc("private").set({
    organizationId: orgId,
    leaderId: admin,
    mood: "tired",
    energyLevel: 3,
    stressLevel: 5,
  });
  await org
    .collection("mentoringSessions")
    .doc("private")
    .set({ organizationId: orgId, leaderId: admin });
  await org
    .collection("emergencySOS")
    .doc("private")
    .set({ organizationId: orgId, leaderId: admin, status: "active" });
  for (const col of [
    "leaderEmotionalPulse",
    "mentoringSessions",
    "emergencySOS",
  ]) {
    equal(
      await direct(`${col}/private`, m),
      403,
      "Outro membro não lê cuidado pessoal",
    );
    equal(await direct(`${col}/private`, a), 200, "Equipe pastoral lê cuidado");
  }
  const pulseFields = {
    organizationId: { stringValue: orgId },
    leaderId: { stringValue: member },
    mood: { stringValue: "tired" },
    energyLevel: { integerValue: "3" },
    stressLevel: { integerValue: "5" },
  };
  equal(
    await direct("leaderEmotionalPulse/own", m, "PATCH", pulseFields),
    200,
    "Membro salva próprio pulso",
  );
  equal(await direct("leaderEmotionalPulse/own", m), 200, "Lê próprio pulso");
  equal(
    await direct("leaderEmotionalPulse/forged", m, "PATCH", {
      ...pulseFields,
      leaderId: { stringValue: admin },
    }),
    403,
    "Não forja pulso alheio",
  );
  equal(
    await direct("leaderEmotionalPulse/own", m, "PATCH", pulseFields),
    403,
    "Pulso imutável",
  );
  await org.collection("communityStores").doc("pending").set({
    organizationId: orgId,
    ownerId: admin,
    status: "pending",
    name: "Loja QA",
  });
  await org.collection("communityStores").doc("published").set({
    organizationId: orgId,
    ownerId: admin,
    status: "approved",
    name: "Loja pública QA",
  });
  equal(
    await direct("communityStores/pending", m),
    403,
    "Moderação pendente privada",
  );
  equal(
    await direct("communityStores/published", m),
    200,
    "Loja aprovada visível",
  );
  const storeFields = {
    organizationId: { stringValue: orgId },
    ownerId: { stringValue: member },
    status: { stringValue: "pending" },
    name: { stringValue: "Minha loja QA" },
  };
  equal(
    await direct("communityStores/own", m, "PATCH", storeFields),
    200,
    "Membro cria loja pendente",
  );
  equal(
    await direct("communityStores/own", m, "PATCH", {
      ...storeFields,
      status: { stringValue: "approved" },
    }),
    403,
    "Não autoaprova loja",
  );
  equal(
    await direct("communityStores/own", m),
    200,
    "Proprietário lê loja pendente",
  );
  equal(
    await direct("communityStores/pending", m, "PATCH", storeFields),
    403,
    "Não toma posse de outra loja",
  );
  await org
    .collection("communityStoreModerationLogs")
    .doc("private")
    .set({ organizationId: orgId, moderatedBy: admin });
  equal(
    await direct("communityStoreModerationLogs/private", m),
    403,
    "Auditoria de moderação privada",
  );
  equal(
    await direct("communityStoreModerationLogs/private", a, "DELETE"),
    403,
    "Auditoria de moderação imutável",
  );
  await org.update({ status: "inactive" });
  equal(
    (await api("public/visit", visit)).status,
    404,
    "Igreja inativa inclusive retry público",
  );
  equal(
    (await api("kids/operations", { action: "sessions" }, a)).status,
    403,
    "Igreja inativa Kids",
  );
  console.log(
    `Entrega 6 QA OK: ${checks} verificações; cadastros atômicos, limite global 50, público persistente, sessões/salas/equipe/capacidade, identidade e revogação.`,
  );
}
run()
  .finally(async () => {
    await db.recursiveDelete(org);
    await db.doc(`org_slugs/${slug}`).delete();
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
