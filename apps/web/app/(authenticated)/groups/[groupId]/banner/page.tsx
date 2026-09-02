

"use client";
export const runtime = "edge";

import { use } from "react";
import dynamic from "next/dynamic";

const GroupBannerView = dynamic(
  () => import("../../../../../src/features/groups/group-banner-view").then((mod) => mod.GroupBannerView),
  { ssr: false }
);

export default function Page({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = use(params);
  return <GroupBannerView groupId={groupId} />;
}
