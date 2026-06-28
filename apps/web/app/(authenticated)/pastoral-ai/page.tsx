"use client";

import dynamic from "next/dynamic";
import { ModuleGuard } from "../../../contexts/ModuleGuard";
import { PlanGuard } from "../../../src/components/plan-guard";

const PastoralAiView = dynamic(
  () => import("../../../src/features/pastoral-ai/pastoral-ai-view").then((mod) => mod.PastoralAiView),
  { ssr: false }
);

export default function PastoralAiPage() {
  return (
    <PlanGuard feature="pastoral-ai">
      <ModuleGuard moduleKey="ai">
        <PastoralAiView />
      </ModuleGuard>
    </PlanGuard>
  );
}
