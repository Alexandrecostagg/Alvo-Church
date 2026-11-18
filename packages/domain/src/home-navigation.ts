import type { HomeProfile } from "./home-profiles";

export type HomeDestination =
  | { kind: "native"; key: string; href: string }
  | { kind: "web"; href: string }
  | { kind: "section"; section: "care" };

/** Navigation only. Every destination still enforces its own server authorization. */
export function homeDestination(
  href: string | undefined,
  profile: HomeProfile,
): HomeDestination | null {
  if (href === "#acompanhamento") return { kind: "section", section: "care" };
  if (!href) return null;
  const personal = profile === "member" || profile === "cell_leader";
  const native: Record<string, string> = {
    "/my-groups": "groups",
    "/my-invites": "invites",
    "/events": "events",
    "/learning/academy": "learning",
    "/me": "profile",
    ...(personal ? { "/serving": "serving", "/giving": "giving" } : {}),
    ...(profile === "member" ? { "/my-tribe": "tribes" } : {}),
  };
  if (Object.hasOwn(native, href))
    return { kind: "native", key: native[href], href };
  const web = [
    "/network",
    "/members",
    "/reception",
    "/groups",
    "/campaigns",
    "/finance",
    "/giving",
    "/communication",
    "/marketplace-community",
    "/marketplace-community/admin/moderation",
    "/operations",
    "/serving",
    "/tribes",
    "/tribes?scope=cell_leader",
    "/my-tribe",
    "/journeys",
    "/pastoral-ai",
    "/pastoral-ai?profile=pastoral",
    "/pastoral-ai?profile=administration",
    "/pastoral-ai?profile=cell_leader",
    "/pastoral-ai?profile=network",
  ];
  return web.includes(href) ? { kind: "web", href } : null;
}
