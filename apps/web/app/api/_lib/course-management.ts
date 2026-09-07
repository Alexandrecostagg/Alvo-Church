import { createHash } from "node:crypto";
import { AccountError, accountTransaction, type AccountTransaction } from "./member-account-store";
import { documentId } from "./member-account";

const COURSE_MANAGERS = ["super_admin", "church_admin", "pastor", "secretary"];
const VIDEO_HOSTS = [
  "youtube.com",
  "youtu.be",
  "youtube-nocookie.com",
  "vimeo.com",
  "cloudflarestream.com",
  "videodelivery.net",
];

type CourseOperation =
  | { action: "save_course"; organizationId: string; requestId: string; courseId: string; title: string; description: string; thumbnailUrl: string | null; instructorName: string; instructorTitle: string; isActive: boolean }
  | { action: "save_module"; organizationId: string; requestId: string; courseId: string; moduleId: string; title: string; sortOrder: number }
  | { action: "save_lesson"; organizationId: string; requestId: string; courseId: string; moduleId: string; lessonId: string; title: string; videoUrl: string; durationMinutes: number; sortOrder: number; materialUrl: string | null }
  | { action: "delete_module"; organizationId: string; requestId: string; courseId: string; moduleId: string }
  | { action: "delete_lesson"; organizationId: string; requestId: string; courseId: string; lessonId: string };

function text(value: unknown, label: string, max: number, required = true) {
  if (typeof value !== "string" || value.trim().length > max || (required && !value.trim())) {
    throw new AccountError(400, `${label} inválido.`);
  }
  return value.trim();
}

function integer(value: unknown, label: string, min: number, max: number) {
  if (!Number.isInteger(value) || Number(value) < min || Number(value) > max) {
    throw new AccountError(400, `${label} inválido.`);
  }
  return Number(value);
}

function optionalHttpsUrl(value: unknown, label: string, max = 1000) {
  const raw = text(value ?? "", label, max, false);
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:") throw new Error();
    return parsed.toString();
  } catch {
    throw new AccountError(400, `${label} deve usar uma URL HTTPS válida.`);
  }
}

export function isSupportedCourseVideoUrl(value: unknown) {
  const raw = typeof value === "string" ? value.trim() : "";
  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.toLowerCase();
    return parsed.protocol === "https:" && VIDEO_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
  } catch {
    return false;
  }
}

function common(raw: unknown): CourseOperation {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new AccountError(400, "Operação de curso inválida.");
  const data = raw as Record<string, unknown>;
  const action = text(data.action, "Operação", 32);
  if (!["save_course", "save_module", "save_lesson", "delete_module", "delete_lesson"].includes(action)) {
    throw new AccountError(400, "Operação de curso inválida.");
  }
  const base = {
    organizationId: documentId(data.organizationId, "Igreja"),
    requestId: documentId(data.requestId, "Tentativa"),
    courseId: documentId(data.courseId, "Curso"),
  };
  if (action === "save_course") {
    if (typeof data.isActive !== "boolean") throw new AccountError(400, "Estado de publicação inválido.");
    return {
      ...base,
      action: "save_course",
      title: text(data.title, "Título", 160),
      description: text(data.description ?? "", "Descrição", 4000, false),
      thumbnailUrl: optionalHttpsUrl(data.thumbnailUrl, "Imagem"),
      instructorName: text(data.instructorName ?? "", "Ministrante", 160, false),
      instructorTitle: text(data.instructorTitle ?? "", "Título do ministrante", 120, false),
      isActive: data.isActive,
    };
  }
  const moduleId = documentId(data.moduleId, "Módulo");
  if (action === "save_module") {
    return { ...base, action: "save_module", moduleId, title: text(data.title, "Título", 160), sortOrder: integer(data.sortOrder, "Ordem", 0, 9999) };
  }
  if (action === "delete_module") return { ...base, action: "delete_module", moduleId };
  const lessonId = documentId(data.lessonId, "Aula");
  if (action === "delete_lesson") return { ...base, action: "delete_lesson", lessonId };
  const videoUrl = text(data.videoUrl, "Vídeo", 1000);
  if (!isSupportedCourseVideoUrl(videoUrl)) throw new AccountError(400, "Use vídeo HTTPS do YouTube, Vimeo ou Cloudflare.");
  return {
    ...base,
    action: "save_lesson",
    moduleId,
    lessonId,
    title: text(data.title, "Título", 160),
    videoUrl,
    durationMinutes: integer(data.durationMinutes, "Duração", 0, 1440),
    sortOrder: integer(data.sortOrder, "Ordem", 0, 9999),
    materialUrl: optionalHttpsUrl(data.materialUrl, "Material"),
  };
}

async function authorize(tx: AccountTransaction, orgId: string, uid: string) {
  documentId(uid, "Conta");
  const root = `organizations/${orgId}`;
  const [org, actor] = await tx.read(root, `${root}/users/${uid}`);
  const roles = Array.isArray(actor?.roles) ? actor.roles : [];
  if (!org || org.status !== "active" || !actor || actor.organizationId !== orgId || actor.isActive !== true || !roles.some((role: string) => COURSE_MANAGERS.includes(role))) {
    throw new AccountError(403, "Você não pode gerenciar cursos nesta igreja.");
  }
  return root;
}

