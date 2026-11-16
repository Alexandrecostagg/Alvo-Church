import { isLocalQaFirebase } from "./firebase-server-env";

export type VideoPart = { partNumber: number; etag: string };
export interface VideoBucket {
  createMultipartUpload(key: string, options: { httpMetadata: { contentType: string; cacheControl: string } }): Promise<{ uploadId: string }>;
  resumeMultipartUpload(key: string, uploadId: string): {
    uploadPart(n: number, bytes: Uint8Array): Promise<VideoPart>;
    complete(parts: VideoPart[]): Promise<{ size: number }>;
    abort(): Promise<void>;
  };
  head(key: string): Promise<{ size: number } | null>;
  get(key: string, options: { range: { offset: number; length: number } }): Promise<{ body: ReadableStream<Uint8Array> } | null>;
  delete(key: string): Promise<void>;
}

export async function courseVideoBucket(): Promise<VideoBucket> {
  if (isLocalQaFirebase()) return localVideoBucket();
  const { getCloudflareContext } = await import("@opennextjs/cloudflare");
  const { env } = await getCloudflareContext({ async: true });
  const bucket = (env as unknown as { ESDRAS_PRIVATE_MEDIA?: VideoBucket }).ESDRAS_PRIVATE_MEDIA;
  if (!bucket) throw new Error("Armazenamento privado indisponível.");
  return bucket;
}

// Local demo only: durable files, never production credentials or public Firebase Storage.
async function localVideoBucket(): Promise<VideoBucket> {
  const fs = await import("node:fs/promises");
  const { createHash } = await import("node:crypto");
  const base = "/tmp/esdras-qa-course-videos";
  const path = (key: string) => `${base}/${createHash("sha256").update(key).digest("hex")}`;
  await fs.mkdir(base, { recursive: true });
  return {
    async createMultipartUpload(key) {
      const uploadId = crypto.randomUUID();
      await fs.mkdir(`${path(key)}_${uploadId}`);
      return { uploadId };
    },
    resumeMultipartUpload(key, id) {
      if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error("Invalid upload");
      const dir = `${path(key)}_${id}`;
      return {
        async uploadPart(n, bytes) {
          const etag = createHash("sha256").update(bytes).digest("hex");
          await fs.writeFile(`${dir}/${n}`, bytes);
          return { partNumber: n, etag };
        },
        async complete(parts) {
          await fs.writeFile(`${path(key)}.pending`, new Uint8Array());
          for (const part of parts) {
            const bytes = await fs.readFile(`${dir}/${part.partNumber}`);
            if (createHash("sha256").update(bytes).digest("hex") !== part.etag) throw new Error("Part changed");
            await fs.appendFile(`${path(key)}.pending`, bytes);
          }
          await fs.rename(`${path(key)}.pending`, path(key));
          await fs.rm(dir, { recursive: true, force: true });
          return { size: (await fs.stat(path(key))).size };
        },
        async abort() { await fs.rm(dir, { recursive: true, force: true }); },
      };
    },
    async head(key) { try { return { size: (await fs.stat(path(key))).size }; } catch { return null; } },
    async get(key, { range }) {
      try { await fs.stat(path(key)); } catch { return null; }
      const file = await fs.open(path(key), "r");
      let position = range.offset, remaining = range.length;
      return { body: new ReadableStream<Uint8Array>({
        async pull(controller) {
          const bytes = new Uint8Array(Math.min(64 * 1024, remaining));
          const { bytesRead } = await file.read(bytes, 0, bytes.length, position);
          position += bytesRead; remaining -= bytesRead;
          if (bytesRead) controller.enqueue(bytes.subarray(0, bytesRead));
          if (!remaining || !bytesRead) { controller.close(); await file.close(); }
        },
        async cancel() { await file.close(); },
      }) };
    },
    async delete(key) { await fs.rm(path(key), { force: true }); },
  };
}
