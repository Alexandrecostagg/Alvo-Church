"use client";
import { MyInvitations } from "../../../src/features/campaigns/my-invitations";
import { ModuleGuard } from "../../../contexts/ModuleGuard";
export default function Page() {
  return (
    <ModuleGuard moduleKey="events">
      <MyInvitations />
    </ModuleGuard>
  );
}
