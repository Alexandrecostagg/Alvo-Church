"use client";

import dynamic from "next/dynamic";
import { ModuleGuard } from "../../../contexts/ModuleGuard";

const GivingView = dynamic(
  () => import("../../../src/features/giving/giving-view").then((mod) => mod.GivingView),
  { ssr: false }
);

export default function GivingPage() {
  return (
    <ModuleGuard moduleKey="giving">
      <GivingView />
    </ModuleGuard>
  );
}
