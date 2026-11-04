/** Shared eligibility and formatting for all manual WhatsApp entry points. */
export interface WhatsappContact {
  whatsappPhone?: string;
  mobilePhone?: string;
  communicationOptOut?: boolean;
  whatsappOptOutAt?: string;
}
export function whatsappPhone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) digits = digits.slice(2);
  return /^[1-9]{2}9?\d{8}$/.test(digits) ? `55${digits}` : null;
}
export function whatsappHref(
  person: WhatsappContact | null | undefined,
  message: string,
): string | null {
  if (!person || person.communicationOptOut === true || person.whatsappOptOutAt)
    return null;
  const phone = whatsappPhone(person.whatsappPhone || person.mobilePhone);
  return phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    : null;
}

/** Leadership shortcut: always pass through the server's current contact preferences before opening WhatsApp. */
export function manualWhatsappLink(
  person: (WhatsappContact & { id?: string }) | null | undefined,
  message: string,
): string | null {
  if (!whatsappHref(person, message)) return null;
  const params = new URLSearchParams({
    compose: message,
    phone: whatsappPhone(person?.whatsappPhone || person?.mobilePhone)!,
  });
  if (person?.id) params.set("personId", person.id);
  return `/communication?${params.toString()}`;
}
