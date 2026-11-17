import { whatsappPhone } from "./whatsapp";
export const COMMUNITY_CATEGORIES = {
  health: "Saúde e bem-estar",
  food: "Alimentação",
  education: "Educação",
  services: "Serviços",
  community: "Comunidade",
} as const;
export const COMMUNITY_STATUS = {
  pending: "Aguardando análise",
  approved: "Publicada",
  rejected: "Ajustes solicitados",
  suspended: "Suspensa",
} as const;
export function safeCommunityUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return "";
  try {
    const u = new URL(value.trim());
    return ["http:", "https:"].includes(u.protocol) &&
      !u.username &&
      !u.password
      ? u.href
      : "";
  } catch {
    return "";
  }
}
export function communityWhatsapp(store: any, title?: string, desktop = false) {
  const phone = whatsappPhone(store?.socialLinks?.whatsapp);
  if (!phone) return "";
  const text = `Olá! Encontrei ${store.name} no Marketplace da Comunidade.${title ? " Gostaria de saber mais sobre: " + title + "." : " Gostaria de conhecer seus produtos ou serviços."}`;
  return desktop
    ? `https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`
    : `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}
export function communityMaps(store: any) {
  const a = store?.contact?.address;
  const parts = [
    a?.street,
    a?.number,
    a?.district,
    a?.city,
    a?.state,
    a?.postalCode,
  ].filter((v) => typeof v === "string" && v.trim());
  return parts.length
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts.join(", "))}`
    : "";
}
export function communityPromotionActive(
  p: any,
  today: string,
  now = Date.now(),
) {
  if (p.status !== "active") return false;
  if (!p.validUntil) return true;
  return /^\d{4}-\d{2}-\d{2}$/.test(p.validUntil)
    ? Number.isFinite(Date.parse(p.validUntil)) &&
        new Date(p.validUntil).toISOString().slice(0, 10) === p.validUntil &&
        p.validUntil >= today
    : Number.isFinite(Date.parse(p.validUntil)) &&
        Date.parse(p.validUntil) >= now;
}
