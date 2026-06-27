"use client";

import dynamic from "next/dynamic";
import { RoleGuard } from "../../../src/components/role-guard";

const SettingsView = dynamic(
  () => import("../../../src/features/settings/settings-view").then((mod) => mod.SettingsView),
  { ssr: false }
);

export default function SettingsPage() {
  return (
    <RoleGuard required={["super_admin", "church_admin"]}>
      <SettingsView />
    </RoleGuard>
  );
}
