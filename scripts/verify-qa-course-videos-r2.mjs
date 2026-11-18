// Local workerd/R2 only. No deployed bucket, credentials, or production writes.
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
const require = createRequire(new URL('../apps/web/package.json', import.meta.url));
const { getPlatformProxy } = require('wrangler');
const temp = await mkdtemp('/tmp/esdras-r2-contract-');
await writeFile(`${temp}/wrangler.json`, JSON.stringify({ name: 'course-video-qa', compatibility_date: '2026-05-01', r2_buckets: [{ binding: 'ESDRAS_PRIVATE_MEDIA', bucket_name: 'course-video-local-only' }] }));
const proxy = await getPlatformProxy({ configPath: `${temp}/wrangler.json`, persist: { path: `${temp}/storage` } });
let checks = 0;
try {
  const bucket = proxy.env.ESDRAS_PRIVATE_MEDIA;
  const key = `course-videos/qa/${crypto.randomUUID()}`;
  const upload = await bucket.createMultipartUpload(key, { httpMetadata: { contentType: 'video/mp4', cacheControl: 'private, no-store' } });
  const first = new Uint8Array(8 * 1024 * 1024).fill(3), last = new Uint8Array(30).fill(8);
  const resumed = bucket.resumeMultipartUpload(key, upload.uploadId);
  const p1 = await resumed.uploadPart(1, first), p2 = await resumed.uploadPart(2, last);
  const completed = await resumed.complete([p1, p2]);
  assert.equal(completed.size, first.length + last.length); checks++;
  const head = await bucket.head(key); assert.equal(head.httpMetadata.contentType, 'video/mp4'); checks++;
  assert.equal(head.httpMetadata.cacheControl, 'private, no-store'); checks++;
  const range = await bucket.get(key, { range: { offset: first.length - 2, length: 5 } });
  assert.deepEqual(new Uint8Array(await new Response(range.body).arrayBuffer()), new Uint8Array([3,3,8,8,8])); checks++;
  await bucket.delete(key); assert.equal(await bucket.head(key), null); checks++;
  const cancelled = await bucket.createMultipartUpload(key);
  await cancelled.uploadPart(1, last); await cancelled.abort();
  await assert.rejects(() => cancelled.uploadPart(2, last)); checks++;
  assert.equal(await bucket.head(key), null); checks++;
  console.log(JSON.stringify({ checks, runtime: 'local workerd R2', productionChanges: false }));
} finally { await proxy.dispose(); await rm(temp, { recursive: true, force: true }); }
