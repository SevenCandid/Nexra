import { html, useState, useEffect } from '../utils/htm.js';
import apiClient from '../api/client.js';
import { useToast } from '../contexts/ToastContext.js';
import { Button } from '../components/ui/Button.js';
import { Card } from '../components/ui/Card.js';
import { Icon } from '../components/ui/Icon.js';
import { Badge } from '../components/ui/Badge.js';

export const MessagesPage = () => {
    const { showToast } = useToast();
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [expandedId, setExpandedId] = useState(null);
    const [campaignStats, setCampaignStats] = useState({});

    useEffect(() => {
        fetchCampaigns();
    }, [filter]);

    const fetchCampaigns = async () => {
        try {
            const statusMap = {
                'delivering': 'delivering',
                'delivered': 'delivered',
                'failed': 'failed'
            };
            const params = filter !== 'all' ? { status: statusMap[filter] } : {};
            const response = await apiClient.get('/campaigns', { params });
            setCampaigns(response.data.items || []);
        } catch (error) {
            console.error('Failed to fetch campaigns:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCampaignStats = async (campaignId) => {
        if (campaignStats[campaignId]) return;
        try {
            const response = await apiClient.get(`/campaigns/${campaignId}/stats`);
            setCampaignStats(prev => ({ ...prev, [campaignId]: response.data }));
        } catch (error) {
            console.error('Failed to fetch campaign stats:', error);
        }
    };

    const handleBatchRetry = async (campaignId) => {
        try {
            await apiClient.post(`/campaigns/${campaignId}/retry`);
            showToast('All failed messages have been re-enqueued', 'success');
            if (expandedId === campaignId) {
                const response = await apiClient.get(`/campaigns/${campaignId}/stats`);
                setCampaignStats(prev => ({ ...prev, [campaignId]: response.data }));
            }
        } catch (error) {
            showToast('Retry failed: ' + (error.response?.data?.detail || 'Unknown error'), 'error');
        }
    };

    const handleDeleteCampaign = async (campaignId) => {
        try {
            await apiClient.delete(`/campaigns/${campaignId}`);
            showToast('Campaign history deleted', 'success');
            fetchCampaigns();
        } catch (error) {
            showToast('Delete failed: ' + (error.response?.data?.detail || 'Unknown error'), 'error');
        }
    };

    const getStatusBadge = (status) => {
        const variants = {
            delivering: 'info',
            processing: 'warning',
            sent: 'info',
            completed: 'success',
            delivered: 'success',
            failed: 'danger',
        };
        
        let label = status;
        if (status === 'sent' || status === 'completed') label = 'Completed';
        if (status === 'delivering' || status === 'processing' || status === 'pending') label = 'Delivering';
        
        return html`<${Badge} variant=${variants[status] || 'default'}>${label.charAt(0).toUpperCase() + label.slice(1)}</${Badge}>`;
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

            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
                ${['all', 'delivering', 'delivered', 'failed'].map((f) => html`
                    <button
                        key=${f}
                        onClick=${() => setFilter(f)}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${filter === f ? 'bg-primary-600 text-white shadow-sm' : 'bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-100/50'}"
                    >
                        ${f === 'delivering' ? 'Delivering' : f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                `)}
            </div>

            <div className="campaign-history-container">
                ${campaigns.length === 0 ? html`
                    <${Card} className="p-12 text-center">
                        <${Icon} name="history" size=${64} className="mx-auto mb-4 text-gray-400 dark:text-midnight-600" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No history found</h3>
                        <p className="text-gray-600 dark:text-midnight-400">Your sent campaigns will appear here</p>
                    </${Card}>
                ` : html`
                    <${Card} className="overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-midnight-900/80 border-b border-gray-200 dark:border-midnight-800">
                                    <tr>
                                        <th className="w-10 px-4 py-3"></th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-midnight-300">Campaign Name</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-midnight-300">Sender</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-midnight-300">Status</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-midnight-300 whitespace-nowrap">Date</th>
                                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-midnight-300">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    ${campaigns.map((campaign) => {
                                        const isExpanded = expandedId === campaign.id;
                                        const stats = campaignStats[campaign.id];
                                        
                                        const handleExpand = () => {
                                            if (!isExpanded) fetchCampaignStats(campaign.id);
                                            setExpandedId(isExpanded ? null : campaign.id);
                                        };

                                        return html`
                                            <tr key=${campaign.id} 
                                                onClick=${handleExpand}
                                                className=${`hover:bg-gray-50 cursor-pointer transition-colors ${isExpanded ? 'bg-primary-50/30' : ''}`}
                                            >
                                                <td className="px-4 py-3">
                                                    <${Icon} 
                                                        name="chevron-down" 
                                                        size=${16} 
                                                        className=${`text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-primary-600' : ''}`} 
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-sm font-bold text-gray-900">${campaign.name}</td>
                                                <td className="px-4 py-3 text-sm text-gray-600">${campaign.sender}</td>
                                                <td className="px-4 py-3 text-sm">${getStatusBadge(campaign.status)}</td>
                                                <td className="px-4 py-3 text-sm text-gray-600">${new Date(campaign.created_at).toLocaleDateString()}</td>
                                                <td className="px-4 py-3 text-right" onClick=${(e) => e.stopPropagation()}>
                                                    <div className="flex justify-end gap-2">
                                                        <${Button} 
                                                            variant="outline"
                                                            size="sm"
                                                            onClick=${() => window.location.hash = `#/campaigns/create?edit=${campaign.id}`} 
                                                            className="text-gray-600 dark:text-midnight-400 hover:text-primary-600 dark:hover:text-primary-400 p-1 border-none shadow-none"
                                                            title="Edit/View Campaign"
                                                        >
                                                            <${Icon} name="edit" size=${16} />
                                                        </${Button}>
                                                        ${(campaign.status === 'failed' || (stats && stats.failed > 0)) && html`
                                                            <${Button} 
                                                                variant="outline"
                                                                size="sm"
                                                                onClick=${() => handleBatchRetry(campaign.id)} 
                                                                className="text-primary-600 dark:text-primary-400 p-1 border-none shadow-none"
                                                                title="Retry Failed Messages"
                                                            >
                                                                <${Icon} name="refresh-cw" size=${16} />
                                                            </${Button}>
                                                        `}
                                                        <${Button} 
                                                            variant="outline"
                                                            size="sm"
                                                            onClick=${() => { if(confirm('Delete this campaign history?')) handleDeleteCampaign(campaign.id) }} 
                                                            className="text-red-500 hover:text-red-700 p-1 border-none shadow-none"
                                                            title="Delete History"
                                                        >
                                                            <${Icon} name="trash-2" size=${16} />
                                                        </${Button}>
                                                    </div>
                                                </td>
                                            </tr>
                                            ${isExpanded && html`
                                                <tr className="bg-gray-50/50 dark:bg-midnight-900/30">
                                                    <td colSpan="6" className="px-4 sm:px-12 py-6">
                                                        <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-200">
                                                            <div>
                                                                <p className="text-[10px] font-bold text-gray-400 dark:text-midnight-500 uppercase tracking-widest mb-1.5">Message Template</p>
                                                                <p className="text-sm text-gray-800 dark:text-midnight-100 leading-relaxed bg-white dark:bg-midnight-900 p-4 rounded-xl border border-gray-100 dark:border-midnight-800 shadow-sm whitespace-pre-wrap">${campaign.template}</p>
                                                            </div>
                                                            
                                                            <div>
                                                                <p className="text-[10px] font-bold text-gray-400 dark:text-midnight-500 uppercase tracking-widest mb-3">Delivery Statistics</p>
                                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                                                                    ${stats ? html`
                                                                        <div className="bg-white dark:bg-midnight-900 p-3 rounded-xl border border-gray-100 dark:border-midnight-800 shadow-sm">
                                                                            <p className="text-[10px] font-bold text-gray-400 dark:text-midnight-500 uppercase tracking-widest mb-1">Delivered</p>
                                                                            <p className="text-lg font-black text-emerald-500">${stats.delivered}</p>
                                                                        </div>
                                                                        <div className="bg-white dark:bg-midnight-900 p-3 rounded-xl border border-gray-100 dark:border-midnight-800 shadow-sm">
                                                                            <p className="text-[10px] font-bold text-gray-400 dark:text-midnight-500 uppercase tracking-widest mb-1">Completed</p>
                                                                            <p className="text-lg font-black text-blue-500">${stats.sent || 0}</p>
                                                                        </div>
                                                                        <div className="bg-white dark:bg-midnight-900 p-3 rounded-xl border border-gray-100 dark:border-midnight-800 shadow-sm">
                                                                            <p className="text-[10px] font-bold text-gray-400 dark:text-midnight-500 uppercase tracking-widest mb-1">Failed</p>
                                                                            <p className="text-lg font-black text-rose-500">${stats.failed}</p>
                                                                        </div>
                                                                        <div className="bg-white dark:bg-midnight-900 p-3 rounded-xl border border-gray-100 dark:border-midnight-800 shadow-sm">
                                                                            <p className="text-[10px] font-bold text-gray-400 dark:text-midnight-500 uppercase tracking-widest mb-1">Delivering</p>
                                                                            <p className="text-lg font-black text-amber-500">${stats.pending + (stats.processing || 0)}</p>
                                                                        </div>
                                                                    ` : html`
                                                                        <div className="col-span-4 py-4 flex items-center gap-2 text-gray-400 dark:text-midnight-500 text-xs">
                                                                            <div className="animate-spin rounded-full h-3 w-3 border-2 border-primary-600 border-t-transparent"></div>
                                                                            Loading stats...
                                                                        </div>
                                                                    `}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            `}
                                        `;
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </${Card}>
                `}
            </div>
        </div>
    `;
};
