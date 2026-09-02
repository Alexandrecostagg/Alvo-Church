"use client";

import dynamic from "next/dynamic";
import { ModuleGuard } from "../../../contexts/ModuleGuard";
import { RoleGuard } from "../../../src/components/role-guard";

const CareRadarView = dynamic(
  () => import("../../../src/features/care-radar/care-radar-view").then((m) => m.CareRadarView),
  { ssr: false }
);

export default function CareRadarPage() {
  return (
    <RoleGuard required={["super_admin", "church_admin", "pastor", "secretary"]}>
      <ModuleGuard moduleKey="ai">
        <CareRadarView />
      </ModuleGuard>
    </RoleGuard>
  );
}
export const runtime = 'edge';
