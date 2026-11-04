import { describe, it, expect } from "vitest";
import {
  campaignEligible,
  campaignPersonalize,
  campaignTemplate,
  defaultInvitationSteps,
  invitationGuestLabel,
} from "./invitation-campaign";
describe("invitation campaign contracts", () => {
  it("maps repeated named fields to stable approved-template positions", () => {
    expect(
      campaignTemplate(
        "Oi {{convidado}}, {{membro}} convidou {{convidado}} para {{evento}}.",
      ),
    ).toEqual({
      template: "Oi {{1}}, {{2}} convidou {{1}} para {{3}}.",
      fields: ["convidado", "membro", "evento"],
    });
  });
  it.each(["{{telefone}}", "{{ convidado }}", "{convidado}", "{{convidado}"])(
    "rejects unsupported or malformed variables %s",
    (body) => expect(() => campaignTemplate(body)).toThrow(),
  );
  it("personalizes without interpreting guest-supplied template expressions", () => {
    const d = campaignPersonalize("Oi {{convidado}}!", {
      convidado: "{{membro}}",
      membro: "João",
      igreja: "Igreja",
      evento: "Culto",
      data: "1/1",
      horario: "19h",
      local: "Templo",
    });
    expect(d).toEqual({ text: "Oi {{membro}}!", parameters: ["{{membro}}"] });
  });
  it.each([1, 3, 15])(
    "offers %s coherent daily steps, first identifying inviter in both variants",
    (days) => {
      const s = defaultInvitationSteps(days);
      expect(s.map((x) => x.daysBefore)).toEqual(
        Array.from({ length: days }, (_, i) => days - i),
      );
      for (const x of s)
        for (const b of [x.body, x.confirmedBody]) {
          expect(b).toContain("{{igreja}}");
          expect(b).toContain("SAIR");
          expect(b.length).toBeLessThanOrEqual(900);
          expect(() => campaignTemplate(b)).not.toThrow();
        }
      expect(s[0].body).toContain("{{membro}}");
      expect(s[0].confirmedBody).toContain("{{membro}}");
      if (days > 1) expect(s.at(-1)?.body).toContain("Amanhã");
    },
  );
  it("requires explicit consent and guest-owned phone proof and respects all stops", () => {
    const g = { consent: true, verifiedAt: "now", status: "confirmed" };
    expect(campaignEligible(g)).toBe(true);
    for (const patch of [
      { consent: false },
      { verifiedAt: null },
      { optOut: true },
      { handoff: true },
      { status: "declined" },
      { status: "attended" },
    ])
      expect(campaignEligible({ ...g, ...patch })).toBe(false);
  });
  it("never discloses contact data or private status to inviting members", () => {
    const g = {
      id: "1",
      name: "Ana Fictícia",
      phone: "55000000000",
      status: "declined",
      allowInviterView: false,
    };
    expect(invitationGuestLabel(g)).toEqual({
      id: "1",
      name: "Convidado com cadastro reservado",
      status: "reserved",
    });
    expect(invitationGuestLabel({ ...g, allowInviterView: true })).toEqual({
      id: "1",
      name: "Ana",
      status: "declined",
    });
  });
});
