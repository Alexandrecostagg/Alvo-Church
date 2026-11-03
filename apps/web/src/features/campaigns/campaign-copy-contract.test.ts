import { describe, it, expect } from "vitest";
import {
  parseCampaignCopy,
  campaignCopyMessages,
  type CampaignCopyInput,
} from "./campaign-copy-contract";
const input: CampaignCopyInput = {
  objective: "Acolher convidados sem pressão",
  tone: "acolhedor",
  offsets: [5, 3, 1],
};
const valid = () =>
  input.offsets.map((daysBefore, i) => ({
    daysBefore,
    body: [
      "Venha para {{evento}}, em {{data}}, às {{horario}}.",
      "Precisa de orientação para chegar a {{local}}?",
      "Amanhã é {{evento}}. Quer conversar com a equipe?",
    ][i],
    confirmedBody: [
      "Esperamos você em {{data}}.",
      "Converse com quem convidou você para combinar sua chegada.",
      "Amanhã será nosso encontro. Se os planos mudarem, avise a equipe.",
    ][i],
    focus: ["Convite pessoal", "Orientação", "Lembrete final"][i],
  }));
describe("AI campaign writing contract", () => {
  it("requests a sequence with placeholders, without guest data or invented prayer claims", () => {
    const m = campaignCopyMessages(input);
    expect(m[0].content).toContain("Não afirme");
    expect(m[0].content).toContain("{{membro}}");
    expect(JSON.parse(m[1].content)).toMatchObject(input);
    expect(JSON.parse(m[1].content).outline).toHaveLength(3);
  });
  it("keeps exact schedule, personal fields and two response variants; never approves Meta templates", () => {
    const steps = parseCampaignCopy(JSON.stringify({ steps: valid() }), input);
    expect(steps.map((s) => s.daysBefore)).toEqual(input.offsets);
    expect(
      steps.every(
        (s) => s.templateName === "" && s.confirmedTemplateName === "",
      ),
    ).toBe(true);
  });
  it.each([
    "count",
    "offset",
    "duplicate",
    "unknown",
    "prayer",
    "tomorrow",
    "phone",
    "too-long",
  ])(
    "rejects %s and preserves the old draft by returning no valid replacement",
    (kind) => {
      const steps = valid();
      switch (kind) {
        case "count":
          steps.pop();
          break;
        case "offset":
          steps[1].daysBefore = 4;
          break;
        case "duplicate":
          steps[1].body = steps[0].body;
          break;
        case "unknown":
          steps[1].body += " {{telefone}}";
          break;
        case "prayer":
          steps[1].body += " Estamos orando por você.";
          break;
        case "tomorrow":
          steps[1].body += " Amanhã é o encontro.";
          break;
        case "phone":
          steps[1].body += " 5562999999999";
          break;
        case "too-long":
          steps[1].body += "x".repeat(700);
          break;
      }
      expect(() =>
        parseCampaignCopy(JSON.stringify({ steps }), input),
      ).toThrow();
    },
  );
});

it("always adds individualization, first inviter and opt-out even when the provider omits them", () => {
  const rows = valid().map((s, i) => ({
    ...s,
    body: [
      "Veja os detalhes de {{evento}}.",
      "Tire dúvidas com a equipe.",
      "Amanhã estaremos de portas abertas.",
    ][i],
    confirmedBody: [
      "Sua confirmação está anotada.",
      "Se precisar de orientação, fale conosco.",
      "Guarde seu convite para a recepção.",
    ][i],
  }));
  const out = parseCampaignCopy(JSON.stringify({ steps: rows }), input);
  for (const s of out) {
    expect(s.body).toContain("{{convidado}}");
    expect(s.body).toContain("{{igreja}}");
    expect(s.body).toContain("SAIR");
  }
  expect(out[0].body).toContain("{{membro}}");
});

it("removes duplicate greetings and rejects a fictional QR confirmation flow", () => {
  const rows = valid();
  rows[0].body = "Olá {{convidado}}, venha para {{evento}}.";
  expect(
    parseCampaignCopy(JSON.stringify({ steps: rows }), input)[0].body.match(
      /Olá/g,
    ),
  ).toHaveLength(1);
  rows[1].body = "Escaneie o QR para confirmar presença.";
  expect(() =>
    parseCampaignCopy(JSON.stringify({ steps: rows }), input),
  ).toThrow();
});

it("keeps the first delivered message valid for a late signup", () => {
  const rows = valid();
  for (const copy of [
    "Amanhã é o encontro.",
    "Faltam 5 dias para o encontro.",
    "O encontro é hoje.",
  ]) {
    rows[0].body = copy;
    expect(() =>
      parseCampaignCopy(JSON.stringify({ steps: rows }), input),
    ).toThrow("A primeira mensagem precisa usar a data do evento.");
  }
  rows[0].body = "Venha para {{evento}}, em {{data}}, às {{horario}}.";
  expect(
    parseCampaignCopy(JSON.stringify({ steps: rows }), input),
  ).toHaveLength(3);
});

it("removes redundant personal greetings and repeated confirmation introductions", () => {
  const rows = valid();
  rows[1].confirmedBody =
    "{{convidado}}, sua presença está confirmada! Converse com a equipe sobre a chegada.";
  const steps = parseCampaignCopy(JSON.stringify({ steps: rows }), input);
  expect(steps[1].confirmedBody).not.toContain("presença está confirmada");
  expect(steps[1].confirmedBody.match(/\{\{convidado\}\}/g)).toHaveLength(1);
  expect(steps[1].confirmedBody).toContain(
    "Guarde o QR do seu convite para mostrar à equipe na recepção.",
  );
});
