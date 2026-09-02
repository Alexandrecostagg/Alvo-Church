"use client";

import dynamic from "next/dynamic";
import { ModuleGuard } from "../../../contexts/ModuleGuard";

const ReceptionView = dynamic(
  () =>
    import("../../../src/features/reception/reception-view").then(
      (mod) => mod.ReceptionView,
    ),
  { ssr: false },
);

export default function ReceptionPage() {
  return (
    <ModuleGuard moduleKey="visitors">
      <ReceptionView />
    </ModuleGuard>
  );
}
