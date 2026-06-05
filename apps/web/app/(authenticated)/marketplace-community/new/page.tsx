"use client";

import dynamic from "next/dynamic";

const StoreFormView = dynamic(
  () => import("../../../../src/features/marketplace-community/store-form-view").then((mod) => mod.StoreFormView),
  { ssr: false }
);

export default function Page() {
  return <StoreFormView />;
}
