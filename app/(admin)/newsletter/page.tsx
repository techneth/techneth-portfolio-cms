import { getSubscribers, getCampaigns, getNewsletterSettings } from './actions';
import NewsletterClient from './NewsletterClient';

export default async function NewsletterPage() {
    const [subscribers, campaigns, settings] = await Promise.all([
        getSubscribers(),
        getCampaigns(),
        getNewsletterSettings(),
    ]);

    return (
        <NewsletterClient
            initialSubscribers={subscribers}
            initialCampaigns={campaigns}
            initialSettings={settings}
        />
    );
}
