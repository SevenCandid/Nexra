import { html, useState, useEffect, useRef } from '../utils/htm.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';
import { Icon } from '../components/ui/Icon.js';
import apiClient from '../api/client.js';

export const DashboardPage = () => {
    const [stats, setStats] = useState({ pending: 0, delivered: 0, failed: 0 });
    const [campaigns, setCampaigns] = useState([]);
    const [analytics, setAnalytics] = useState({ activity: [], success_rate: {}, networks: {} });
    const [loading, setLoading] = useState(true);

    const activityChartRef = useRef(null);
    const successChartRef = useRef(null);
    const chartsInitialized = useRef({ activity: null, success: null });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [statsRes, campaignsRes, analyticsRes] = await Promise.all([
                apiClient.get('/messages/stats'),
                apiClient.get('/campaigns?limit=5'),
                apiClient.get('/analytics/stats')
            ]);
            setStats({
                pending: statsRes.data.pending || 0,
                delivered: statsRes.data.delivered || 0,
                failed: statsRes.data.failed || 0
            });
            setCampaigns(campaignsRes.data.items || []);
            setAnalytics(analyticsRes.data);
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!loading && analytics.activity.length >= 0) {
            initCharts();
        }
        return () => {
            if (chartsInitialized.current.activity) chartsInitialized.current.activity.destroy();
            if (chartsInitialized.current.success) chartsInitialized.current.success.destroy();
        };
    }, [loading, analytics]);

    const initCharts = () => {
        if (!activityChartRef.current || !successChartRef.current || !window.Chart) return;

        // Cleanup existing
        if (chartsInitialized.current.activity) chartsInitialized.current.activity.destroy();
        if (chartsInitialized.current.success) chartsInitialized.current.success.destroy();

        // Activity Chart (Line)
        const activityCtx = activityChartRef.current.getContext('2d');
        chartsInitialized.current.activity = new window.Chart(activityCtx, {
            type: 'line',
            data: {
                labels: analytics.activity.map(a => new Date(a.day).toLocaleDateString(undefined, { weekday: 'short' })),
                datasets: [{
                    label: 'Messages',
                    data: analytics.activity.map(a => a.count),
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { display: true, grid: { display: false }, ticks: { font: { size: 10 } } },
                    y: { display: true, grid: { color: 'rgba(0,0,0,0.05)' }, border: { display: false }, ticks: { font: { size: 10 } } }
                }
            }
        });

        // Success Rate Chart (Doughnut)
        const successCtx = successChartRef.current.getContext('2d');
        const s = analytics.success_rate;
        chartsInitialized.current.success = new window.Chart(successCtx, {
            type: 'doughnut',
            data: {
                labels: ['Delivered', 'Failed', 'Pending'],
                datasets: [{
                    data: [s.delivered || 0, s.failed || 0, s.pending || 0],
                    backgroundColor: ['#10b981', '#ef4444', '#f59e0b'],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: { legend: { display: false } }
            }
        });
    };

    if (loading) {
        return html`
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        `;
    }

    return html`
        <div className="space-y-6 fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <${Card} className="lg:col-span-2 p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-[10px] font-black text-gray-400 dark:text-midnight-500 uppercase tracking-widest px-1">Weekly Activity</h2>
                        <span className="text-[10px] font-bold text-primary-600 bg-primary-50 dark:bg-primary-900/20 px-2 py-0.5 rounded-full">Pulse</span>
                    </div>
                    <div className="h-[180px] sm:h-[200px] relative">
                        <canvas ref=${activityChartRef}></canvas>
                    </div>
                </${Card}>

                <${Card} className="p-4">
                    <h2 className="text-[10px] font-black text-gray-400 dark:text-midnight-500 uppercase tracking-widest px-1 mb-3">Delivery Performance</h2>
                    
                    <div className="flex lg:block items-center gap-4">
                        <div className="h-[120px] w-[120px] lg:h-[150px] lg:w-full relative flex-shrink-0 flex items-center justify-center">
                            <canvas ref=${successChartRef}></canvas>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <p className="text-2xl font-black text-gray-900 dark:text-white leading-none">
                                    ${analytics.success_rate.delivered > 0 ? ((analytics.success_rate.delivered / (analytics.success_rate.delivered + analytics.success_rate.failed + analytics.success_rate.pending || 1)) * 100).toFixed(0) : 0}%
                                </p>
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Delivered</p>
                            </div>
                        </div>
                        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-2 lg:mt-4 lg:pt-4 lg:border-t border-gray-50 dark:border-midnight-800">
                            <div className="flex lg:flex-col items-center lg:items-center justify-between lg:justify-center gap-2">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0"></span>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Delivered</p>
                                </div>
                                <p className="text-sm font-black text-emerald-500">${analytics.success_rate.delivered}</p>
                            </div>
                            <div className="flex lg:flex-col items-center lg:items-center justify-between lg:justify-center gap-2">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0"></span>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Failed</p>
                                </div>
                                <p className="text-sm font-black text-rose-500">${analytics.success_rate.failed}</p>
                            </div>
                            <div className="flex lg:flex-col items-center lg:items-center justify-between lg:justify-center gap-2">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0"></span>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Pending</p>
                                </div>
                                <p className="text-sm font-black text-amber-500">${analytics.success_rate.pending}</p>
                            </div>
                        </div>
                    </div>
                </${Card}>
            </div>

            <${Card} className="p-4 lg:p-6 overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Recent Campaigns</h2>
                    <a href="#/campaigns" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                        View all
                    </a>
                </div>

                ${campaigns.length === 0 ? html`
                    <div className="text-center py-8 text-gray-500">
                        <${Icon} name="inbox" size=${48} className="mx-auto mb-2 text-gray-400" />
                        <p>No campaigns yet</p>
                    </div>
                ` : html`
                    <div className="space-y-3">
                        ${campaigns.map((campaign) => html`
                            <div key=${campaign.id} className="flex items-center justify-between p-3.5 bg-gray-50/50 dark:bg-midnight-900/50 rounded-xl border border-gray-100/50 dark:border-midnight-800 shadow-sm transition-all hover:border-primary-100 dark:hover:border-primary-900/50 group">
                                <div className="flex-1">
                                    <p className="font-bold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">${campaign.name}</p>
                                    <p className="text-[10px] font-bold text-gray-400 dark:text-midnight-500 uppercase tracking-widest mt-0.5">
                                        ${new Date(campaign.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                                <${Badge} variant=${
                                    campaign.status === 'completed' ? 'success' : 
                                    campaign.status === 'failed' ? 'danger' :
                                    campaign.status === 'sending' ? 'info' :
                                    campaign.status === 'scheduled' ? 'warning' : 'info'
                                }>
                                    ${campaign.status}
                                </${Badge}>
                            </div>
                        `)}
                    </div>
                `}
            </${Card}>

            <div className="grid grid-cols-2 gap-3 mb-4">
                <${Button} variant="primary" size="sm" className="w-full" onClick=${() => window.location.href = '#/campaigns/create'}>
                    <${Icon} name="plus" size=${16} />
                    New Campaign
                </${Button}>
                <${Button} variant="outline" size="sm" className="w-full" onClick=${() => window.location.href = '#/contacts'}>
                    <${Icon} name="users" size=${16} />
                    Contacts
                </${Button}>
            </div>
        </div>
    `;
};
