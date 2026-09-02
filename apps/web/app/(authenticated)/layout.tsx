import type { ReactNode } from "react";
import { Suspense } from "react";
import { ModuleNav } from "./module-nav";
import { TopBar } from "./top-bar";
import { AuthGate } from "./auth-gate";
import { OrgFeaturesProvider } from "../../contexts/OrgFeaturesContext";
import { PlanProvider } from "../../contexts/PlanContext";
import { ToastProvider } from "../../contexts/ToastContext";
import { NetworkSyncLoader } from "./network-sync-loader";
import { BillingGate } from "./billing-gate";

export default function AuthenticatedLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <OrgFeaturesProvider>
      <PlanProvider>
        <ToastProvider>
          <AuthGate>
            <div className="app-shell">
              <Suspense fallback={null}>
                <ModuleNav />
              </Suspense>
              <div className="app-content-column">
                <Suspense fallback={null}>
                  <TopBar />
                </Suspense>
                <BillingGate>{children}</BillingGate>
              </div>
            </div>
            <NetworkSyncLoader />
          </AuthGate>
        </ToastProvider>
      </PlanProvider>
    </OrgFeaturesProvider>
  );
}
