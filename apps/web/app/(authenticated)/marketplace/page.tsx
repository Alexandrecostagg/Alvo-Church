"use client";

import dynamic from "next/dynamic";

const MarketplaceView = dynamic(
  () => import("../../../src/features/marketplace/marketplace-view").then((mod) => mod.MarketplaceView),
  { ssr: false }
);

export default function MarketplacePage() {
  return <MarketplaceView />;
}
