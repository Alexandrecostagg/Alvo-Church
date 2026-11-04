import { createHash } from "node:crypto";
import { AccountError, accountTransaction, type AccountTransaction } from "./member-account-store";
import { documentId } from "./member-account";
import { assertModuleEnabled } from "./module-access";

function learningInput(raw: unknown, toggle: boolean) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new AccountError(400, "Progresso inválido.");
  const data = raw as Record<string, unknown>;
  const catalog: "platform" | "organization" = data.catalog === "platform" ? "platform" : "organization";
  return {
    organizationId: documentId(data.organizationId, "Igreja"),
    courseId: documentId(data.courseId, "Curso"),
    lessonId: toggle ? documentId(data.lessonId, "Aula") : null,
    requestId: toggle ? documentId(data.requestId, "Tentativa") : null,
    catalog,
  };
}

async function courseAccess(tx: AccountTransaction, root: string, orgId: string, courseId: string, catalog: "organization" | "platform") {
  const coursePath = catalog === "platform" ? `platformPrograms/${courseId}` : `${root}/courses/${courseId}`;
  const [course, entitlement] = await tx.read(coursePath, `${root}/programEntitlements/${courseId}`);
  const available = catalog === "platform"
    ? course && (course.isPublished === true || entitlement?.status === "active") && entitlement?.status === "active"
    : course && course.organizationId === orgId && course.isActive === true;
  if (!available) throw new AccountError(404, "Curso indisponível.");
  return { coursePath, course: course as Record<string, any> };
}

async function linkedPerson(tx: AccountTransaction, orgId: string, uid: string) {
  documentId(uid, "Conta");
  const root = `organizations/${orgId}`;
  await assertModuleEnabled(tx, root, "journeys");
  const [org, actor, link] = await tx.read(root, `${root}/users/${uid}`, `${root}/memberAccountLinks/${uid}`);
  if (!org || org.status !== "active" || !actor || actor.organizationId !== orgId || actor.isActive !== true) {
    throw new AccountError(403, "Você não tem acesso à Escola desta igreja.");
  }
  if (!link || link.organizationId !== orgId || link.userId !== uid || !link.verifiedBy || actor.personId !== link.personId) {
    return { root, personId: null };
  }
  const personId = documentId(link.personId, "Pessoa");
  const [person, claim] = await tx.read(`${root}/people/${personId}`, `${root}/memberAccountClaims/${personId}`);
  if (!person || person.organizationId !== orgId || person.status !== "active" || !claim || claim.organizationId !== orgId || claim.userId !== uid || claim.personId !== personId) {
    return { root, personId: null };
  }
  return { root, personId };
}

function emptyProgress(orgId: string, personId: string, courseId: string) {
  return {
    id: courseId,
    organizationId: orgId,
    memberId: personId,
    courseId,
    completedLessons: [] as string[],
    isCompleted: false,
    completedAt: null as string | null,
    updatedAt: new Date().toISOString(),
  };
}

function safeProgress(raw: Record<string, any> | null, orgId: string, personId: string, courseId: string) {
  const base = emptyProgress(orgId, personId, courseId);
  if (!raw || raw.organizationId !== orgId || raw.memberId !== personId || raw.courseId !== courseId) return base;
  return {
    ...base,
    completedLessons: Array.isArray(raw.completedLessons) ? raw.completedLessons.filter((id): id is string => typeof id === "string") : [],
    isCompleted: raw.isCompleted === true,
    completedAt: typeof raw.completedAt === "string" ? raw.completedAt : null,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : base.updatedAt,
  };
}

export async function readLearningProgress(raw: unknown, uid: string) {
  const input = learningInput(raw, false);
  return accountTransaction(async (tx) => {
    const identity = await linkedPerson(tx, input.organizationId, uid);
    if (!identity.personId) return { status: "unlinked" as const };
    await courseAccess(tx, identity.root, input.organizationId, input.courseId, input.catalog);
    const [progress] = await tx.read(`${identity.root}/people/${identity.personId}/courseProgress/${input.courseId}`);
    return { status: "active" as const, personId: identity.personId, progress: safeProgress(progress, input.organizationId, identity.personId, input.courseId) };
  });
}

