"use client";

import dynamic from "next/dynamic";

const SettingsView = dynamic(
  () => import("../../../src/features/settings/settings-view").then((mod) => mod.SettingsView),
  { ssr: false }
);

export default function SettingsPage() {
  return <SettingsView />;
}
