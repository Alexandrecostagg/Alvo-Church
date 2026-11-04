import { campaignDay, campaignLocalDate } from "./invitation-calendar";

export function manualCampaignSlot(campaign: any, now: number) {
  const date = campaignLocalDate(now, campaign.timezone);
  const eventDate = campaignLocalDate(
    campaign.event.startsAt,
    campaign.timezone,
  );
  const index = campaign.steps.findIndex(
    (s: any) => campaignDay(eventDate, -s.daysBefore) === date,
  );
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: campaign.timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
  return { date, index, ready: index >= 0 && time >= campaign.hour };
}

// Manual contact uses signup authorization, not an API proof or delivery receipt.
export function manualCampaignEligible(guest: any, contact?: any) {
  return (
    guest?.consent === true &&
    !guest.optOut &&
    !guest.handoff &&
    !["declined", "attended"].includes(guest.status) &&
    !contact?.optOut &&
    !contact?.handoff
  );
}

export function manualWhatsappLink(phone: string, text: string) {
  if (!/^\d{10,15}$/.test(phone) || !text.trim())
    throw Error("Telefone ou mensagem inválidos.");
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}
