"use client";

import dynamic from "next/dynamic";
import { RoleGuard } from "../../../src/components/role-guard";

const ReportsView = dynamic(
  () => import("../../../src/features/reports/reports-view").then(m => m.ReportsView),
  { ssr: false }
);

export default function ReportsPage() {
  return (
    <RoleGuard required={["super_admin", "church_admin", "pastor", "secretary"]}>
      <ReportsView />
    </RoleGuard>
  );
}
export const runtime = 'edge';
