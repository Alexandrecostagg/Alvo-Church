"use client";
import dynamic from "next/dynamic";
import { isChurchStaff } from "@alvo/domain";
import { useAppAuth } from "../../providers";
const Legacy = dynamic(
  () =>
    import("../../../src/features/dashboard/dashboard-view").then(
      (m) => m.LegacyDashboardView,
    ),
  { ssr: false },
);
export default function Page() {
  const { tenantReady, roles } = useAppAuth();
  if (!tenantReady || !isChurchStaff(roles))
    return <p>Acesso reservado à equipe administrativa e pastoral.</p>;
  return <Legacy />;
}
