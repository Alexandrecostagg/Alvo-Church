import { StoreDetailView } from "../../../../src/features/marketplace-community/store-detail-view";

export default function Page({ params }: { params: { storeId: string } }) {
  return <StoreDetailView storeId={params.storeId} />;
}
