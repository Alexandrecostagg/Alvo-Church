import type { ReactNode } from "react";

export default function PublicOrgLayout({ children }: { children: ReactNode }) {
  return <div className="public-org-root">{children}</div>;
}
