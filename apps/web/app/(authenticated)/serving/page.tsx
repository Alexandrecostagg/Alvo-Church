"use client";

import dynamic from "next/dynamic";
import { ModuleGuard } from "../../../contexts/ModuleGuard";

const ServingWithWorshipView = dynamic(
  () => import("../../../src/features/serving/serving-with-worship-view").then((mod) => mod.ServingWithWorshipView),
  { ssr: false }
);

export default function ServingPage() {
  return (
    <ModuleGuard moduleKey="volunteers">
      <ServingWithWorshipView />
    </ModuleGuard>
  );
}
export const runtime = 'edge';
