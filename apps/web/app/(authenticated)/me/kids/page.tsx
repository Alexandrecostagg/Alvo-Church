"use client";

import dynamic from "next/dynamic";

const KidsSecurityView = dynamic(
  () => import("../../../../src/features/kids/kids-security-view").then((mod) => mod.KidsSecurityView),
  { ssr: false }
);

export default function KidsSecurityPage() {
  return <KidsSecurityView />;
}
