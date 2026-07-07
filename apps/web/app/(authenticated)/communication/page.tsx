"use client";

import dynamic from "next/dynamic";
import { ModuleGuard } from "../../../contexts/ModuleGuard";
import { PlanGuard } from "../../../src/components/plan-guard";

const CommunicationView = dynamic(
  () => import("../../../src/features/communication/communication-view").then((mod) => mod.CommunicationView),
  { ssr: false }
);

export default function CommunicationPage() {
  return (
    <PlanGuard feature="communication">
      <ModuleGuard moduleKey="communication">
        <CommunicationView />
      </ModuleGuard>
    </PlanGuard>
  );
}
