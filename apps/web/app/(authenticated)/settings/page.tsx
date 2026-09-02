"use client";

import dynamic from "next/dynamic";
import { RoleGuard } from "../../../src/components/role-guard";

const SettingsWithAdminTabsView = dynamic(
  () => import("../../../src/features/settings/settings-with-admin-tabs-view").then((mod) => mod.SettingsWithAdminTabsView),
  { ssr: false }
);

export default function SettingsPage() {
  return (
    <RoleGuard required={["super_admin", "church_admin"]}>
      <SettingsWithAdminTabsView />
    </RoleGuard>
  );
}
export const runtime = 'edge';
