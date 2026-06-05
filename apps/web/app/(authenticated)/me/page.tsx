"use client";

import dynamic from "next/dynamic";

const MemberProfileView = dynamic(
  () => import("../../../src/features/member-profile/member-profile-view").then((mod) => mod.MemberProfileView),
  { ssr: false }
);

export default function MePage() {
  return <MemberProfileView />;
}
