"use client";

import dynamic from "next/dynamic";

const PastoralAiView = dynamic(
  () => import("../../../src/features/pastoral-ai/pastoral-ai-view").then((mod) => mod.PastoralAiView),
  { ssr: false }
);

export default function PastoralAiPage() {
  return <PastoralAiView />;
}
