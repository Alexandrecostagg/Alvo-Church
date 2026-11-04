import { expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

it("does not put QR contents or admission credentials in shared caches", async () => {
  const response = await GET(new NextRequest("https://qa.example.test/api/qr?data=synthetic-admission"));
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  const bytes = new Uint8Array(await response.arrayBuffer());
  expect([...bytes.slice(0, 8)]).toEqual([137,80,78,71,13,10,26,10]);
});

it.each(["", "x".repeat(257)])("rejects missing or excessive QR content", async (data) => {
  const response = await GET(new NextRequest(`https://qa.example.test/api/qr?data=${data}`));
  expect(response.status).toBe(400);
});
