import { NextRequest, NextResponse } from 'next/server';
import { getActivityLogs } from '@/lib/activity-logger';
import { getCurrentUser } from '@/lib/auth';
import { format } from 'date-fns';

export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser();

        if (!user || !['super_admin', 'admin'].includes(user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { data } = await getActivityLogs({ limit: 10000 });

        // Convert to CSV
        const headers = ['Timestamp', 'User', 'Role', 'Action', 'Resource Type', 'Resource Title', 'IP Address'];
        const csvRows = [headers.join(',')];

        data.forEach(log => {
            const row = [
                format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
                log.user_name,
                log.user_role,
                log.action_type,
                log.resource_type,
                log.resource_title || '',
                log.ip_address || '',
            ].map(field => `"${field}"`);
            csvRows.push(row.join(','));
        });

        const csv = csvRows.join('\n');

        return new NextResponse(csv, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="activity-logs-${format(new Date(), 'yyyy-MM-dd')}.csv"`,
            },
        });
    } catch (error) {
        console.error('Error exporting activity logs:', error);
        return NextResponse.json({ error: 'Failed to export logs' }, { status: 500 });
    }
}
