import { html, useState, useEffect, useRef, useMemo, useCallback } from '../utils/htm.js';
import apiClient from '../api/client.js';
import { useToast, useAuth } from '../context/index.js';
import { Icon, Button, Badge, Card, Modal, Skeleton, TrendChart } from '../components/ui/index.js';

export const BusinessOverviewPage = () => {
    const { showToast } = useToast();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState({ label: 'All Time', start: null, end: null });

    useEffect(() => {
        setLoading(true);
        let url = '/analytics/admin/overview';
        if (dateRange.start && dateRange.end) {
            url += `?start_date=${encodeURIComponent(dateRange.start)}&end_date=${encodeURIComponent(dateRange.end)}`;
        }
        apiClient.get(url)
            .then(res => { setData(res.data); setLoading(false); })
            .catch(() => {
                showToast('Failed to load financial data', 'error');
                setLoading(false);
            });
    }, [dateRange]);

    if (loading) return html`
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 text-sm gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
            Loading platform financials...
        </div>
    `;

    if (!data) return html`<div className="p-12 text-center text-gray-500">No overview data available.</div>`;
    
    const { financials, platform, recent_topups, trends } = data;
    const deliveryRate = platform.total_messages > 0
        ? ((platform.delivered / platform.total_messages) * 100).toFixed(1)
        : '0.0';

    return html`
        <div className="space-y-6 fade-in max-w-6xl mx-auto pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold dark:text-white">Business Overview</h2>
                    <p className="text-sm text-gray-500 dark:text-midnight-400 mt-1 mb-6">Real-time platform financial health and message volume.</p>
                </div>
                <div className="flex items-center gap-4">
                    <${DateFilterDropdown} currentRange=${dateRange} onChange=${setDateRange} />
                </div>
            </div>

            <${SystemHealthWidget} />

            <!-- Trend Charts -->
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <${TrendChart} data=${trends} dataKey="revenue" label="Daily Revenue" color="emerald" prefix="GH₵ " />
                <${TrendChart} data=${trends} dataKey="sms_count" label="Daily SMS Traffic" color="blue" />
            </div>

            <!-- KPI Cards -->
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <${AdminStatCard}
                    label="Total Revenue" value=${financials.total_revenue} prefix="GH₵ "
                    sub="All-time user top-ups" icon="trending-up"
                    colorBg="bg-emerald-50 dark:bg-emerald-900/20" colorIcon="text-emerald-600 dark:text-emerald-400"
                />
                <${AdminStatCard}
                    label="User Liability" value=${financials.total_liability} prefix="GH₵ "
                    sub="Current wallet balances" icon="shield-alert"
                    colorBg="bg-amber-50 dark:bg-amber-900/20" colorIcon="text-amber-600 dark:text-amber-400"
                />
                <${AdminStatCard}
                    label="Network Cost" value=${financials.total_network_cost} prefix="GH₵ "
                    sub="Estimated provider costs" icon="activity"
                    colorBg="bg-rose-50 dark:bg-rose-900/20" colorIcon="text-rose-600 dark:text-rose-400"
                />
                <${AdminStatCard}
                    label="Est. Net Profit" value=${financials.estimated_profit} prefix="GH₵ "
                    sub="Revenue minus costs" icon="briefcase"
                    colorBg="bg-blue-50 dark:bg-blue-900/20" colorIcon="text-blue-600 dark:text-blue-400"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <${Card} className="p-6">
                        <h3 className="text-xs font-black text-gray-400 dark:text-midnight-500 uppercase tracking-widest mb-4">Platform Performance</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <${PlatformRow} label="Total Organizations" value=${platform.total_organizations} icon="building" />
                            <${PlatformRow} label="Total Messages" value=${platform.total_messages} icon="send" />
                            <${PlatformRow} label="Delivered" value=${platform.delivered} icon="check-circle" />
                            <${PlatformRow} label="Failed" value=${platform.failed} icon="x-circle" />
                        </div>
                        
                        <div className="mt-6 pt-6 border-t border-gray-100 dark:border-midnight-800">
                            <div className="flex justify-between text-xs font-bold text-gray-500 mb-2">
                                <span>Global Delivery Rate</span>
                                <span className="text-emerald-500 font-black">${deliveryRate}%</span>
                            </div>
                            <div className="w-full h-2 bg-gray-100 dark:bg-midnight-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-1000"
                                    style=${{ width: `${deliveryRate}%` }}
                                ></div>
                            </div>
                        </div>
                    </${Card}>

                    <${Card} className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-black text-gray-400 dark:text-midnight-500 uppercase tracking-widest">Recent Top-Ups</h3>
                            <span className="text-[10px] font-bold text-gray-300">Live feed</span>
                        </div>
                        ${recent_topups.length === 0 ? html`
                            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                                <${Icon} name="inbox" size=${48} className="mb-3 opacity-20" />
                                <p className="text-xs font-medium uppercase tracking-widest">No recent transactions</p>
                            </div>
                        ` : html`
                            <div className="space-y-3">
                                ${recent_topups.map(t => html`
                                    <div key=${t.id} className="flex items-center justify-between p-4 bg-gray-50/50 dark:bg-midnight-900/30 rounded-2xl border border-gray-100 dark:border-midnight-800/50">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center">
                                                <${Icon} name="arrow-down-left" size=${16} className="text-emerald-600 dark:text-emerald-400" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">${t.description}</p>
                                                <p className="text-[10px] text-gray-400 dark:text-midnight-500 mt-0.5">${new Date(t.created_at).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                            </div>
                                        </div>
                                        <span className="text-sm font-black text-emerald-500">+GH₵${t.amount.toFixed(2)}</span>
                                    </div>
                                `)}
                            </div>
                        `}
                    </${Card}>
                </div>

                <div className="space-y-6">
                    <${Card} className="p-6">
                        <h3 className="text-xs font-black text-gray-400 dark:text-midnight-500 uppercase tracking-widest mb-6">Wallet Distribution</h3>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-primary-500"></div>
                                        <span className="text-xs text-gray-500 font-bold uppercase tracking-tighter">PAYG Credits</span>
                                    </div>
                                    <span className="text-sm font-black dark:text-white">GH₵ ${financials.distribution?.payg.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                                        <span className="text-xs text-gray-500 font-bold uppercase tracking-tighter">Subscription</span>
                                    </div>
                                    <span className="text-sm font-black dark:text-white">GH₵ ${financials.distribution?.subscription.toLocaleString()}</span>
                                </div>
                            </div>
                            
                            <div className="flex h-4 w-full bg-gray-100 dark:bg-midnight-800 rounded-full overflow-hidden shadow-inner">
                                ${(() => {
                                    const total = financials.distribution?.payg + financials.distribution?.subscription || 1;
                                    const paygPerc = (financials.distribution?.payg / total) * 100;
                                    return html`
                                        <div className="h-full bg-primary-500 shadow-lg shadow-primary-500/20" style=${{ width: `${paygPerc}%` }}></div>
                                        <div className="h-full bg-amber-500 shadow-lg shadow-amber-500/20" style=${{ width: `${100 - paygPerc}%` }}></div>
                                    `;
                                })()}
                            </div>
                            
                            <div className="p-4 bg-primary-50 dark:bg-primary-900/10 rounded-2xl border border-primary-100 dark:border-primary-900/20 mt-4">
                                <p className="text-[10px] text-primary-700 dark:text-primary-400 font-bold uppercase tracking-widest">Revenue Impact</p>
                                <p className="text-xs text-primary-600/80 dark:text-primary-400/60 mt-1">PAYG accounts for <span className="font-bold text-primary-700 dark:text-primary-300">${((financials.distribution?.payg / (financials.distribution?.payg + financials.distribution?.subscription || 1)) * 100).toFixed(0)}%</span> of current platform liability.</p>
                            </div>
                        </div>
                    </${Card}>
                </div>
            </div>
        </div>
    `;
};