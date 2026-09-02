"use client";

import dynamic from "next/dynamic";
import { ModuleGuard } from "../../../contexts/ModuleGuard";

const WeeklyThemeView = dynamic(
  () =>
    import("../../../src/features/weekly-theme/weekly-theme-view").then(
      (mod) => mod.WeeklyThemeView,
    ),
  { ssr: false },
);

export default function WeeklyThemePage() {
  return (
    <ModuleGuard moduleKey="groups">
      <WeeklyThemeView />
    </ModuleGuard>
  );
}
