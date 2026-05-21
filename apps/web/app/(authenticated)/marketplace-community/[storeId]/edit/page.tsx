import { StoreFormView } from "../../../../../src/features/marketplace-community/store-form-view";
import { fetchCommunityStoreById } from "@alvo/firebase";

// This would be called in a real app - for now we'll fetch on the client side
export default function Page({ params }: { params: { storeId: string } }) {
  return <StoreFormView />;
}
