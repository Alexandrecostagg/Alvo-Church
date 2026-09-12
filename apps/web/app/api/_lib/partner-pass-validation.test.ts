import { describe, expect, it } from "vitest";
import { AccountError } from "./member-account-store";
import { partnerValidationInput } from "./partner-pass-validation";

const valid = {
  organizationId: "org_1",
  partnerId: "partner_1",
  benefitId: "benefit_1",
  requestId: "request_1",
  memberCardCode: "ESDRAS-VALIDO-2026",
};

describe("partnerValidationInput", () => {
  it("normaliza uma solicitação limitada a identificadores e código", () => {
    expect(
      partnerValidationInput({
        ...valid,
        memberCardCode: ` ${valid.memberCardCode} `,
      }),
    ).toEqual(valid);
  });

  it.each([
    { ...valid, organizationId: "../outra" },
    { ...valid, requestId: "" },
    { ...valid, memberCardCode: "curto" },
    { ...valid, memberCardCode: "https://codigo.invalido" },
    { ...valid, memberCardCode: "x".repeat(129) },
  ])("recusa entrada inválida", (input) => {
    expect(() => partnerValidationInput(input)).toThrow(AccountError);
  });
});
