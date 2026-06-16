import { html, useState, useEffect } from '../utils/htm.js';
import { Card } from '../components/ui/Card.js';
import { Icon } from '../components/ui/Icon.js';
import apiClient from '../api/client.js';

const AdminStatCard = ({ label, value, sub, icon, colorBg, colorIcon, prefix }) => html`
    <${Card} className="p-5 flex items-start gap-4 hover:shadow-lg transition-shadow duration-200">
        <div className="p-3 rounded-xl flex-shrink-0 ${colorBg}">
            <${Icon} name=${icon} size=${22} className=${colorIcon} />
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black text-gray-400 dark:text-midnight-500 uppercase tracking-widest mb-1">${label}</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white truncate">
                ${prefix || ''}${typeof value === 'number' ? value.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : value}
            </p>
            ${sub && html`<p className="text-[11px] text-gray-400 dark:text-midnight-500 mt-0.5">${sub}</p>`}
        </div>
    </${Card}>
`;

const PlatformRow = ({ label, value, icon }) => html`
    <div className="flex items-center justify-between p-3 bg-gray-50/70 dark:bg-midnight-900/50 rounded-xl border border-gray-100 dark:border-midnight-800">
        <div className="flex items-center gap-2.5">
            <${Icon} name=${icon} size=${15} className="text-gray-400 dark:text-midnight-500" />
            <span className="text-xs font-semibold text-gray-600 dark:text-midnight-300">${label}</span>
        </div>
        <span className="text-sm font-black text-gray-900 dark:text-white">${typeof value === 'number' ? value.toLocaleString() : value}</span>
    </div>
`;

export const AdminReportsPage = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiClient.get('/analytics/admin/overview')
            .then(res => { setData(res.data); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    if (loading) return html`
        <div className="flex items-center gap-2 py-4 text-gray-400 text-xs">
            <div className="animate-spin rounded-full h-3 w-3 border-2 border-amber-500 border-t-transparent"></div>
            Loading business overview...
        </div>
    `;

    if (!data) return null;

    const { financials, platform, recent_topups } = data;
    const profitColor = financials.estimated_profit >= 0 ? 'text-emerald-500' : 'text-red-500';
    const deliveryRate = platform.total_messages > 0
        ? ((platform.delivered / platform.total_messages) * 100).toFixed(1)
        : '0.0';

    return html`
        <div className="space-y-4 fade-in">

            <!-- Admin Header -->
            <div className="flex items-center gap-3 px-1">
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-900/20">
                    <${Icon} name="bar-chart-2" size=${18} className="text-amber-500" />
                </div>
                <div>
                    <h3 className="text-sm font-black text-gray-900 dark:text-white">Business Overview</h3>
                    <p className="text-[11px] text-gray-400 dark:text-midnight-500">Platform-wide financial snapshot</p>
                </div>
                <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                    <span className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">Superadmin</span>
                </div>
            </div>

            <!-- KPI Cards -->
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                <${AdminStatCard}
                    label="Total Revenue" value=${financials.total_revenue} prefix="GH₵ "
                    sub="All Paystack top-ups" icon="trending-up"
                    colorBg="bg-emerald-50 dark:bg-emerald-900/20" colorIcon="text-emerald-600 dark:text-emerald-400"
                />
                <${AdminStatCard}
                    label="Total Liability" value=${financials.total_liability} prefix="GH₵ "
                    sub="User credit balances" icon="shield-alert"
                    colorBg="bg-amber-50 dark:bg-amber-900/20" colorIcon="text-amber-600 dark:text-amber-400"
                />
                <${AdminStatCard}
                    label="Network Cost" value=${financials.total_network_cost} prefix="GH₵ "
                    sub="Paid to gateways" icon="zap"
                    colorBg="bg-blue-50 dark:bg-blue-900/20" colorIcon="text-blue-600 dark:text-blue-400"
                />
                <${Card} className="p-5 flex items-start gap-4 hover:shadow-lg transition-shadow duration-200">
                    <div className="p-3 rounded-xl flex-shrink-0 bg-primary-50 dark:bg-primary-900/20">
                        <${Icon} name="dollar-sign" size=${22} className="text-primary-600 dark:text-primary-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black text-gray-400 dark:text-midnight-500 uppercase tracking-widest mb-1">Est. Profit</p>
                        <p className="text-2xl font-black ${profitColor} truncate">
                            GH₵ ${Math.abs(financials.estimated_profit).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p className="text-[11px] text-gray-400 dark:text-midnight-500 mt-0.5">Revenue − Liability − Cost</p>
                    </div>
                </${Card}>
            </div>

            <!-- Platform Stats + Recent Topups -->
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <${Card} className="p-5">
                    <h3 className="text-[10px] font-black text-gray-400 dark:text-midnight-500 uppercase tracking-widest mb-3">Platform Metrics</h3>
                    <div className="space-y-2">
                        <${PlatformRow} label="Active Organizations" value=${platform.total_organizations} icon="building" />
                        <${PlatformRow} label="Total Messages" value=${platform.total_messages} icon="send" />
                        <${PlatformRow} label="Delivered" value=${platform.delivered} icon="check-circle" />
                        <${PlatformRow} label="Failed" value=${platform.failed} icon="x-circle" />
                        <${PlatformRow} label="Refunded" value=${platform.refunded || 0} icon="refresh-cw" />
                        <${PlatformRow} label="Pending / In-Flight" value=${platform.pending} icon="loader" />
                        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-midnight-800">
                            <div className="flex justify-between text-xs font-medium text-gray-500 mb-1.5">
                                <span>Delivery Rate</span>
                                <span className="font-black text-emerald-500">${deliveryRate}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-100 dark:bg-midnight-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-700"
                                    style=${{ width: `${deliveryRate}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                </${Card}>

                <${Card} className="p-5">
                    <h3 className="text-[10px] font-black text-gray-400 dark:text-midnight-500 uppercase tracking-widest mb-3">Recent Top-Ups</h3>
                    ${recent_topups.length === 0 ? html`
                        <div className="flex flex-col items-center justify-center py-8 text-gray-400 dark:text-midnight-500">
                            <${Icon} name="inbox" size=${32} className="mb-2" />
                            <p className="text-xs">No top-ups yet</p>
                        </div>
                    ` : html`
                        <div className="space-y-2">
                            ${recent_topups.map(t => html`
                                <div key=${t.id} className="flex items-center justify-between p-3 bg-gray-50/70 dark:bg-midnight-900/50 rounded-xl border border-gray-100 dark:border-midnight-800">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                                            <${Icon} name="arrow-down-left" size=${13} className="text-emerald-600 dark:text-emerald-400" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-gray-800 dark:text-midnight-100 leading-tight">${t.description}</p>
                                            <p className="text-[10px] text-gray-400 dark:text-midnight-500">${new Date(t.created_at).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                        </div>
                                    </div>
                                    <span className="text-sm font-black text-emerald-500">+GH₵${t.amount.toFixed(2)}</span>
                                </div>
                            `)}
                        </div>
                    `}
                </${Card}>
            </div>
        </div>
    `;
};
