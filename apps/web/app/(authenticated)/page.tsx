"use client";

import dynamic from "next/dynamic";

const DashboardView = dynamic(
  () => import("../../src/features/dashboard/dashboard-view").then((mod) => mod.DashboardView),
  { ssr: false }
);

export default function HomePage() {
  return <DashboardView />;
}
export const runtime = 'edge';
