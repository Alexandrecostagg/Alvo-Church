import type { ReactNode } from "react";
import { ModuleNav } from "./module-nav";

export const runtime = "nodejs";

export default function AuthenticatedLayout({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <ModuleNav />
      {children}
    </div>
  );
}
