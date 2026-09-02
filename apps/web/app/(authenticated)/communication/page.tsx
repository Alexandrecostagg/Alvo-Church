"use client";

import dynamic from "next/dynamic";
import { ModuleGuard } from "../../../contexts/ModuleGuard";
import { PlanGuard } from "../../../src/components/plan-guard";
import { RoleGuard } from "../../../src/components/role-guard";

const CommunicationView = dynamic(
  () => import("../../../src/features/communication/communication-view").then((mod) => mod.CommunicationView),
  { ssr: false }
);

export default function CommunicationPage() {
  return (
    <PlanGuard feature="communication">
      <RoleGuard required={["super_admin", "church_admin", "pastor", "secretary"]}>
        <ModuleGuard moduleKey="communication">
          <CommunicationView />
        </ModuleGuard>
      </RoleGuard>
    </PlanGuard>
  );
}
export const runtime = 'edge';
