"use client";

import dynamic from "next/dynamic";
import { ModuleGuard } from "../../../../contexts/ModuleGuard";

const AcademyView = dynamic(
  () =>
    import("../../../../src/features/learning/academy-view").then(
      (mod) => mod.AcademyView,
    ),
  { ssr: false },
);

export default function Page() {
  return (
    <ModuleGuard moduleKey="journeys">
      <AcademyView />
    </ModuleGuard>
  );
}
