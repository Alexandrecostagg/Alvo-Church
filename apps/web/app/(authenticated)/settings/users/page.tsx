"use client";

import dynamic from "next/dynamic";
import { RoleGuard } from "../../../../src/components/role-guard";

const UsersView = dynamic(
  () => import("../../../../src/features/settings/users-view").then((mod) => mod.UsersView),
  { ssr: false }
);

export default function SettingsUsersPage() {
  return (
    <RoleGuard required={["super_admin", "church_admin"]}>
      <UsersView />
    </RoleGuard>
  );
}
export const runtime = 'edge';
