// Private files are served only through the authorized Kids/finance APIs.
// No public URL, download token, custom domain or browser R2 credential.
interface PrivateObject {
  size: number;
  httpMetadata?: { contentType?: string };
  arrayBuffer(): Promise<ArrayBuffer>;
}
export interface PrivateBucket {
  put(key: string, value: Uint8Array, options: { httpMetadata: { contentType: string; cacheControl: string } }): Promise<unknown>;
  get(key: string): Promise<PrivateObject | null>;
  delete(key: string): Promise<void>;
}
export const PRIVATE_IMAGE_LIMIT = 512000;
function validKey(key: string) {
  if (!/^(kids-private|finance-private)\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+$/.test(key))
    throw new Error("Referência de arquivo privado inválida.");
}
export function privateImages(bucket: PrivateBucket) {
  return {
    async put(key: string, bytes: Uint8Array, contentType: string) {
      validKey(key);
      if (!bytes.length || bytes.length > PRIVATE_IMAGE_LIMIT || !["image/png", "image/jpeg"].includes(contentType))
        throw new Error("Imagem privada inválida.");
      await bucket.put(key, bytes, { httpMetadata: { contentType, cacheControl: "private, no-store" } });
    },
    async get(key: string) {
      validKey(key);
      const object = await bucket.get(key);
      if (!object || object.size > PRIVATE_IMAGE_LIMIT) throw new Error("Imagem privada indisponível.");
      const contentType = object.httpMetadata?.contentType;
      if (contentType !== "image/png" && contentType !== "image/jpeg") throw new Error("Imagem privada inválida.");
      const bytes = new Uint8Array(await object.arrayBuffer());
      if (!bytes.length || bytes.length > PRIVATE_IMAGE_LIMIT) throw new Error("Imagem privada inválida.");
      return { bytes, contentType };
    },
    async remove(key: string) { validKey(key); await bucket.delete(key); },
  };
}
export async function cloudflarePrivateImages() {
  const { getCloudflareContext } = await import("@opennextjs/cloudflare");
  const { env } = await getCloudflareContext({ async: true });
  const bucket = (env as unknown as { ESDRAS_PRIVATE_MEDIA?: PrivateBucket }).ESDRAS_PRIVATE_MEDIA;
  if (!bucket) throw new Error("Armazenamento privado indisponível.");
  return privateImages(bucket);
}
