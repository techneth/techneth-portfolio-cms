import { BarChart3, TrendingUp, Users, AlertCircle } from 'lucide-react';

interface StatCardProps {
    title: string;
    value: string | number;
    change?: string;
    icon: React.ReactNode;
    color: string;
}

export default function StatCard({ title, value, change, icon, color }: StatCardProps) {
    return (
        <div className="admin-card p-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-600 mb-1">{title}</p>
                    <h3 className="text-3xl font-bold" style={{ color }}>{value}</h3>
                    {change && (
                        <p className="text-sm text-gray-500 mt-2">
                            <span className={change.startsWith('+') ? 'text-green-600' : 'text-red-600'}>
                                {change}
                            </span> from last month
                        </p>
                    )}
                </div>
                <div className="p-3 rounded-lg" style={{ backgroundColor: `${color}20` }}>
                    <div style={{ color }}>
                        {icon}
                    </div>
                </div>
            </div>
        </div>
    );
}
