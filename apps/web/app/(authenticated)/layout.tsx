import type { ReactNode } from "react";
import { Suspense } from "react";
import { ModuleNav } from "./module-nav";


export default function AuthenticatedLayout({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <Suspense fallback={null}>
        <ModuleNav />
      </Suspense>
      {children}
    </div>
  );
}
