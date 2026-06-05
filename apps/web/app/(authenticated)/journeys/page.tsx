"use client";

import dynamic from "next/dynamic";

const JourneysView = dynamic(
  () => import("../../../src/features/journeys/journeys-view").then((mod) => mod.JourneysView),
  { ssr: false }
);

export default function JourneysPage() {
  return <JourneysView />;
}
