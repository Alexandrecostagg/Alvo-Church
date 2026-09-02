"use client";

import dynamic from "next/dynamic";
import { ModuleGuard } from "../../../../contexts/ModuleGuard";

const KidsLeaderView = dynamic(
  () =>
    import("../../../../src/features/kids/kids-leader-view").then(
      (mod) => mod.KidsLeaderView,
    ),
  { ssr: false },
);

export default function KidsScanPage() {
  return (
    <ModuleGuard moduleKey="children">
      <KidsLeaderView />
    </ModuleGuard>
  );
}
