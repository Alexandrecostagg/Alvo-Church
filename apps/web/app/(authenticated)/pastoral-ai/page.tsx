"use client";

import dynamic from "next/dynamic";
import { ModuleGuard } from "../../../contexts/ModuleGuard";
import { PlanGuard } from "../../../src/components/plan-guard";
import { RoleGuard } from "../../../src/components/role-guard";

const PastoralAiWithRadarView = dynamic(
  () => import("../../../src/features/pastoral-ai/pastoral-ai-with-radar-view").then((mod) => mod.PastoralAiWithRadarView),
  { ssr: false }
);

export default function PastoralAiPage() {
  return (
    <PlanGuard feature="pastoral-ai">
      <RoleGuard required={["super_admin", "church_admin", "pastor"]}>
        <ModuleGuard moduleKey="ai">
          <PastoralAiWithRadarView />
        </ModuleGuard>
      </RoleGuard>
    </PlanGuard>
  );
}
export const runtime = 'edge';
