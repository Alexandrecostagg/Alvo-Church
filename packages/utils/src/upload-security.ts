export class UploadError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function boundedBody(request: Request, max: number): Promise<Uint8Array> {
  if (Number(request.headers.get("content-length")) > max) throw new UploadError(413, "Arquivo ou pedido muito grande.");
  const reader = request.body?.getReader();
  if (!reader) throw new UploadError(400, "Pedido vazio.");
  const chunks: Uint8Array[] = []; let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > max) { await reader.cancel(); throw new UploadError(413, "Arquivo ou pedido muito grande."); }
    chunks.push(value);
  }
  const result = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
  return result;
}

export async function boundedForm(request: Request, max: number): Promise<FormData> {
  const bytes = await boundedBody(request, max);
  try { return await new Response(new Uint8Array(bytes), { headers: { "content-type": request.headers.get("content-type") || "" } }).formData(); }
  catch { throw new UploadError(400, "Formulário inválido."); }
}

// SVG/HTML/ICO are deliberately unsupported. Raster signatures and endings
// must match the declared type; served with an image MIME and nosniff.
export function rasterImageType(bytes: Uint8Array, declared: string): "image/png" | "image/jpeg" | "image/webp" {
  const at = (start: number, values: number[]) => values.every((v, i) => bytes[start + i] === v);
  const png = bytes.length >= 45 && at(0, [137,80,78,71,13,10,26,10])
    && at(12, [73,72,68,82]) && at(bytes.length - 12, [0,0,0,0,73,69,78,68,174,66,96,130]);
  const jpeg = bytes.length > 4 && at(0, [255,216,255]) && at(bytes.length - 2, [255,217]);
  const webp = bytes.length >= 20 && at(0, [82,73,70,70]) && at(8, [87,69,66,80])
    && new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(4, true) === bytes.length - 8;
  if (declared === "image/png" && png || declared === "image/jpeg" && jpeg || declared === "image/webp" && webp)
    return declared as "image/png" | "image/jpeg" | "image/webp";
  throw new UploadError(415, "Envie uma imagem PNG, JPEG ou WEBP válida.");
}
