"use client";

import dynamic from "next/dynamic";
import { ModuleGuard } from "../../../contexts/ModuleGuard";

const GroupsWithThemeView = dynamic(
  () => import("../../../src/features/groups/groups-with-theme-view").then((mod) => mod.GroupsWithThemeView),
  { ssr: false }
);

export default function GroupsPage() {
  return (
    <ModuleGuard moduleKey="groups">
      <GroupsWithThemeView />
    </ModuleGuard>
  );
}
export const runtime = 'edge';
