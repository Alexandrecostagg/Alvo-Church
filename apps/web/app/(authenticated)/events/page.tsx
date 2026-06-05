"use client";

import dynamic from "next/dynamic";

const EventsView = dynamic(
  () => import("../../../src/features/events/events-view").then((mod) => mod.EventsView),
  { ssr: false }
);

export default function EventsPage() {
  return <EventsView />;
}
