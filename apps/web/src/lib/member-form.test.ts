import { afterEach, describe, expect, it, vi } from "vitest";
import { birthDateError, daysInMonth, formatCalendarDate, lookupCep } from "./member-form";

afterEach(() => vi.unstubAllGlobals());

describe("birth dates", () => {
  const today = new Date(2026, 8, 5);
  it("accepts an omitted date and a valid leap day", () => {
    expect(birthDateError("", "", "", today)).toBeNull();
    expect(birthDateError("29", "2", "2000", today)).toBeNull();
  });
  it("rejects partial, impossible and future dates", () => {
    expect(birthDateError("31", "", "2000", today)).toContain("dia, mês e ano");
    expect(birthDateError("31", "2", "2000", today)).toContain("inválida");
    expect(birthDateError("29", "2", "2001", today)).toContain("inválida");
    expect(birthDateError("6", "9", "2026", today)).toContain("futuro");
  });
  it("uses leap-year rules and preserves the calendar day when formatting", () => {
    expect(daysInMonth("2000", "2")).toBe(29);
    expect(daysInMonth("1900", "2")).toBe(28);
    expect(formatCalendarDate("2000-02-29")).toBe("29 de fev. de 2000");
  });
});

describe("CEP lookup", () => {
  it("tries BrasilAPI if ViaCEP fails at network level", async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new TypeError("Network unavailable"))
      .mockResolvedValueOnce(new Response(JSON.stringify({ street: "Praça da Sé", neighborhood: "Sé", city: "São Paulo", state: "SP" })));
    vi.stubGlobal("fetch", fetchMock);
    expect(await lookupCep("01001000")).toMatchObject({ city: "São Paulo", state: "SP" });
    expect(fetchMock.mock.calls[1][0]).toBe("https://brasilapi.com.br/api/cep/v2/01001000");
  });
  it("rejects a CEP absent from both providers", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 404 })));
    await expect(lookupCep("00000000")).rejects.toThrow("Não foi possível consultar");
  });
  it("does not launch a fallback for a superseded request", async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn().mockImplementation(() => {
      controller.abort();
      throw new DOMException("Aborted", "AbortError");
    });
    vi.stubGlobal("fetch", fetchMock);
    await expect(lookupCep("01001000", controller.signal)).rejects.toThrow("Aborted");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
