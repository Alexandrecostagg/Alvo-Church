"use client";
import { CampaignWorkspace } from "../../../src/features/campaigns/campaign-workspace";
import { ModuleGuard } from "../../../contexts/ModuleGuard";
export default function Page() {
  return (
    <ModuleGuard moduleKey="events">
      <CampaignWorkspace />
    </ModuleGuard>
  );
}
