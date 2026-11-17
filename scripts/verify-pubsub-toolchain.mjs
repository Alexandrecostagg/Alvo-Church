// Exercise the Pub/Sub SDK used by Firebase Tools against a local emulator.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { once } from "node:events";

const projectId = "demo-alvo-qa";
const endpoint = process.env.PUBSUB_EMULATOR_HOST;
if (!endpoint || !/^127\.0\.0\.1:\d+$/.test(endpoint)) {
  throw new Error("PUBSUB_EMULATOR_HOST deve apontar para um emulador local.");
}
const firebaseRequire = createRequire(import.meta.resolve("firebase-tools/package.json"));
const { PubSub } = firebaseRequire("@google-cloud/pubsub");
const client = new PubSub({ projectId });
const suffix = `security-toolchain-${process.pid}-${Date.now()}`;
const payload = Buffer.from("local-pubsub-compatibility");
let topic;
let subscription;
try {
  [topic] = await client.createTopic(suffix);
  [subscription] = await topic.createSubscription(`${suffix}-sub`);
  const received = once(subscription, "message", { signal: AbortSignal.timeout(20000) });
  const messageId = await topic.publishMessage({ data: payload, attributes: { purpose: "local-qa" } });
  assert(messageId);
  const [message] = await received;
  assert.deepEqual(message.data, payload);
  assert.equal(message.attributes.purpose, "local-qa");
  message.ack();
  console.log("Firebase Tools Pub/Sub SDK: local publish, delivery and acknowledgement passed.");
} finally {
  if (subscription) {
    await subscription.close();
    await subscription.delete();
  }
  if (topic) await topic.delete();
  await client.close();
}
