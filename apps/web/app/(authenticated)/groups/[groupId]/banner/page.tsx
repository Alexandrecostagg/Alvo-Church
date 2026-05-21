export const runtime = 'nodejs';
import { GroupBannerView } from "../../../../../src/features/groups/group-banner-view";

export default function Page({ params }: { params: { groupId: string } }) {
  return <GroupBannerView groupId={params.groupId} />;
}
