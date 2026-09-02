"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface DrawerCtx {
  open: boolean;
  toggle: () => void;
  close: () => void;
}

const Ctx = createContext<DrawerCtx>({
  open: false,
  toggle: () => {},
  close: () => {},
});

export function MobileDrawerProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Ctx.Provider
      value={{
        open,
        toggle: () => setOpen((v) => !v),
        close: () => setOpen(false),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useMobileDrawer() {
  return useContext(Ctx);
}
