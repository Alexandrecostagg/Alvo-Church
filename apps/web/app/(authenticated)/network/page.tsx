"use client";

import dynamic from "next/dynamic";
import { RoleGuard } from "../../../src/components/role-guard";

const NetworkView = dynamic(
  () => import("../../../src/features/network/network-view").then((m) => ({ default: m.NetworkView })),
  { ssr: false }
);

export default function NetworkPage() {
  return (
    <RoleGuard required={["super_admin", "church_admin"]}>
      <NetworkView />
    </RoleGuard>
  );
}
export const runtime = 'edge';
