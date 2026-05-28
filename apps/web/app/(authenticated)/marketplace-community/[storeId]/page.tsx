export const runtime = 'edge';

import { StoreDetailView } from "../../../../src/features/marketplace-community/store-detail-view";

export default async function Page({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = await params;
  return <StoreDetailView storeId={storeId} />;
}
