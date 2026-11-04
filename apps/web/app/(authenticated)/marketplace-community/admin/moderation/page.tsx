"use client";

import dynamic from "next/dynamic";
import { RoleGuard } from "../../../../../src/components/role-guard";

const MarketplaceModerationView = dynamic(
  () => import("../../../../../src/features/marketplace-community/marketplace-moderation-view").then((mod) => mod.MarketplaceModerationView),
  { ssr: false }
);

export default function Page() {
  return (
    <RoleGuard required={["super_admin", "church_admin", "pastor", "secretary"]}>
      <MarketplaceModerationView />
    </RoleGuard>
  );
}
