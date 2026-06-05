"use client";

import dynamic from "next/dynamic";

const GroupsView = dynamic(
  () => import("../../../src/features/groups/groups-view").then((mod) => mod.GroupsView),
  { ssr: false }
);

export default function GroupsPage() {
  return <GroupsView />;
}
