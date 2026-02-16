import { NextRequest, NextResponse } from 'next/server';
import { getActivityLogs } from '@/lib/activity-logger';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser();

        if (!user || !['super_admin', 'admin'].includes(user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const searchParams = request.nextUrl.searchParams;

        const filters = {
            actionType: searchParams.get('actionType') || undefined,
            resourceType: searchParams.get('resourceType') || undefined,
            startDate: searchParams.get('startDate') || undefined,
            endDate: searchParams.get('endDate') || undefined,
            limit: parseInt(searchParams.get('limit') || '50'),
            offset: parseInt(searchParams.get('offset') || '0'),
        };

        const { data, count } = await getActivityLogs(filters);

        return NextResponse.json({ logs: data, count });
    } catch (error) {
        console.error('Error fetching activity logs:', error);
        return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
    }
}
