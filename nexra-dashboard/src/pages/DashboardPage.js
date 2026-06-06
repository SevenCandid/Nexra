import { html, useEffect, useRef, useState } from '../utils/htm.js';
import { useAuth } from '../contexts/AuthContext.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Icon } from '../components/ui/Icon.js';
import { Badge } from '../components/ui/Badge.js';
import apiClient from '../api/client.js';

const AnnouncementsBanner = () => {
    const [announcements, setAnnouncements] = useState([]);
    const [dismissedIds, setDismissedIds] = useState([]);

    useEffect(() => {
        try {
            const saved = window.localStorage.getItem('nexra_dismissed_announcements');
            if (saved) {
                setDismissedIds(JSON.parse(saved));
            }
        } catch (_) {}
    }, []);

    useEffect(() => {
        apiClient.get('/admin/announcements/active')
            .then(res => setAnnouncements(res.data))
            .catch(() => {});
    }, []);

    const handleDismiss = (id) => {
        setDismissedIds((prev) => {
            const next = prev.includes(id) ? prev : [...prev, id];
            try {
                window.localStorage.setItem('nexra_dismissed_announcements', JSON.stringify(next));
            } catch (_) {}
            return next;
        });
    };

    const visibleAnnouncements = announcements.filter((ann) => !dismissedIds.includes(ann.id));

    if (visibleAnnouncements.length === 0) return null;

    return html`
        <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
            ${visibleAnnouncements.map(ann => html`
                <div key=${ann.id} className="relative overflow-hidden p-2.5 sm:p-5 rounded-xl sm:rounded-2xl border flex flex-col sm:flex-row gap-2.5 sm:gap-4 animate-slide-up shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5
                    ${ann.type === 'warning' ? 'bg-gradient-to-br from-amber-50 via-white to-amber-50 border-amber-200 text-amber-900 dark:from-amber-950/30 dark:via-midnight-950 dark:to-amber-950/20 dark:border-amber-900/30 dark:text-amber-300' : 
                      ann.type === 'emergency' ? 'bg-gradient-to-br from-rose-50 via-white to-rose-50 border-rose-200 text-rose-900 dark:from-rose-950/30 dark:via-midnight-950 dark:to-rose-950/20 dark:border-rose-900/30 dark:text-rose-300' : 
                      'bg-gradient-to-br from-primary-50 via-white to-primary-50 border-primary-100 text-primary-900 dark:from-primary-900/20 dark:via-midnight-950 dark:to-primary-900/10 dark:border-primary-900/30 dark:text-primary-300'}">
                    <div className="absolute inset-y-0 left-0 w-0.5 sm:w-1 bg-current opacity-40 animate-pulse"></div>
                    <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-current/10 blur-3xl animate-pulse hidden sm:block"></div>
                    <div className="flex-shrink-0 relative self-start">
                        <div className="absolute -inset-1 rounded-2xl bg-current/10 blur-md animate-pulse"></div>
                        <div className="relative w-8 h-8 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center bg-white/80 dark:bg-midnight-950/60 border border-current/15 shadow-sm">
                            <${Icon} 
                                name=${ann.type === 'warning' ? 'alert-triangle' : ann.type === 'emergency' ? 'flame' : 'megaphone'} 
                                size=${16} 
                                className="sm:opacity-90 opacity-80" 
                            />
                        </div>
                    </div>
                    <div className="flex-1 relative z-10 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
                            <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.25em] sm:tracking-[0.35em] leading-none opacity-70">Platform Broadcast</p>
                            <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full text-[8px] sm:text-[10px] font-black uppercase tracking-widest bg-white/70 dark:bg-midnight-950/70 border border-current/15 animate-pulse">
                                ${ann.type === 'emergency' ? 'Urgent' : ann.type === 'warning' ? 'Heads Up' : 'Notice'}
                            </span>
                        </div>
                        <h4 className="font-extrabold text-sm sm:text-xl leading-tight mb-1 sm:mb-2 truncate sm:whitespace-normal">${ann.title}</h4>
                        <p className="text-[11px] sm:text-sm leading-relaxed opacity-95 line-clamp-2 sm:line-clamp-none">${ann.content}</p>
                    </div>
                    <button
                        type="button"
                        onClick=${() => handleDismiss(ann.id)}
                        className="absolute top-2 right-2 sm:top-3 sm:right-3 p-1.5 sm:p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors z-20"
                        aria-label="Dismiss announcement"
                    >
                        <${Icon} name="x" size=${13} className="sm:opacity-70 opacity-60" />
                    </button>
                </div>
            `)}
        </div>
    `;
};

export const DashboardPage = () => {
    const { user } = useAuth();
    const [analytics, setAnalytics] = useState(null);
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState('7d'); // 24h, 7d, 30d
    const activityChartRef = useRef(null);
    const successChartRef = useRef(null);
    const chartsInitialized = useRef({ activity: null, success: null });

    useEffect(() => {
        const fetchData = async () => {
            try {
                let start_date = '';
                const now = new Date();
                if (dateRange === '24h') {
                    start_date = new Date(now.getTime() - (24 * 60 * 60 * 1000)).toISOString();
                } else if (dateRange === '7d') {
                    start_date = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)).toISOString();
                } else if (dateRange === '30d') {
                    start_date = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000)).toISOString();
                }

                const [analyticsData, campaignsData] = await Promise.all([
                    apiClient.get(`/analytics/stats?start_date=${start_date}`),
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
    }, [dateRange]);

    useEffect(() => {
        if (!loading && analytics) {
            initCharts();
        }
        return () => {
            if (chartsInitialized.current.activity) chartsInitialized.current.activity.destroy();
            if (chartsInitialized.current.success) chartsInitialized.current.success.destroy();
        };
    }, [loading, analytics]);

    const initCharts = () => {
        if (!activityChartRef.current || !successChartRef.current) return;

        // Cleanup existing charts
        if (chartsInitialized.current.activity) chartsInitialized.current.activity.destroy();
        if (chartsInitialized.current.success) chartsInitialized.current.success.destroy();

        // Activity Chart (Bar)
        const activityCtx = activityChartRef.current.getContext('2d');
        const labels = analytics.activity.map(d => d.date);
        const data = analytics.activity.map(d => d.count);

        chartsInitialized.current.activity = new window.Chart(activityCtx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Messages Sent',
                    data: data,
                    backgroundColor: '#3b82f6',
                    borderRadius: 4,
                    barThickness: 12
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
        const labels_doughnut = ['Delivered', 'Submitted', 'Delivering', 'Not Delivered', 'Failed'];
        const data_doughnut = [
            s.delivered || 0,
            s.submitted || 0,
            s.delivering || 0,
            s.not_delivered || 0,
            s.failed || 0
        ];
        const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#f97316', '#ef4444'];
        
        chartsInitialized.current.success = new window.Chart(successCtx, {
            type: 'doughnut',
            data: {
                labels: labels_doughnut,
                datasets: [{
                    data: data_doughnut,
                    backgroundColor: colors,
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
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Pulse Overview</h2>
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-midnight-900 p-1 rounded-lg">
                    ${['24h', '7d', '30d'].map(range => html`
                        <button 
                            key=${range}
                            onClick=${() => setDateRange(range)}
                            className="px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${dateRange === range ? 'bg-white dark:bg-midnight-800 text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}"
                        >
                            ${range}
                        </button>
                    `)}
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
                                    ${analytics.avg_delivery_time}s Avg
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

        </div>
    `;
};
