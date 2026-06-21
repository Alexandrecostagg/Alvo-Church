"use client";

import dynamic from "next/dynamic";

const ReportsView = dynamic(
  () => import("../../../src/features/reports/reports-view").then(m => m.ReportsView),
  { ssr: false }
);

export default function ReportsPage() {
  return <ReportsView />;
}
