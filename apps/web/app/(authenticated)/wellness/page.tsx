"use client";

import dynamic from "next/dynamic";

const WellnessView = dynamic(
  () =>
    import("../../../src/features/wellness/wellness-view").then(
      (mod) => mod.WellnessView,
    ),
  { ssr: false },
);

export default function WellnessPage() {
  return <WellnessView />;
}
