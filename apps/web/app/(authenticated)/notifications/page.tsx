"use client";

import dynamic from "next/dynamic";

const NotificationsView = dynamic(
  () =>
    import("../../../src/features/notifications/notifications-view").then(
      (m) => m.NotificationsView,
    ),
  { ssr: false },
);

export default function NotificationsPage() {
  return <NotificationsView />;
}
