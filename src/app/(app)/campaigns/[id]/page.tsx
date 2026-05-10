import { CampaignDetail } from '@/components/app/campaigns/campaign-detail';

export const metadata = { title: 'Campaña — KDL CRM' };

type Props = { params: Promise<{ id: string }> };

export default async function CampaignDetailPage({ params }: Props) {
  const { id } = await params;
  return <CampaignDetail campaignId={id} />;
}
