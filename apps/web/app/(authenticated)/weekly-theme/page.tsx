"use client";

import dynamic from "next/dynamic";

const WeeklyThemeView = dynamic(
  () =>
    import("../../../src/features/weekly-theme/weekly-theme-view").then(
      (mod) => mod.WeeklyThemeView
    ),
  { ssr: false }
);

export default function WeeklyThemePage() {
  return <WeeklyThemeView />;
}
