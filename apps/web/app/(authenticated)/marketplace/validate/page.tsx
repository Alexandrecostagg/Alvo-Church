"use client";

import dynamic from "next/dynamic";
import { ModuleGuard } from "../../../../contexts/ModuleGuard";
import { PlanGuard } from "../../../../src/components/plan-guard";

const PassValidatorView = dynamic(
  () =>
    import("../../../../src/features/marketplace/pass-validator-view").then(
      (mod) => mod.PassValidatorView,
    ),
  { ssr: false },
);

export default function PassValidatorPage() {
  return (
    <PlanGuard feature="marketplace">
      <ModuleGuard moduleKey="marketplace">
        <PassValidatorView />
      </ModuleGuard>
    </PlanGuard>
  );
}
