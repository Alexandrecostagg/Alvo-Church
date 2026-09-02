"use client";

import dynamic from "next/dynamic";
import { ModuleGuard } from "../../../contexts/ModuleGuard";
import { PlanGuard } from "../../../src/components/plan-guard";

const GivingView = dynamic(
  () => import("../../../src/features/giving/giving-view").then((mod) => mod.GivingView),
  { ssr: false }
);

export default function GivingPage() {
  return (
    <PlanGuard feature="giving">
      <ModuleGuard moduleKey="giving">
        <GivingView />
      </ModuleGuard>
    </PlanGuard>
  );
}
export const runtime = 'edge';
