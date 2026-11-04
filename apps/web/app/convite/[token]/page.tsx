import { CampaignPublicPage } from "../../../src/features/campaigns/campaign-public-page";
export const metadata = {
  title: "Seu convite | Plataforma Esdras",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <CampaignPublicPage token={token} />;
}
