import { describe, it, expect } from "vitest";
import { buildPixPayload } from "./pix";

describe("buildPixPayload", () => {
  it("should generate a valid payload with basic information", () => {
    const payload = buildPixPayload({
      key: "test@example.com",
      receiverName: "Test Receiver",
    });

    expect(payload).toBeDefined();
    expect(typeof payload).toBe("string");
    expect(payload.length).toBeGreaterThan(0);
    expect(payload.includes("test@example.com")).toBe(true);
    // Payload should end with the 4-char CRC16
    expect(payload.slice(-4)).toMatch(/^[0-9A-F]{4}$/);
  });

  it("should include optional fields (amount, description)", () => {
    const payload = buildPixPayload({
      key: "12345678909",
      receiverName: "John Doe",
      amount: 15.5,
      description: "Test payment",
    });

    // 15.5 should be formatted to 15.50
    expect(payload.includes("15.50")).toBe(true);
    expect(payload.includes("Test payment")).toBe(true);
    expect(payload.slice(-4)).toMatch(/^[0-9A-F]{4}$/);
  });

  it("should sanitize receiverName and city correctly (no accents, upper case, no special chars)", () => {
    const payload = buildPixPayload({
      key: "12345678909", // Use key without special chars to test that city/name don't leak them
      receiverName: "João César!", // Should become JOAO CESAR
      city: "São Paulo@", // Should become SAO PAULO
    });

    expect(payload.includes("JOAO CESAR")).toBe(true);
    expect(payload.includes("SAO PAULO")).toBe(true);
    expect(payload.includes("João")).toBe(false);
    expect(payload.includes("São")).toBe(false);
    expect(payload.includes("!")).toBe(false);
    expect(payload.includes("@")).toBe(false);
  });

  it("should truncate receiverName to 25 chars and city to 15 chars", () => {
    const payload = buildPixPayload({
      key: "test@example.com",
      receiverName: "A Very Long Receiver Name That Exceeds The Limit",
      city: "A Very Long City Name That Exceeds",
    });

    // 'A Very Long Receiver Name That Exceeds The Limit'.toUpperCase()
    // 25 chars: 'A VERY LONG RECEIVER NAME'
    expect(payload.includes("A VERY LONG RECEIVER NAME")).toBe(true);

    // 'A Very Long City Name That Exceeds'.toUpperCase()
    // 15 chars: 'A VERY LONG CIT'
    expect(payload.includes("A VERY LONG CIT")).toBe(true);
  });

  it("should generate valid CRC16", () => {
    // Generate a payload and extract CRC
    const payload = buildPixPayload({
      key: "12345678909",
      receiverName: "John Doe",
      city: "SAO PAULO",
    });

    // Example format:
    // ...6304XXXX
    // where XXXX is the CRC16

    const crc = payload.slice(-4);
    const dataWithoutCrc = payload.slice(0, -4);

    // Fixed regression vector; avoids copying the implementation into the test.
    expect(dataWithoutCrc).toBe(
      "00020101021226330014BR.GOV.BCB.PIX0111123456789095204000053039865802BR5908JOHN DOE6009SAO PAULO62070503***6304",
    );
    expect(crc).toBe("0F2E");
  });

  it("should use default values if not provided", () => {
    const payload = buildPixPayload({
      key: "test@example.com",
      receiverName: "Test",
    });

    // Default city: SAO PAULO
    // Default txId: ***
    expect(payload.includes("SAO PAULO")).toBe(true);
    // 62... 05... *** (0503***) -> tag 05, length 03, value ***
    expect(payload.includes("0503***")).toBe(true);
  });
});
