"use client";

export const runtime = 'edge';
import { DashboardView } from "../../src/features/dashboard/dashboard-view";

export default function HomePage() {
  return <DashboardView />;
}
