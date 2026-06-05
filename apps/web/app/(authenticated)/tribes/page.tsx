"use client";

import dynamic from "next/dynamic";

const TribesView = dynamic(
  () => import("../../../src/features/tribes/tribes-view").then((mod) => mod.TribesView),
  { ssr: false }
);

export default function TribesPage() {
  return <TribesView />;
}
