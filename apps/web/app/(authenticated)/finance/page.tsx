"use client";

import dynamic from "next/dynamic";

const FinanceView = dynamic(
  () => import("../../../src/features/finance/finance-view").then((mod) => mod.FinanceView),
  { ssr: false }
);

export default function FinancePage() {
  return <FinanceView />;
}
