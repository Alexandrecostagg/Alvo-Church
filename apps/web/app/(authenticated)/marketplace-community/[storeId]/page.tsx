
"use client";
export const runtime = "edge";


import { use } from "react";
import dynamic from "next/dynamic";

const StoreDetailView = dynamic(
  () => import("../../../../src/features/marketplace-community/store-detail-view").then((mod) => mod.StoreDetailView),

);

export default function Page({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = use(params);
  return <StoreDetailView storeId={storeId} />;
}
