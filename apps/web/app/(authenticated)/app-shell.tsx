"use client";

import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useMobileDrawer } from "./mobile-drawer-context";

export function AppShell({ children }: { children: ReactNode }) {
  const { open, close } = useMobileDrawer();
  const pathname = usePathname();

  // Close drawer on navigation
  useEffect(() => { close(); }, [pathname]);

  return (
    <div className="app-shell" data-mobile-open={open ? "true" : "false"}>
      {/* Overlay — closes drawer when tapped */}
      {open && <div className="mobile-drawer-overlay" onClick={close} />}
      {children}
    </div>
  );
}
