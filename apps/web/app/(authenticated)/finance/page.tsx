"use client";

import dynamic from "next/dynamic";
import { ModuleGuard } from "../../../contexts/ModuleGuard";

const FinanceView = dynamic(
  () => import("../../../src/features/finance/finance-view").then((mod) => mod.FinanceView),
  { ssr: false }
);

export default function FinancePage() {
  return (
    <ModuleGuard moduleKey="finance">
      <FinanceView />
    </ModuleGuard>
  );
}
