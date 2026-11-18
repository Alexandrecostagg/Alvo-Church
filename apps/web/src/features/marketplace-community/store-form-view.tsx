"use client";
import { CommunityWorkspace } from "./community-workspace";
export function StoreFormView({ storeId }: { storeId?: string }) {
  return (
    <CommunityWorkspace mode={storeId ? "edit" : "new"} storeId={storeId} />
  );
}
