"use client";

import dynamic from "next/dynamic";
import { ModuleGuard } from "../../../contexts/ModuleGuard";
import { PlanGuard } from "../../../src/components/plan-guard";

const MarketplaceCommunityView = dynamic(
  () =>
    import("../../../src/features/marketplace-community/marketplace-community-view").then(
      (mod) => mod.MarketplaceCommunityView,
    ),
  { ssr: false },
);

export default function Page() {
  return (
    <PlanGuard feature="marketplace">
      <ModuleGuard moduleKey="marketplace">
        <MarketplaceCommunityView />
      </ModuleGuard>
    </PlanGuard>
  );
}
