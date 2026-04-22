import { html, useState, useEffect } from '../utils/htm.js';
import { Card } from '../components/ui/Card.js';
import { Icon } from '../components/ui/Icon.js';
import apiClient from '../api/client.js';

const StatCard = ({ label, value, sub, icon, color, prefix }) => html`
    <${Card} className="p-5 flex items-start gap-4 group hover:shadow-lg transition-shadow duration-200">
        <div className="p-3 rounded-xl flex-shrink-0 ${color.bg}">
            <${Icon} name=${icon} size=${22} className=${color.icon} />
        </div>
        <div className="flex-1 min-w-0">
            <p class="text-[10px] font-black text-gray-400 dark:text-midnight-500 uppercase tracking-widest mb-1">${label}</p>
            <p class="text-2xl font-black text-gray-900 dark:text-white truncate">
                ${prefix || ''}${typeof value === 'number' ? value.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : value}
            </p>
            ${sub && html`<p class="text-[11px] text-gray-400 dark:text-midnight-500 mt-0.5">${sub}</p>`}
        </div>
    </${Card}>
`;

const PlatformStat = ({ label, value, icon }) => html`
    <div class="flex items-center justify-between p-3 bg-gray-50/70 dark:bg-midnight-900/50 rounded-xl border border-gray-100 dark:border-midnight-800">
        <div class="flex items-center gap-2.5">
            <${Icon} name=${icon} size=${15} class="text-gray-400 dark:text-midnight-500" />
            <span class="text-xs font-semibold text-gray-600 dark:text-midnight-300">${label}</span>
        </div>
        <span class="text-sm font-black text-gray-900 dark:text-white">${typeof value === 'number' ? value.toLocaleString() : value}</span>
    </div>
`;

