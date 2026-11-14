import { ScopedGroupsView } from "../../../src/features/dashboard/scoped-groups-view";
import { ModuleGuard } from "../../../contexts/ModuleGuard";
export default function Page() {
  return (
    <ModuleGuard moduleKey="groups">
      <ScopedGroupsView />
    </ModuleGuard>
  );
}
