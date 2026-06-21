"use client";

import dynamic from "next/dynamic";

// ssr: false prevents Firebase/protobufjs from loading on the server (Cloudflare Workers
// blocks eval/new Function which protobufjs codegen requires).
const NetworkSync = dynamic(
  () => import("./network-sync").then((m) => ({ default: m.NetworkSync })),
  { ssr: false }
);

export function NetworkSyncLoader() {
  return <NetworkSync />;
}
