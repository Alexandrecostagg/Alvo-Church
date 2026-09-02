"use client";

import dynamic from "next/dynamic";
import { ModuleGuard } from "../../../../contexts/ModuleGuard";

const CourseManagerView = dynamic(
  () =>
    import("../../../../src/features/learning/course-manager-view").then(
      (mod) => mod.CourseManagerView,
    ),
  { ssr: false },
);

export default function Page() {
  return (
    <ModuleGuard moduleKey="journeys">
      <CourseManagerView />
    </ModuleGuard>
  );
}
