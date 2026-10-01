"use client";

import dynamic from "next/dynamic";
import { ModuleGuard } from "../../../contexts/ModuleGuard";
import { ModuleLoading } from "../../../src/components/module-loading";

const ReceptionView = dynamic(
  () => import("../../../src/features/reception/reception-view").then((mod) => mod.ReceptionView),
  { ssr: false, loading: () => <ModuleLoading label="Abrindo Recepção" /> }
);

export default function ReceptionPage() {
  return (
    <ModuleGuard moduleKey="visitors">
      <ReceptionView />
    </ModuleGuard>
  );
}
