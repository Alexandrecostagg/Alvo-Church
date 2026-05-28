export const runtime = 'edge';

import { GroupBannerView } from "../../../../../src/features/groups/group-banner-view";

export default async function Page({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  return <GroupBannerView groupId={groupId} />;
}
