"use client";

import dynamic from "next/dynamic";
import { ModuleGuard } from "../../../contexts/ModuleGuard";

const GroupsView = dynamic(
  () => import("../../../src/features/groups/groups-view").then((mod) => mod.GroupsView),
  { ssr: false }
);

export default function GroupsPage() {
  return (
    <ModuleGuard moduleKey="groups">
      <GroupsView />
    </ModuleGuard>
  );
}
