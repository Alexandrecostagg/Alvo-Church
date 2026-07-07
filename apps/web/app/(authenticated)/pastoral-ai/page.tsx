"use client";

import dynamic from "next/dynamic";
import { ModuleGuard } from "../../../contexts/ModuleGuard";
import { PlanGuard } from "../../../src/components/plan-guard";

const PastoralAiWithRadarView = dynamic(
  () => import("../../../src/features/pastoral-ai/pastoral-ai-with-radar-view").then((mod) => mod.PastoralAiWithRadarView),
  { ssr: false }
);

export default function PastoralAiPage() {
  return (
    <PlanGuard feature="pastoral-ai">
      <ModuleGuard moduleKey="ai">
        <PastoralAiWithRadarView />
      </ModuleGuard>
    </PlanGuard>
  );
}
