"use client";

import dynamic from "next/dynamic";

const NetworkView = dynamic(
  () => import("../../../src/features/network/network-view").then((m) => ({ default: m.NetworkView })),
  { ssr: false }
);

export default function NetworkPage() {
  return <NetworkView />;
}