export async function toggleLearningLesson(raw: unknown, uid: string) {
  const input = learningInput(raw, true);
  return accountTransaction(async (tx) => {
    const identity = await linkedPerson(tx, input.organizationId, uid);
    if (!identity.personId) throw new AccountError(409, "Vincule esta conta a um cadastro de pessoa antes de registrar o progresso.");
    const { coursePath, course } = await courseAccess(tx, identity.root, input.organizationId, input.courseId, input.catalog);
    const progressPath = `${identity.root}/people/${identity.personId}/courseProgress/${input.courseId}`;
    const attemptPath = `${identity.root}/learningAttempts/${uid}_${input.requestId}`;
    const [lesson, current, attempt] = await tx.read(
      `${coursePath}/lessons/${input.lessonId}`,
      progressPath,
      attemptPath,
    );
    if (!lesson || (input.catalog === "platform" ? lesson.programId !== input.courseId : lesson.courseId !== input.courseId || lesson.organizationId !== input.organizationId)) throw new AccountError(404, "Aula não pertence a este curso.");
    const fingerprint = createHash("sha256").update(`${input.catalog}:${input.courseId}:${input.lessonId}`).digest("hex");
    if (attempt) {
      if (attempt.fingerprint !== fingerprint) throw new AccountError(409, "Esta tentativa já foi usada em outra aula.");
      return { status: "active" as const, personId: identity.personId, progress: attempt.progress, replayed: true };
    }
    const lessons = await tx.query(coursePath, "lessons", undefined, undefined, "EQUAL", 500);
    const validLessonIds = lessons
      .filter((item) => input.catalog === "platform" ? item.programId === input.courseId : item.courseId === input.courseId && item.organizationId === input.organizationId)
      .map((item) => String(item.id));
    if (!validLessonIds.includes(input.lessonId!)) throw new AccountError(404, "Aula não pertence a este curso.");
    const previous = safeProgress(current, input.organizationId, identity.personId, input.courseId);
    const completed = new Set(previous.completedLessons.filter((id) => validLessonIds.includes(id)));
    if (completed.has(input.lessonId!)) completed.delete(input.lessonId!);
    else completed.add(input.lessonId!);
    const now = new Date().toISOString();
    const isCompleted = validLessonIds.length > 0 && validLessonIds.every((id) => completed.has(id));
    const progress = {
      ...previous,
      completedLessons: [...completed],
      isCompleted,
      completedAt: isCompleted ? previous.completedAt || now : null,
      updatedAt: now,
    };
    tx.set(progressPath, progress);
    if (isCompleted && typeof course.badgeUnlockedId === "string") {
      const badgeId = documentId(course.badgeUnlockedId, "Badge");
      const [badge] = await tx.read(`${identity.root}/badges/${badgeId}`);
      if (badge && badge.organizationId === input.organizationId) {
        tx.set(`${identity.root}/people/${identity.personId}/badges/ead_${input.courseId}_${badgeId}`, {
          id: `ead_${input.courseId}_${badgeId}`,
          organizationId: input.organizationId,
          personId: identity.personId,
          badgeId,
          awardedAt: previous.completedAt || now,
          source: "course_completion",
          courseId: input.courseId,
        });
      }
    }
    tx.set(attemptPath, { organizationId: input.organizationId, userId: uid, fingerprint, progress, createdAt: now });
    tx.set(`${identity.root}/learningAudit/${crypto.randomUUID()}`, {
      organizationId: input.organizationId,
      actorId: uid,
      personId: identity.personId,
      courseId: input.courseId,
      catalog: input.catalog,
      lessonId: input.lessonId,
      action: completed.has(input.lessonId!) ? "lesson_completed" : "lesson_reopened",
      courseCompleted: isCompleted,
      at: now,
    });
    return { status: "active" as const, personId: identity.personId, progress, replayed: false };
  });
}
