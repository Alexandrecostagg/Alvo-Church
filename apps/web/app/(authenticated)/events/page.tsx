"use client";

import dynamic from "next/dynamic";
import { ModuleGuard } from "../../../contexts/ModuleGuard";
import { PlanGuard } from "../../../src/components/plan-guard";

const EventsView = dynamic(
  () => import("../../../src/features/events/events-view").then((mod) => mod.EventsView),
  { ssr: false }
);

export default function EventsPage() {
  return (
    <PlanGuard feature="events">
      <ModuleGuard moduleKey="events">
        <EventsView />
      </ModuleGuard>
    </PlanGuard>
  );
}
export const runtime = 'edge';
