import { html, useState, useEffect } from '../utils/htm.js';
import apiClient from '../api/client.js';
import { useToast } from '../contexts/ToastContext.js';
import { Button } from '../components/ui/Button.js';
import { Card } from '../components/ui/Card.js';
import { Icon } from '../components/ui/Icon.js';
import { Badge } from '../components/ui/Badge.js';
import { ConfirmModal } from '../components/ui/ConfirmModal.js';

export const MessagesPage = () => {
    const { showToast } = useToast();
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(0);
    const [total, setTotal] = useState(0);
    const [expandedId, setExpandedId] = useState(null);
    const [campaignStats, setCampaignStats] = useState({});
    const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null });
    const [deleteLoading, setDeleteLoading] = useState(false);
    
    const PAGE_SIZE = 10;

    useEffect(() => {
        fetchCampaigns();
    }, [filter, page]);

    // Handle search with debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            setPage(0); // Reset to first page on search
            fetchCampaigns();
        }, 400);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const fetchCampaigns = async () => {
        setLoading(true);
        try {
            const params = {
                limit: PAGE_SIZE,
                skip: page * PAGE_SIZE,
                status: filter !== 'all' ? filter : undefined,
                q: searchTerm || undefined
            };
            const response = await apiClient.get('/campaigns', { params });
            setCampaigns(response.data.items || []);
            setTotal(response.data.total || 0);
        } catch (error) {
            console.error('Failed to fetch campaigns:', error);
            showToast('Failed to load campaigns', 'error');
        } finally {
            setLoading(false);
        }
    };
    
    const totalPages = Math.ceil(total / PAGE_SIZE);

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

    const handleDeleteCampaign = async () => {
        const campaignId = confirmDelete.id;
        setDeleteLoading(true);
        try {
            await apiClient.delete(`/campaigns/${campaignId}`);
            showToast('Campaign history deleted', 'success');
            setConfirmDelete({ open: false, id: null });
            fetchCampaigns();
        } catch (error) {
            showToast('Delete failed: ' + (error.response?.data?.detail || 'Unknown error'), 'error');
        } finally {
            setDeleteLoading(false);
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

    const handleExport = async () => {
        try {
            // Use window.open for direct download if no complex auth headers needed, 
            // but since we use token in headers, we must use axios + blob
            const token = localStorage.getItem('nexra_token');
            const apiBase = window.__NEXRA_API_URL__ || 'https://nexra-api.onrender.com/api/v1';
            
            const response = await fetch(`${apiBase}/analytics/export/messages`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) throw new Error('Export failed');
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `nexra_messages_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            showToast('CSV report downloaded', 'success');
        } catch (error) {
            showToast('Export failed', 'error');
        }
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1 max-w-md relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <${Icon} name="search" size=${18} className="text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search campaigns..."
                        className="block w-full pl-10 pr-4 py-2.5 bg-white dark:bg-midnight-900 border border-gray-200 dark:border-midnight-800 rounded-2xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none"
                        value=${searchTerm}
                        onInput=${(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 no-scrollbar">
                    ${['all', 'delivering', 'delivered', 'failed'].map((f) => html`
                        <button
                            key=${f}
                            onClick=${() => { setFilter(f); setPage(0); }}
                            className="px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${filter === f ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20' : 'bg-white dark:bg-midnight-900 text-gray-500 hover:bg-gray-50 border border-gray-100 dark:border-midnight-800'}"
                        >
                            ${f === 'delivering' ? 'Delivering' : f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    `)}
                </div>
            </div>

            <div className="flex items-center justify-between bg-white dark:bg-midnight-900/40 p-4 rounded-2xl border border-gray-100 dark:border-midnight-800 shadow-sm mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg text-primary-600">
                        <${Icon} name="history" size=${20} />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-gray-900 dark:text-white">Message History</h2>
                        <p className="text-[11px] text-gray-500 font-medium">Tracking ${total} total campaigns</p>
                    </div>
                </div>
                <${Button} variant="outline" size="sm" onClick=${handleExport} className="hidden sm:flex items-center gap-2 border-none bg-gray-50 dark:bg-midnight-800 hover:bg-gray-100 transition-all">
                    <${Icon} name="download" size=${16} />
                    <span>Export CSV</span>
                </${Button}>
            </div>

            <div className="campaign-history-container">
                ${campaigns.length === 0 ? html`
                    <${Card} className="p-16 text-center border-dashed">
                        <div className="w-16 h-16 bg-gray-50 dark:bg-midnight-900 rounded-full flex items-center justify-center mx-auto mb-4">
                            <${Icon} name="search-x" size=${32} className="text-gray-300" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No campaigns found</h3>
                        <p className="text-sm text-gray-500 max-w-xs mx-auto">We couldn't find any message history matching your current filters or search term.</p>
                        <${Button} variant="ghost" className="mt-6 text-primary-600" onClick=${() => {setFilter('all'); setSearchTerm('');}}>Clear all filters</${Button}>
                    </${Card}>
                ` : html`
                    <div className="space-y-4">
                        <${Card} className="overflow-hidden border-none shadow-premium bg-white dark:bg-midnight-900/40">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50/50 dark:bg-midnight-900/80 border-b border-gray-100 dark:border-midnight-800">
                                        <tr>
                                            <th className="w-12 px-6 py-4"></th>
                                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Campaign</th>
                                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sender</th>
                                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date</th>
                                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right px-8">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 dark:divide-midnight-800">
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
                                                    className=${`hover:bg-gray-50/50 dark:hover:bg-midnight-800/30 cursor-pointer transition-all ${isExpanded ? 'bg-primary-50/20 dark:bg-primary-900/10' : ''}`}
                                                >
                                                    <td className="px-6 py-5">
                                                        <div className=${`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isExpanded ? 'bg-primary-100 text-primary-600 rotate-180' : 'bg-gray-100 text-gray-400'}`}>
                                                            <${Icon} name="chevron-down" size=${16} />
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <p className="text-sm font-bold text-gray-900 dark:text-white">${campaign.name}</p>
                                                        <p className="text-[10px] text-gray-400 font-medium uppercase mt-0.5">${campaign.total_recipients || 0} Recipients</p>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <span className="text-xs font-mono font-bold text-gray-600 dark:text-midnight-300 bg-gray-100 dark:bg-midnight-800 px-2 py-1 rounded-md">${campaign.sender}</span>
                                                    </td>
                                                    <td className="px-6 py-5">${getStatusBadge(campaign.status)}</td>
                                                    <td className="px-6 py-5 text-sm text-gray-500">${new Date(campaign.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                                                    <td className="px-6 py-5 text-right px-8" onClick=${(e) => e.stopPropagation()}>
                                                        <div className="flex justify-end gap-2">
                                                            <${Button} 
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick=${() => window.location.hash = `#/campaigns/create?edit=${campaign.id}`} 
                                                                className="h-8 w-8 !p-0 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                                                                title="View Details"
                                                            >
                                                                <${Icon} name="eye" size=${16} />
                                                            </${Button}>
                                                            <${Button} 
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick=${() => setConfirmDelete({ open: true, id: campaign.id })} 
                                                                className="h-8 w-8 !p-0 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                                                                title="Delete History"
                                                            >
                                                                <${Icon} name="trash-2" size=${16} />
                                                            </${Button}>
                                                        </div>
                                                    </td>
                                                </tr>
                                                ${isExpanded && html`
                                                    <tr className="bg-gray-50/30 dark:bg-midnight-900/20 border-l-4 border-primary-500">
                                                        <td colSpan="6" className="px-6 sm:px-16 py-8">
                                                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-top-2 duration-300">
                                                                <div className="lg:col-span-2 space-y-4">
                                                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Message Content</h4>
                                                                    <div className="bg-white dark:bg-midnight-900 p-5 rounded-2xl border border-gray-100 dark:border-midnight-800 shadow-sm text-sm leading-relaxed text-gray-700 dark:text-midnight-200 whitespace-pre-wrap font-medium">
                                                                        ${campaign.template}
                                                                    </div>
                                                                </div>
                                                                
                                                                <div className="space-y-4">
                                                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Delivery Breakdown</h4>
                                                                    <div className="bg-white dark:bg-midnight-900 p-5 rounded-2xl border border-gray-100 dark:border-midnight-800 shadow-sm space-y-4">
                                                                        ${stats ? html`
                                                                            <div className="flex items-center justify-between">
                                                                                <span className="text-xs text-gray-500">Delivered</span>
                                                                                <span className="text-sm font-black text-emerald-500">${stats.delivered}</span>
                                                                            </div>
                                                                            <div className="w-full bg-gray-100 dark:bg-midnight-800 h-1.5 rounded-full overflow-hidden">
                                                                                <div className="bg-emerald-500 h-full rounded-full" style=${{ width: `${(stats.delivered / stats.total) * 100}%` }}></div>
                                                                            </div>
                                                                            <div className="grid grid-cols-2 gap-3 pt-2">
                                                                                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20">
                                                                                    <p className="text-[9px] text-blue-400 font-bold uppercase">Sent</p>
                                                                                    <p className="text-sm font-black text-blue-600">${stats.sent}</p>
                                                                                </div>
                                                                                <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/20">
                                                                                    <p className="text-[9px] text-rose-400 font-bold uppercase">Failed</p>
                                                                                    <p className="text-sm font-black text-rose-600">${stats.failed}</p>
                                                                                </div>
                                                                            </div>
                                                                            ${stats.failed > 0 && html`
                                                                                <${Button} 
                                                                                    variant="outline" 
                                                                                    size="sm" 
                                                                                    className="w-full mt-2 text-[10px] font-bold"
                                                                                    onClick=${() => handleBatchRetry(campaign.id)}
                                                                                >
                                                                                    <${Icon} name="refresh-cw" size=${12} />
                                                                                    Retry Failed
                                                                                </${Button}>
                                                                            `}
                                                                        ` : html`<div className="animate-pulse h-20 bg-gray-50 dark:bg-midnight-800 rounded-xl"></div>`}
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

                        <!-- Pagination Controls -->
                        ${totalPages > 1 && html`
                            <div className="flex items-center justify-between py-4">
                                <p className="text-xs text-gray-500">
                                    Showing <span className="font-bold text-gray-900 dark:text-white">${page * PAGE_SIZE + 1}</span> to <span className="font-bold text-gray-900 dark:text-white">${Math.min((page + 1) * PAGE_SIZE, total)}</span> of ${total} campaigns
                                </p>
                                <div className="flex items-center gap-2">
                                    <${Button} 
                                        variant="outline" 
                                        size="sm" 
                                        onClick=${() => setPage(p => Math.max(0, p - 1))}
                                        disabled=${page === 0}
                                        className="rounded-xl"
                                    >
                                        <${Icon} name="chevron-left" size=${16} />
                                    </${Button}>
                                    <div className="flex items-center gap-1">
                                        ${[...Array(totalPages)].map((_, i) => html`
                                            <button 
                                                onClick=${() => setPage(i)}
                                                className=${`w-8 h-8 text-xs font-bold rounded-lg transition-all ${page === i ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20' : 'text-gray-400 hover:bg-gray-100'}`}
                                            >
                                                ${i + 1}
                                            </button>
                                        `)}
                                    </div>
                                    <${Button} 
                                        variant="outline" 
                                        size="sm" 
                                        onClick=${() => setPage(p => Math.min(totalPages - 1, p + 1))}
                                        disabled=${page >= totalPages - 1}
                                        className="rounded-xl"
                                    >
                                        <${Icon} name="chevron-right" size=${16} />
                                    </${Button}>
                                </div>
                            </div>
                        `}
                    </div>
                `}
            </div>
            <${ConfirmModal} 
                isOpen=${confirmDelete.open}
                onClose=${() => setConfirmDelete({ open: false, id: null })}
                onConfirm=${handleDeleteCampaign}
                loading=${deleteLoading}
                title="Delete Campaign?"
                message="This will permanently remove this campaign from your history. This action cannot be undone."
                confirmText="Delete History"
                variant="danger"
            />
        </div>
    `;
};
