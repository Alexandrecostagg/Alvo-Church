"use client";

import dynamic from "next/dynamic";
import { ModuleGuard } from "../../../../contexts/ModuleGuard";

const WorshipView = dynamic(
  () =>
    import("../../../../src/features/serving/worship-view").then(
      (mod) => mod.WorshipView,
    ),
  { ssr: false },
);

export default function Page() {
  return (
    <ModuleGuard moduleKey="volunteers">
      <WorshipView />
    </ModuleGuard>
  );
}