export const AdminReportsPage = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchOverview = async () => {
            try {
                const res = await apiClient.get('/analytics/admin/overview');
                setData(res.data);
            } catch (err) {
                if (err.response?.status === 403) {
                    setError('Access denied. Superadmin privileges required.');
                } else {
                    setError('Failed to load admin reports. Please try again.');
                }
            } finally {
                setLoading(false);
            }
        };
        fetchOverview();
    }, []);

    if (loading) return html`
        <div class="flex items-center justify-center h-64">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
    `;

    if (error) return html`
        <div class="flex flex-col items-center justify-center h-64 text-center gap-3">
            <${Icon} name="shield-off" size=${48} class="text-red-400" />
            <p class="text-gray-600 dark:text-midnight-400 font-medium">${error}</p>
        </div>
    `;

    const { financials, platform, recent_topups } = data;
    const profitColor = financials.estimated_profit >= 0 ? 'text-emerald-500' : 'text-red-500';

    return html`
        <div class="space-y-6 fade-in">

            <!-- Financial Header -->
            <div class="flex items-center gap-3 px-1">
                <div class="p-2 rounded-xl bg-amber-50 dark:bg-amber-900/20">
                    <${Icon} name="bar-chart-2" size=${20} class="text-amber-500" />
                </div>
                <div>
                    <h2 class="text-sm font-black text-gray-900 dark:text-white">Business Overview</h2>
                    <p class="text-[11px] text-gray-400 dark:text-midnight-500">All-time financial snapshot. Superadmin only.</p>
                </div>
                <div class="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30">
                    <span class="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                    <span class="text-[9px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest">Live</span>
                </div>
            </div>

            <!-- Financial KPIs -->
            <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <${StatCard}
                    label="Total Revenue"
                    value=${financials.total_revenue}
                    prefix="GH₵ "
                    sub="All Paystack top-ups received"
                    icon="trending-up"
                    color=${{ bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon: 'text-emerald-600 dark:text-emerald-400' }}
                />
                <${StatCard}
                    label="Total Liability"
                    value=${financials.total_liability}
                    prefix="GH₵ "
                    sub="User credit balances owed"
                    icon="shield-alert"
                    color=${{ bg: 'bg-amber-50 dark:bg-amber-900/20', icon: 'text-amber-600 dark:text-amber-400' }}
                />
                <${StatCard}
                    label="Network Cost"
                    value=${financials.total_network_cost}
                    prefix="GH₵ "
                    sub="Paid to MNO gateways"
                    icon="zap"
                    color=${{ bg: 'bg-blue-50 dark:bg-blue-900/20', icon: 'text-blue-600 dark:text-blue-400' }}
                />
                <${Card} className="p-5 flex items-start gap-4 group hover:shadow-lg transition-shadow duration-200">
                    <div class="p-3 rounded-xl flex-shrink-0 bg-primary-50 dark:bg-primary-900/20">
                        <${Icon} name="dollar-sign" size=${22} class="text-primary-600 dark:text-primary-400" />
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-[10px] font-black text-gray-400 dark:text-midnight-500 uppercase tracking-widest mb-1">Est. Profit</p>
                        <p class="text-2xl font-black ${profitColor} truncate">
                            GH₵ ${Math.abs(financials.estimated_profit).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p class="text-[11px] text-gray-400 dark:text-midnight-500 mt-0.5">Revenue − Liability − Cost</p>
                    </div>
                </${Card}>
            </div>

            <!-- Platform Stats + Recent Topups -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">

                <!-- Platform Metrics -->
                <${Card} className="p-5">
                    <h3 class="text-[10px] font-black text-gray-400 dark:text-midnight-500 uppercase tracking-widest mb-4">Platform Metrics</h3>
                    <div class="space-y-2">
                        <${PlatformStat} label="Active Organizations" value=${platform.total_organizations} icon="building" />
                        <${PlatformStat} label="Total Messages Sent" value=${platform.total_messages} icon="send" />
                        <${PlatformStat} label="Delivered" value=${platform.delivered} icon="check-circle" />
                        <${PlatformStat} label="Failed" value=${platform.failed} icon="x-circle" />
                        <${PlatformStat} label="In-Flight / Pending" value=${platform.pending} icon="loader" />
                        <div class="mt-3 pt-3 border-t border-gray-100 dark:border-midnight-800">
                            <div class="flex justify-between text-xs font-medium text-gray-500">
                                <span>Delivery Rate</span>
                                <span class="font-black text-emerald-500">
                                    ${platform.total_messages > 0 ? ((platform.delivered / platform.total_messages) * 100).toFixed(1) : '0.0'}%
                                </span>
                            </div>
                            <div class="w-full h-1.5 bg-gray-100 dark:bg-midnight-800 rounded-full mt-1.5 overflow-hidden">
                                <div 
                                    class="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-700"
                                    style="width: ${platform.total_messages > 0 ? ((platform.delivered / platform.total_messages) * 100).toFixed(1) : 0}%"
                                ></div>
                            </div>
                        </div>
                    </div>
                </${Card}>

                <!-- Recent Top-Ups -->
                <${Card} className="p-5">
                    <h3 class="text-[10px] font-black text-gray-400 dark:text-midnight-500 uppercase tracking-widest mb-4">Recent Top-Ups</h3>
                    ${recent_topups.length === 0 ? html`
                        <div class="flex flex-col items-center justify-center py-10 text-gray-400 dark:text-midnight-500">
                            <${Icon} name="inbox" size=${36} class="mb-2" />
                            <p class="text-xs">No top-ups recorded yet</p>
                        </div>
                    ` : html`
                        <div class="space-y-2">
                            ${recent_topups.map((t, i) => html`
                                <div key=${t.id} class="flex items-center justify-between p-3 bg-gray-50/70 dark:bg-midnight-900/50 rounded-xl border border-gray-100 dark:border-midnight-800">
                                    <div class="flex items-center gap-2.5">
                                        <div class="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                                            <${Icon} name="arrow-down-left" size=${13} class="text-emerald-600 dark:text-emerald-400" />
                                        </div>
                                        <div>
                                            <p class="text-xs font-semibold text-gray-800 dark:text-midnight-100 leading-tight">${t.description}</p>
                                            <p class="text-[10px] text-gray-400 dark:text-midnight-500">${new Date(t.created_at).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                        </div>
                                    </div>
                                    <span class="text-sm font-black text-emerald-500">+GH₵${t.amount.toFixed(2)}</span>
                                </div>
                            `)}
                        </div>
                    `}
                </${Card}>
            </div>
        </div>
    `;
};
