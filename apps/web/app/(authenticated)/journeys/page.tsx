"use client";

import dynamic from "next/dynamic";
import { ModuleGuard } from "../../../contexts/ModuleGuard";

const JourneysView = dynamic(
  () => import("../../../src/features/journeys/journeys-view").then((mod) => mod.JourneysView),
  { ssr: false }
);

export default function JourneysPage() {
  return (
    <ModuleGuard moduleKey="journeys">
      <JourneysView />
    </ModuleGuard>
  );
}
