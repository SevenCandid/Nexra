import { html, useEffect, useRef, useState } from '../utils/htm.js';
import { useAuth } from '../contexts/AuthContext.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Icon } from '../components/ui/Icon.js';
import { Badge } from '../components/ui/Badge.js';
import { TourModal } from '../components/TourModal.js';
import apiClient from '../api/client.js';


export const DashboardPage = () => {
    const { user } = useAuth();
    const [analytics, setAnalytics] = useState(null);
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState('7d'); // 24h, 7d, 30d, all, custom
    const [customStartDate, setCustomStartDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        return d.toISOString().split('T')[0];
    });
    const [customEndDate, setCustomEndDate] = useState(() => {
        return new Date().toISOString().split('T')[0];
    });
    const activityChartRef = useRef(null);
    const successChartRef = useRef(null);
    const chartsInitialized = useRef({ activity: null, success: null });

    useEffect(() => {
        const fetchData = async () => {
            try {
                let start_date = '';
                let end_date = '';
                const now = new Date();
                if (dateRange === '24h') {
                    start_date = new Date(now.getTime() - (24 * 60 * 60 * 1000)).toISOString();
                } else if (dateRange === '7d') {
                    start_date = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)).toISOString();
                } else if (dateRange === '30d') {
                    start_date = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000)).toISOString();
                } else if (dateRange === 'all') {
                    start_date = new Date(0).toISOString(); // 1970-01-01
                } else if (dateRange === 'custom') {
                    if (customStartDate) {
                        start_date = new Date(customStartDate).toISOString();
                    }
                    if (customEndDate) {
                        const d = new Date(customEndDate);
                        d.setHours(23, 59, 59, 999);
                        end_date = d.toISOString();
                    }
                }

                const params = new URLSearchParams();
                if (start_date) params.append('start_date', start_date);
                if (end_date) params.append('end_date', end_date);
                const queryStr = params.toString() ? `?${params.toString()}` : '';

                const [analyticsData, campaignsData] = await Promise.all([
                    apiClient.get(`/analytics/stats${queryStr}`),
                    apiClient.get('/campaigns?limit=5')
                ]);
                setAnalytics(analyticsData.data);
                setCampaigns(campaignsData.data.items || []);
                setLoading(false);
            } catch (error) {
                console.error('Failed to fetch dashboard data:', error);
                setLoading(false);
            }
        };

        fetchData();

        // Real-time Update Listener
        const handlePulse = (e) => {
            console.log('NEXRA Pulse Received:', e.detail);
            fetchData(); // Re-fetch to update charts and lists
        };

        window.addEventListener('nexra:update', handlePulse);
        return () => window.removeEventListener('nexra:update', handlePulse);
    }, [dateRange, customStartDate, customEndDate]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (chartsInitialized.current.activity) { chartsInitialized.current.activity.destroy(); chartsInitialized.current.activity = null; }
            if (chartsInitialized.current.success) { chartsInitialized.current.success.destroy(); chartsInitialized.current.success = null; }
        };
    }, []);

    // Init or Update charts
    useEffect(() => {
        if (!analytics || !activityChartRef.current || !successChartRef.current) return;

        // Activity Chart
        if (!chartsInitialized.current.activity) {
            const activityCtx = activityChartRef.current.getContext('2d');
            chartsInitialized.current.activity = new window.Chart(activityCtx, {
                type: 'bar',
                data: {
                    labels: analytics.activity.map(d => d.day || d.date),
                    datasets: [{ label: 'Messages Sent', data: analytics.activity.map(d => d.count), backgroundColor: '#3b82f6', borderRadius: 4, barThickness: 12 }]
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
        } else {
            const chart = chartsInitialized.current.activity;
            chart.data.labels = analytics.activity.map(d => d.day || d.date);
            chart.data.datasets[0].data = analytics.activity.map(d => d.count);
            chart.update();
        }

        // Success Chart
        const s = analytics.success_rate;
        const doughnutData = [
            s.delivered || 0,
            s.submitted || 0,
            s.delivering || 0,
            s.not_delivered || 0,
            s.failed || 0
        ];

        if (!chartsInitialized.current.success) {
            const successCtx = successChartRef.current.getContext('2d');
            chartsInitialized.current.success = new window.Chart(successCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Delivered', 'Submitted', 'Delivering', 'Not Delivered', 'Failed'],
                    datasets: [{ data: doughnutData, backgroundColor: ['#22c55e', '#3b82f6', '#f59e0b', '#f97316', '#ef4444'], borderWidth: 0, hoverOffset: 4 }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '75%',
                    plugins: { legend: { display: false } }
                }
            });
        } else {
            const chart = chartsInitialized.current.success;
            chart.data.datasets[0].data = doughnutData;
            chart.update();
        }
    }, [analytics]);


    if (loading) {
        return html`
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        `;
    }

    if (!analytics) {
        return html`
            <div className="flex flex-col items-center justify-center h-64 text-gray-500 fade-in">
                <${Icon} name="alert-circle" size=${48} className="mb-4 text-gray-400" />
                <p>Failed to load dashboard data. Please try refreshing.</p>
            </div>
        `;
    }

    const s = analytics.success_rate;
    const totalMessages = (s.delivered || 0) + (s.submitted || 0) + (s.delivering || 0) + (s.not_delivered || 0) + (s.failed || 0);

    return html`
        <div className="space-y-6 fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Pulse Overview</h2>
                <div className="flex flex-wrap items-center gap-2">
                    ${dateRange === 'custom' && html`
                        <div className="flex items-center gap-1 bg-white dark:bg-midnight-800 border border-gray-200 dark:border-midnight-700 px-2 py-0.5 rounded-lg">
                            <input 
                                type="date" 
                                value=${customStartDate} 
                                onChange=${e => setCustomStartDate(e.target.value)} 
                                className="bg-transparent border-0 outline-none text-[10px] text-gray-600 dark:text-gray-300 font-bold uppercase tracking-wider w-28"
                            />
                            <span className="text-[10px] text-gray-400 font-bold uppercase">to</span>
                            <input 
                                type="date" 
                                value=${customEndDate} 
                                onChange=${e => setCustomEndDate(e.target.value)} 
                                className="bg-transparent border-0 outline-none text-[10px] text-gray-600 dark:text-gray-300 font-bold uppercase tracking-wider w-28"
                            />
                        </div>
                    `}
                    <div className="flex items-center gap-1 bg-gray-100 dark:bg-midnight-900 p-1 rounded-lg">
                        ${['24h', '7d', '30d', 'all', 'custom'].map(range => html`
                            <button 
                                key=${range}
                                onClick=${() => setDateRange(range)}
                                className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${dateRange === range ? 'bg-white dark:bg-midnight-800 text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}"
                            >
                                ${{ '24h': '24h', '7d': '7d', '30d': '30d', 'all': 'All', 'custom': 'Custom' }[range]}
                            </button>
                        `)}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <${Card} className="lg:col-span-2 p-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <h2 className="text-[10px] font-black text-gray-400 dark:text-midnight-500 uppercase tracking-widest px-1">Activity</h2>
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-tight">
                                    ${analytics.avg_delivery_time > 60 ? Math.round(analytics.avg_delivery_time / 60) + 'm' : (analytics.avg_delivery_time || 0) + 's'} Avg
                                </span>
                            </div>
                        </div>
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
                                    ${totalMessages > 0 ? ((analytics.success_rate.delivered / totalMessages) * 100).toFixed(0) : 0}%
                                </p>
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Delivered</p>
                            </div>
                        </div>
                        <div className="flex-1 grid grid-cols-1 gap-2 lg:mt-4 lg:pt-4 lg:border-t border-gray-50 dark:border-midnight-800">
                            <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50/50 dark:bg-midnight-900/50 border border-gray-100 dark:border-midnight-800">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                    <span className="text-[10px] font-bold text-gray-500 uppercase">Delivering</span>
                                </div>
                                <span className="text-xs font-black text-gray-900 dark:text-white">${s.delivering || 0}</span>
                            </div>
                            <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50/50 dark:bg-midnight-900/50 border border-gray-100 dark:border-midnight-800">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                    <span className="text-[10px] font-bold text-gray-500 uppercase">Submitted</span>
                                </div>
                                <span className="text-xs font-black text-gray-900 dark:text-white">${s.submitted || 0}</span>
                            </div>
                            <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50/50 dark:bg-midnight-900/50 border border-gray-100 dark:border-midnight-800">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                    <span className="text-[10px] font-bold text-gray-500 uppercase">Delivered</span>
                                </div>
                                <span className="text-xs font-black text-emerald-500">${s.delivered || 0}</span>
                            </div>
                            <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50/50 dark:bg-midnight-900/50 border border-gray-100 dark:border-midnight-800">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                                    <span className="text-[10px] font-bold text-gray-500 uppercase">Not Delivered</span>
                                </div>
                                <span className="text-xs font-black text-orange-500">${s.not_delivered || 0}</span>
                            </div>
                            <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50/50 dark:bg-midnight-900/50 border border-gray-100 dark:border-midnight-800">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                    <span className="text-[10px] font-bold text-gray-500 uppercase">Failed</span>
                                </div>
                                <span className="text-xs font-black text-red-500">${s.failed || 0}</span>
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
                                    campaign.status === 'delivering' || campaign.status === 'sending' ? 'info' :
                                    campaign.status === 'scheduled' ? 'warning' : 'default'
                                }>
                                    ${{ completed: 'Completed', delivering: 'Delivering', sending: 'Sending', failed: 'Failed', draft: 'Draft', scheduled: 'Scheduled' }[campaign.status] || campaign.status}
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

            <${TourModal} />
        </div>
    `;
};
