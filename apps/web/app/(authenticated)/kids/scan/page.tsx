"use client";

import dynamic from "next/dynamic";

const KidsLeaderView = dynamic(
  () => import("../../../../src/features/kids/kids-leader-view").then((mod) => mod.KidsLeaderView),
  { ssr: false }
);

export default function KidsScanPage() {
  return <KidsLeaderView />;
}
