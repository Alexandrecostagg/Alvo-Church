import type { ReactNode } from "react";
import { Suspense } from "react";
import { ModuleNav } from "./module-nav";
import { TopBar } from "./top-bar";
import { AuthGate } from "./auth-gate";
import { AppShell } from "./app-shell";
import { MobileDrawerProvider } from "./mobile-drawer-context";
import { OrgFeaturesProvider } from "../../contexts/OrgFeaturesContext";
import { ToastProvider } from "../../contexts/ToastContext";
import { NetworkSyncLoader } from "./network-sync-loader";

export default function AuthenticatedLayout({ children }: { children: ReactNode }) {
  return (
    <OrgFeaturesProvider>
      <ToastProvider>
        <AuthGate>
          <MobileDrawerProvider>
            <AppShell>
              <Suspense fallback={null}>
                <ModuleNav />
              </Suspense>
              <div className="app-content-column">
                <Suspense fallback={null}>
                  <TopBar />
                </Suspense>
                {children}
              </div>
            </AppShell>
          </MobileDrawerProvider>
          <NetworkSyncLoader />
        </AuthGate>
      </ToastProvider>
    </OrgFeaturesProvider>
  );
}
