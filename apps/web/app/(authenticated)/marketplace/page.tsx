"use client";

import dynamic from "next/dynamic";
import { ModuleGuard } from "../../../contexts/ModuleGuard";
import { PlanGuard } from "../../../src/components/plan-guard";

const MarketplaceView = dynamic(
  () =>
    import("../../../src/features/marketplace/marketplace-view").then(
      (mod) => mod.MarketplaceView,
    ),
  { ssr: false },
);

export default function MarketplacePage() {
  return (
    <PlanGuard feature="marketplace">
      <ModuleGuard moduleKey="marketplace">
        <MarketplaceView />
      </ModuleGuard>
    </PlanGuard>
  );
}
