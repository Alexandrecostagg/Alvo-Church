"use client";

import dynamic from "next/dynamic";
import { ModuleGuard } from "../../../contexts/ModuleGuard";
import { PlanGuard } from "../../../src/components/plan-guard";

const TribesView = dynamic(
  () =>
    import("../../../src/features/tribes/tribes-view").then(
      (mod) => mod.TribesView,
    ),
  { ssr: false },
);

export default function TribesPage() {
  return (
    <PlanGuard feature="tribes">
      <ModuleGuard moduleKey="tribes">
        <TribesView />
      </ModuleGuard>
    </PlanGuard>
  );
}
