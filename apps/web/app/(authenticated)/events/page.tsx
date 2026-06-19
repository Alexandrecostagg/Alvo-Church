"use client";

import dynamic from "next/dynamic";
import { ModuleGuard } from "../../../contexts/ModuleGuard";

const EventsView = dynamic(
  () => import("../../../src/features/events/events-view").then((mod) => mod.EventsView),
  { ssr: false }
);

export default function EventsPage() {
  return (
    <ModuleGuard moduleKey="events">
      <EventsView />
    </ModuleGuard>
  );
}
