import { getActivityLogs } from '@/lib/activity-logger';
import { getCurrentUser } from '@/lib/auth';
import LogsClient from './LogsClient';
import { redirect } from 'next/navigation';

export default async function LogsPage() {
    const user = await getCurrentUser();
    if (!user || !['super_admin', 'admin'].includes(user.role)) {
        redirect('/login');
    }

    const { data: initialLogs, count: initialCount } = await getActivityLogs({ limit: 50, offset: 0 });

    return <LogsClient initialLogs={initialLogs || []} initialCount={initialCount || 0} />;
}
