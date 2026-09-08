import { AccountError, accountTransaction } from "./member-account-store";
import { publicEventProjection } from "./event-management";
import { assertModuleEnabled } from "./module-access";

export function publicPortalSlug(value: unknown) {
  if (typeof value !== "string") throw new AccountError(404, "Igreja não encontrada.");
  const slug = value.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{1,118}$/.test(slug)) throw new AccountError(404, "Igreja não encontrada.");
  return slug;
}

function publicTimeZone(value: unknown) {
  if (typeof value !== "string" || value.length > 80) return "America/Sao_Paulo";
  try {
    new Intl.DateTimeFormat("pt-BR", { timeZone: value }).format();
    return value;
  } catch {
    return "America/Sao_Paulo";
  }
}

export async function publicPortalSnapshot(rawSlug: unknown, now = Date.now()) {
  const slug = publicPortalSlug(rawSlug);
  return accountTransaction(async (tx) => {
    const [slugDocument] = await tx.read(`org_slugs/${slug}`);
    const organizationId = typeof slugDocument?.organizationId === "string" ? slugDocument.organizationId : null;
    if (!organizationId || !/^[A-Za-z0-9_-]{1,128}$/.test(organizationId)) throw new AccountError(404, "Igreja não encontrada.");
    const root = `organizations/${organizationId}`;
    await assertModuleEnabled(tx, root, "publicForms");
    const [organization, events] = await Promise.all([
      tx.read(root).then(([value]) => value),
      tx.query(root, "events", "status", "published", "EQUAL", 100),
    ]);
    if (!organization || organization.status !== "active") throw new AccountError(404, "Igreja indisponível.");
    const projectedEvents = events
      .map((event) => publicEventProjection(event))
      .filter((event): event is NonNullable<ReturnType<typeof publicEventProjection>> => Boolean(event))
      .filter((event) => new Date(event.startsAt).getTime() >= now - 6 * 60 * 60 * 1000)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
      .slice(0, 20);
    const displayName = [organization.displayName, organization.name, slugDocument?.displayName]
      .find((value) => typeof value === "string" && value.trim()) as string | undefined;
    return {
      slug,
      displayName: displayName?.trim().slice(0, 160) || slug.replace(/-/g, " "),
      timeZone: publicTimeZone(organization.timezone),
      events: projectedEvents,
    };
  });
}
