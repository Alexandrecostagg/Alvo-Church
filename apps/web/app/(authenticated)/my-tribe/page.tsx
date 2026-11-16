"use client";
import { TribesView } from "../../../src/features/tribes/tribes-view";
import { ModuleGuard } from "../../../contexts/ModuleGuard";
import { PlanGuard } from "../../../src/components/plan-guard";
export default function MyTribePage() {
  return (
    <PlanGuard feature="tribes">
      <ModuleGuard moduleKey="tribes">
        <TribesView personal />
      </ModuleGuard>
    </PlanGuard>
  );
}
