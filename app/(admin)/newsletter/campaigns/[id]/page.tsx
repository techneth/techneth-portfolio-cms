import { getCampaign, getSubscribers } from '../../actions';
import CampaignEditor from '../../CampaignEditor';
import { notFound } from 'next/navigation';

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    let campaign;
    try {
        campaign = await getCampaign(id);
    } catch {
        notFound();
    }

    const subscribers = await getSubscribers({ status: 'active' });

    return (
        <CampaignEditor initialCampaign={campaign} activeSubscriberCount={subscribers.length} />
    );
}
