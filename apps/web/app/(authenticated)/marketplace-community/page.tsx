"use client";

import dynamic from "next/dynamic";
import { ModuleGuard } from "../../../contexts/ModuleGuard";

const MarketplaceCommunityView = dynamic(
  () => import("../../../src/features/marketplace-community/marketplace-community-view").then((mod) => mod.MarketplaceCommunityView),
  { ssr: false }
);

export default function Page() {
  return (
    <ModuleGuard moduleKey="communication">
      <MarketplaceCommunityView />
    </ModuleGuard>
  );
}
