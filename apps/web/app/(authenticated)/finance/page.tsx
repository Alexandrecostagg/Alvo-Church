"use client";

import dynamic from "next/dynamic";
import { ModuleGuard } from "../../../contexts/ModuleGuard";
import { RoleGuard } from "../../../src/components/role-guard";

const FinanceView = dynamic(
  () => import("../../../src/features/finance/finance-view").then((mod) => mod.FinanceView),
  { ssr: false }
);

export default function FinancePage() {
  return (
    <RoleGuard required={["super_admin", "church_admin"]}>
      <ModuleGuard moduleKey="finance">
        <FinanceView />
      </ModuleGuard>
    </RoleGuard>
  );
}