function fingerprint(input: Record<string, unknown>) {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

export async function manageCourse(raw: unknown, uid: string) {
  const input = common(raw);
  const digest = fingerprint(input);
  return accountTransaction(async (tx) => {
    const root = await authorize(tx, input.organizationId, uid);
    const attemptPath = `${root}/courseManagementAttempts/${uid}_${input.requestId}`;
    const [attempt] = await tx.read(attemptPath);
    if (attempt) {
      if (attempt.fingerprint !== digest) throw new AccountError(409, "Esta tentativa já foi usada em outra alteração.");
      return { ...attempt.result, replayed: true };
    }

    const coursePath = `${root}/courses/${input.courseId}`;
    const now = new Date().toISOString();
    let result: Record<string, unknown>;

    if (input.action === "save_course") {
      const [existing] = await tx.read(coursePath);
      if (existing && existing.organizationId !== input.organizationId) throw new AccountError(404, "Curso não encontrado.");
      if (input.isActive) {
        const [modules, lessons] = await Promise.all([
          tx.query(coursePath, "modules", undefined, undefined, "EQUAL", 2),
          tx.query(coursePath, "lessons", undefined, undefined, "EQUAL", 2),
        ]);
        if (!modules.length || !lessons.length) throw new AccountError(409, "Adicione ao menos um módulo e uma aula antes de publicar.");
      }
      const course = {
        id: input.courseId,
        organizationId: input.organizationId,
        title: input.title,
        description: input.description,
        ...(input.thumbnailUrl ? { thumbnailUrl: input.thumbnailUrl } : {}),
        ...(input.instructorName ? { instructorName: input.instructorName } : {}),
        ...(input.instructorTitle ? { instructorTitle: input.instructorTitle } : {}),
        ...(typeof existing?.badgeUnlockedId === "string" ? { badgeUnlockedId: existing.badgeUnlockedId } : {}),
        isActive: input.isActive,
        createdAt: typeof existing?.createdAt === "string" ? existing.createdAt : now,
        updatedAt: now,
      };
      tx.set(coursePath, course);
      result = { course };
    } else {
      const [course] = await tx.read(coursePath);
      if (!course || course.organizationId !== input.organizationId) throw new AccountError(404, "Curso não encontrado.");
      if (course.isActive === true) throw new AccountError(409, "Retire o curso da Escola antes de alterar módulos ou aulas.");

      if (input.action === "save_module") {
        const module = { id: input.moduleId, organizationId: input.organizationId, courseId: input.courseId, title: input.title, sortOrder: input.sortOrder };
        tx.set(`${coursePath}/modules/${input.moduleId}`, module);
        result = { module };
      } else if (input.action === "save_lesson") {
        const [module] = await tx.read(`${coursePath}/modules/${input.moduleId}`);
        if (!module || module.organizationId !== input.organizationId || module.courseId !== input.courseId) throw new AccountError(404, "Módulo não encontrado.");
        const lesson = {
          id: input.lessonId,
          organizationId: input.organizationId,
          courseId: input.courseId,
          moduleId: input.moduleId,
          title: input.title,
          videoUrl: input.videoUrl,
          durationMinutes: input.durationMinutes,
          sortOrder: input.sortOrder,
          ...(input.materialUrl ? { materialUrl: input.materialUrl } : {}),
        };
        tx.set(`${coursePath}/lessons/${input.lessonId}`, lesson);
        result = { lesson };
      } else if (input.action === "delete_lesson") {
        const [lesson] = await tx.read(`${coursePath}/lessons/${input.lessonId}`);
        if (!lesson || lesson.organizationId !== input.organizationId || lesson.courseId !== input.courseId) throw new AccountError(404, "Aula não encontrada.");
        tx.remove(`${coursePath}/lessons/${input.lessonId}`);
        result = { deletedLessonId: input.lessonId };
      } else {
        const modulePath = `${coursePath}/modules/${input.moduleId}`;
        const [module, lessons] = await Promise.all([
          tx.read(modulePath).then(([value]) => value),
          tx.query(coursePath, "lessons", "moduleId", input.moduleId, "EQUAL", 401),
        ]);
        if (!module || module.organizationId !== input.organizationId || module.courseId !== input.courseId) throw new AccountError(404, "Módulo não encontrado.");
        if (lessons.length > 400) throw new AccountError(409, "Módulo grande demais para exclusão segura. Procure o suporte.");
        lessons.forEach((lesson) => tx.remove(`${coursePath}/lessons/${documentId(lesson.id, "Aula")}`));
        tx.remove(modulePath);
        result = { deletedModuleId: input.moduleId, deletedLessonCount: lessons.length };
      }
    }

    tx.set(`${root}/courseManagementAudit/${crypto.randomUUID()}`, {
      organizationId: input.organizationId,
      actorId: uid,
      action: input.action,
      courseId: input.courseId,
      moduleId: "moduleId" in input ? input.moduleId : null,
      lessonId: "lessonId" in input ? input.lessonId : null,
      at: now,
    });
    tx.set(attemptPath, { organizationId: input.organizationId, fingerprint: digest, result, createdAt: now });
    return { ...result, replayed: false };
  });
}
