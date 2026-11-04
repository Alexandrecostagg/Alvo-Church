export const CAMPAIGN_FIELDS = [
  "convidado",
  "membro",
  "igreja",
  "evento",
  "data",
  "horario",
  "local",
] as const;
export type CampaignField = (typeof CAMPAIGN_FIELDS)[number];
export interface InvitationStep {
  daysBefore: number;
  focus?: string;
  body: string;
  confirmedBody: string;
  templateName: string;
  confirmedTemplateName: string;
}
export function campaignTemplate(body: string) {
  const fields: CampaignField[] = [];
  const template = body.replace(/\{\{([^}]+)\}\}/g, (_, name: string) => {
    if (!CAMPAIGN_FIELDS.includes(name as CampaignField))
      throw Error(`Campo desconhecido: ${name}.`);
    if (!fields.includes(name as CampaignField))
      fields.push(name as CampaignField);
    return `{{${fields.indexOf(name as CampaignField) + 1}}}`;
  });
  if (/[{}]/.test(template.replace(/\{\{\d+\}\}/g, "")))
    throw Error("Confira os campos entre chaves.");
  return { template, fields };
}
export function campaignPersonalize(
  body: string,
  values: Record<CampaignField, string>,
) {
  const { fields } = campaignTemplate(body);
  return {
    text: body.replace(
      /\{\{([^}]+)\}\}/g,
      (_, name: CampaignField) => values[name],
    ),
    parameters: fields.map((f) => values[f]),
  };
}
export function defaultInvitationSteps(
  days = 15,
  offsets?: number[],
): InvitationStep[] {
  if (!Number.isInteger(days) || days < 1 || days > 15)
    throw Error("Escolha de 1 a 15 dias.");
  if (
    offsets &&
    (offsets.length !== days ||
      offsets.some(
        (n, i) =>
          !Number.isInteger(n) ||
          n < 1 ||
          n > 90 ||
          (i > 0 && n >= offsets[i - 1]),
      ))
  )
    throw Error("Confira as datas da sequência.");
  const notes = [
    "Seu convite é para {{evento}}, em {{data}}, às {{horario}}, em {{local}}.",
    "Se for sua primeira visita, você pode responder e tirar suas dúvidas com a equipe.",
    "Reserve esta data: {{data}}. Nosso encontro será às {{horario}}.",
    "Você pode perguntar sobre a chegada e a recepção respondendo a esta mensagem.",
    "Se quiser conversar antes do encontro, responda e nossa equipe poderá acompanhar seu pedido.",
    "Nosso encontro será em {{local}}. Precisa de orientação para chegar? Fale com a equipe.",
    "{{evento}} acontece em {{data}}. Você pode confirmar presença pelo seu convite ou responder CONFIRMAR CONVITE.",
    "Para combinar sua chegada com quem convidou você, converse diretamente com essa pessoa.",
    "Se seus planos mudaram, responda RECUSAR CONVITE. A equipe poderá organizar melhor a acolhida.",
    "Guarde o QR do seu convite para mostrar à recepção. Você não precisa instalar aplicativo.",
    "Gostaria de conversar com alguém da equipe? Responda FALAR COM A EQUIPE; os lembretes ficarão pausados.",
    "Confira o endereço do encontro: {{local}}. O horário é {{horario}}, em {{data}}.",
    "Sua resposta ajuda nossa equipe a receber você. Confirme pelo convite ou responda CONFIRMAR CONVITE.",
    "Já separou seu convite? Mostre o QR à recepção quando chegar para {{evento}}.",
    "Amanhã é {{evento}}, às {{horario}}, em {{local}}. Se precisar de orientação, responda à equipe.",
  ];
  return Array.from({ length: days }, (_, i) => ({
    daysBefore: offsets?.[i] ?? days - i,
    templateName: "",
    confirmedTemplateName: "",
    body: `Olá, {{convidado}}! Aqui é da {{igreja}}. ${i === 0 ? "Você recebeu um convite de {{membro}} para {{evento}}, em {{data}}, às {{horario}}, em {{local}}. Será um prazer receber você. Confirme pelo seu convite ou responda CONFIRMAR CONVITE." : notes[15 - days + i]} Envie SAIR para parar as mensagens.`,
    confirmedBody: `Olá, {{convidado}}! Aqui é da {{igreja}}. ${i === 0 ? "Recebemos sua confirmação para {{evento}}. Seu convite veio de {{membro}}. Esperamos você em {{data}}, às {{horario}}, em {{local}}." : "Sua presença em {{evento}} está confirmada. " + notes[15 - days + i].replace("Você pode confirmar presença pelo seu convite ou responder CONFIRMAR CONVITE.", "Se precisar, fale com a equipe.").replace("Confirme pelo convite ou responda CONFIRMAR CONVITE.", "Se precisar alterar sua resposta, use seu convite.")} Envie SAIR para parar as mensagens.`,
  })).map((s) => ({
    ...s,
    body:
      s.daysBefore !== 1
        ? s.body.replace("Amanhã é", `Faltam ${s.daysBefore} dias para`)
        : s.body,
    confirmedBody:
      s.daysBefore !== 1
        ? s.confirmedBody.replace(
            "Amanhã é",
            `Faltam ${s.daysBefore} dias para`,
          )
        : s.confirmedBody,
  }));
}
export function campaignEligible(guest: Record<string, any>) {
  return (
    guest.consent === true &&
    !!guest.verifiedAt &&
    !guest.optOut &&
    !guest.handoff &&
    !["declined", "attended"].includes(guest.status)
  );
}
export function invitationGuestLabel(guest: Record<string, any>) {
  return guest.allowInviterView
    ? {
        id: guest.id,
        name: String(guest.name).split(" ")[0],
        status: guest.status,
      }
    : {
        id: guest.id,
        name: "Convidado com cadastro reservado",
        status: "reserved",
      };
}
