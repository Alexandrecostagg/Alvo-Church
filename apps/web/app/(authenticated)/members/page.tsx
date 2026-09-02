"use client";

import dynamic from "next/dynamic";

const MembersView = dynamic(
  () =>
    import("../../../src/features/members/members-view").then(
      (mod) => mod.MembersView,
    ),
  { ssr: false },
);

export default function MembersPage() {
  return <MembersView />;
}
