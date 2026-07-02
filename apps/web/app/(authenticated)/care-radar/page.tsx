"use client";

import dynamic from "next/dynamic";

const CareRadarView = dynamic(
  () => import("../../../src/features/care-radar/care-radar-view").then((m) => m.CareRadarView),
  { ssr: false }
);

export default function CareRadarPage() {
  return <CareRadarView />;
}
