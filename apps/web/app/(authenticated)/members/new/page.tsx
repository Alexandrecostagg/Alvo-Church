"use client";

import dynamic from "next/dynamic";

const MemberNewView = dynamic(
  () => import("../../../../src/features/members/member-new-view").then((mod) => mod.MemberNewView),
  { ssr: false }
);

export default function NewMemberPage() {
  return <MemberNewView />;
}
