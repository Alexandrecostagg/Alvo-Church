export const runtime = 'edge';
import { StoreFormView } from "../../../../../src/features/marketplace-community/store-form-view";
import { fetchCommunityStoreById } from "@alvo/firebase";

// This would be called in a real app - for now we'll fetch on the client side
export default async function Page({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = await params;
  return <StoreFormView />;
}
