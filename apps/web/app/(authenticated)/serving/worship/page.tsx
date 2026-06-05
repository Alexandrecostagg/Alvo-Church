"use client";

import dynamic from "next/dynamic";

const WorshipView = dynamic(
  () => import("../../../../src/features/serving/worship-view").then((mod) => mod.WorshipView),
  { ssr: false }
);

export default function Page() {
  return <WorshipView />;
}
