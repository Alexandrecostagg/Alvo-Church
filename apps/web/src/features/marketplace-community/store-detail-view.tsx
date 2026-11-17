"use client";
import { CommunityWorkspace } from "./community-workspace";
export function StoreDetailView({ storeId }: { storeId: string }) {
  return <CommunityWorkspace mode="detail" storeId={storeId} />;
}
