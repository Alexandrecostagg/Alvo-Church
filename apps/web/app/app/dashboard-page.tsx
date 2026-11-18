"use client";

import dynamic from "next/dynamic";

const DashboardView = dynamic(
  () =>
    import("../../src/features/dashboard/role-home-view").then(
      (mod) => mod.RoleHomeView,
    ),
  { ssr: false },
);

export default function HomePage() {
  return <DashboardView />;
}
