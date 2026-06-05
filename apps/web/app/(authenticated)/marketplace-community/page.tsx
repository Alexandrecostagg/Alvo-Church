"use client";

import dynamic from "next/dynamic";

const MarketplaceCommunityView = dynamic(
  () => import("../../../src/features/marketplace-community/marketplace-community-view").then((mod) => mod.MarketplaceCommunityView),
  { ssr: false }
);

export default function Page() {
  return <MarketplaceCommunityView />;
}
