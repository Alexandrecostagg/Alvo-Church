"use client";

import dynamic from "next/dynamic";

const PlatformAdminView = dynamic(
  () => import("../../../src/features/platform-admin/platform-admin-view").then((m) => m.PlatformAdminView),
  { ssr: false }
);

export default function PlatformAdminPage() {
  return <PlatformAdminView />;
}
export const runtime = 'edge';
