"use client";

import dynamic from "next/dynamic";

const MarketplaceModerationView = dynamic(
  () =>
    import("../../../../../src/features/marketplace-community/marketplace-moderation-view").then(
      (mod) => mod.MarketplaceModerationView,
    ),
  { ssr: false },
);

export default function Page() {
  return <MarketplaceModerationView />;
}
