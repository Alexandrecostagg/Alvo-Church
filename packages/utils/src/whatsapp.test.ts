import { expect, it } from "vitest";
import { whatsappPhone, whatsappHref, manualWhatsappLink } from "./whatsapp";
it("normalizes domestic and international Brazilian numbers", () => {
  expect(whatsappPhone("(62) 99999-1234")).toBe("5562999991234");
  expect(whatsappPhone("+55 62 99999-1234")).toBe("5562999991234");
  expect(whatsappPhone("123")).toBeNull();
});
it("blocks opt-out on every shared manual shortcut", () => {
  expect(
    whatsappHref(
      { whatsappPhone: "62999991234", communicationOptOut: true },
      "Oi",
    ),
  ).toBeNull();
  expect(
    manualWhatsappLink(
      { whatsappPhone: "62999991234", whatsappOptOutAt: "2026-01-01" },
      "Oi",
    ),
  ).toBeNull();
});
it("routes a shortcut through server validation instead of claiming it was sent", () => {
  const url = manualWhatsappLink(
    { id: "p1", whatsappPhone: "62999991234" },
    "Oi Maria!",
  );
  expect(url).toContain("/communication?");
  expect(url).toContain("personId=p1");
  expect(url).toContain("phone=5562999991234");
});
