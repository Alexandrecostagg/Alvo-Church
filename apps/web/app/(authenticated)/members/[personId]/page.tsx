
"use client";
export const runtime = "edge";


import dynamic from "next/dynamic";

const MemberProfileView = dynamic(
  () => import("../../../../src/features/members/member-profile-view").then((mod) => mod.MemberProfileView),

);

export default function MemberProfilePage() {
  return <MemberProfileView />;
}
