
"use client";

import { use } from "react";
import dynamic from "next/dynamic";

const StoreFormView = dynamic(
  () => import("../../../../../src/features/marketplace-community/store-form-view").then((mod) => mod.StoreFormView),
  { ssr: false }
);

export default function Page({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = use(params);
  return <StoreFormView storeId={storeId} />;
}
