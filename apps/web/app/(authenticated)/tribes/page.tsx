"use client";

import dynamic from "next/dynamic";
import { ModuleGuard } from "../../../contexts/ModuleGuard";

const TribesView = dynamic(
  () => import("../../../src/features/tribes/tribes-view").then((mod) => mod.TribesView),
  { ssr: false }
);

export default function TribesPage() {
  return (
    <ModuleGuard moduleKey="tribes">
      <TribesView />
    </ModuleGuard>
  );
}
