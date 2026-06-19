"use client";

import dynamic from "next/dynamic";

const PublicLinksView = dynamic(
  () => import("../../../src/features/settings/public-links-view").then((mod) => mod.PublicLinksView),
  { ssr: false }
);

export default function SettingsPage() {
  return <PublicLinksView />;
}
