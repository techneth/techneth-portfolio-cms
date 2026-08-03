import { getSubscribers } from '../actions';
import CampaignEditor from '../CampaignEditor';

export default async function ComposeCampaignPage() {
    const subscribers = await getSubscribers({ status: 'active' });

    return (
        <CampaignEditor initialCampaign={null} activeSubscriberCount={subscribers.length} />
    );
}
