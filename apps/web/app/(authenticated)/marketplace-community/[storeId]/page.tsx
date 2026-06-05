
"use client";

import { use } from "react";
import dynamic from "next/dynamic";

const StoreDetailView = dynamic(
  () => import("../../../../src/features/marketplace-community/store-detail-view").then((mod) => mod.StoreDetailView),
  { ssr: false }
);

export default function Page({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = use(params);
  return <StoreDetailView storeId={storeId} />;
}
