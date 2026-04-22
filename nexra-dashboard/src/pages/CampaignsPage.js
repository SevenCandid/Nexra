import { html, useState, useEffect } from '../utils/htm.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';
import { Icon } from '../components/ui/Icon.js';
import { useToast } from '../contexts/ToastContext.js';
import apiClient from '../api/client.js';

export const CampaignsPage = () => {
    const { showToast } = useToast();
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCampaigns();
    }, []);

    const fetchCampaigns = async () => {
        try {
            const response = await apiClient.get('/campaigns');
            setCampaigns(response.data.items || []);
        } catch (error) {
            console.error('Failed to fetch campaigns:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleBatchRetry = async (campaignId) => {
        try {
            await apiClient.post(`/campaigns/${campaignId}/retry`);
            showToast('All failed messages have been re-enqueued', 'success');
            fetchCampaigns();
        } catch (error) {
            showToast('Retry failed: ' + (error.response?.data?.detail || 'Unknown error'), 'error');
        }
    };

    const handleBroadcast = async (campaignId) => {
        try {
            await apiClient.post(`/campaigns/${campaignId}/broadcast`);
            showToast('Broadcast started successfully!', 'success');
            fetchCampaigns();
        } catch (error) {
            showToast('Broadcast failed: ' + (error.response?.data?.detail || 'Unknown error'), 'error');
        }
    };

    const handleDeleteCampaign = async (campaignId) => {
        if (!confirm('Are you sure you want to delete this campaign?')) return;
        try {
            await apiClient.delete(`/campaigns/${campaignId}`);
            showToast('Campaign deleted', 'success');
            fetchCampaigns();
        } catch (error) {
            showToast('Delete failed: ' + (error.response?.data?.detail || 'Unknown error'), 'error');
        }
    };

    if (loading) {
        return html`<div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>`;
    }

    return html`
        <div className="space-y-6 fade-in">
            <div className="flex items-center justify-end">
                <${Button} onClick=${() => window.location.href = '#/campaigns/create'}>
                    <${Icon} name="plus" size=${20} className="inline mr-2" />
                    <span className="hidden sm:inline">New Campaign</span>
                </${Button}>
            </div>

            ${campaigns.length === 0 ? html`
                <${Card} className="p-12 text-center">
                    <${Icon} name="inbox" size=${64} className="mx-auto mb-4 text-gray-400 dark:text-midnight-600" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No campaigns yet</h3>
                    <p className="text-gray-600 dark:text-midnight-400 mb-6">Create your first campaign to get started</p>
                    <${Button} onClick=${() => window.location.href = '#/campaigns/create'}>
                        Create Campaign
                    </${Button}>
                </${Card}>
            ` : html`
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    ${campaigns.map((campaign) => html`
                        <${Card} key=${campaign.id} className="p-5 hover:shadow-lg transition-all group">
                            <div className="flex items-start justify-between mb-4">
                                <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">${campaign.name}</h3>
                                <${Badge} variant=${
                                    campaign.status === 'completed' || campaign.status === 'delivered' ? 'success' : 
                                    campaign.status === 'failed' ? 'danger' :
                                    campaign.status === 'sending' || campaign.status === 'delivering' ? 'info' :
                                    campaign.status === 'scheduled' ? 'warning' : 'info'
                                }>
                                    ${campaign.status === 'completed' ? 'Delivered' : 
                                      campaign.status === 'delivering' ? 'Delivering' : 
                                      campaign.status === 'sending' ? 'Sending' :
                                      campaign.status === 'failed' ? 'Failed' :
                                      campaign.status}
                                </${Badge}>
                            </div>
                            <p className="text-sm text-gray-600 mb-4 line-clamp-2">${campaign.template}</p>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500">${new Date(campaign.created_at).toLocaleDateString()}</span>
                                <div className="flex gap-3 items-center">
                                    ${['draft', 'scheduled'].includes(campaign.status) && html`
                                        <${Button} 
                                            size="sm"
                                            onClick=${() => handleBroadcast(campaign.id)} 
                                            className="px-3"
                                            disabled=${campaign.status === 'scheduled'}
                                            title=${campaign.status === 'scheduled' ? 'This campaign is scheduled for automatic broadcast' : 'Broadcast Now'}
                                        >
                                            Broadcast
                                        </${Button}>
                                    `}
                                    ${campaign.status !== 'completed' && html`
                                        <button 
                                            onClick=${() => window.location.hash = `#/campaigns/create?edit=${campaign.id}`} 
                                            className="text-primary-600 hover:text-primary-700 font-medium"
                                            title="Edit"
                                        >
                                            <${Icon} name="edit-2" size=${14} />
                                        </button>
                                    `}
                                    ${['failed', 'draft'].includes(campaign.status) && html`
                                        <button 
                                            onClick=${() => handleBatchRetry(campaign.id)} 
                                            className="text-primary-600 hover:text-primary-700 font-medium"
                                            title="Retry"
                                        >
                                            <${Icon} name="refresh-cw" size=${14} />
                                        </button>
                                    `}
                                    <button 
                                        onClick=${() => handleDeleteCampaign(campaign.id)} 
                                        className="text-red-600 hover:text-red-700" 
                                        title="Delete"
                                    >
                                        <${Icon} name="trash-2" size=${14} />
                                    </button>
                                </div>
                            </div>
                        </${Card}>
                    `)}
                </div>
            `}
        </div>
    `;
};
