"use client";

import dynamic from "next/dynamic";
import { ModuleGuard } from "../../../contexts/ModuleGuard";

const ServingView = dynamic(
  () => import("../../../src/features/serving/serving-view").then((mod) => mod.ServingView),
  { ssr: false }
);

export default function ServingPage() {
  return (
    <ModuleGuard moduleKey="volunteers">
      <ServingView />
    </ModuleGuard>
  );
}
