import type { ReactNode } from "react";
import { Suspense } from "react";
import { ModuleNav } from "./module-nav";
import { OrgFeaturesProvider } from "../../contexts/OrgFeaturesContext";

export default function AuthenticatedLayout({ children }: { children: ReactNode }) {
  return (
    <OrgFeaturesProvider>
      <div className="app-shell">
        <Suspense fallback={null}>
          <ModuleNav />
        </Suspense>
        {children}
      </div>
    </OrgFeaturesProvider>
  );
}
