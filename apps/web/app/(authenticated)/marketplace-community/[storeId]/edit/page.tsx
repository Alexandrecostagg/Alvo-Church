
"use client";
export const runtime = "edge";


import { use } from "react";
import dynamic from "next/dynamic";

const StoreFormView = dynamic(
  () => import("../../../../../src/features/marketplace-community/store-form-view").then((mod) => mod.StoreFormView),

);

// This would be called in a real app - for now we'll fetch on the client side
export default function Page({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = use(params);
  return <StoreFormView />;
}
