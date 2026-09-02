"use client";

import dynamic from "next/dynamic";

const OrganizationNewView = dynamic(
  () => import("../../../../../src/features/saas/organization-new-view").then((mod) => mod.OrganizationNewView),
  { ssr: false }
);

export default function NewContractingOrganizationPage() {
  return <OrganizationNewView />;
}
export const runtime = 'edge';
