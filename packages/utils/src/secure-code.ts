// 32 symbols: each byte maps evenly to a readable symbol.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateSecureCode(length: number): string {
  if (!Number.isInteger(length) || length < 1 || length > 64) {
    throw new RangeError("Code length must be an integer between 1 and 64");
  }
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(length));
  return Array.from(
    bytes,
    (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length],
  ).join("");
}
