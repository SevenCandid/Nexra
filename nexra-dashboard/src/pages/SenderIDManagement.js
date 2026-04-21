import { html, useState, useEffect } from '../utils/htm.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';
import { Icon } from '../components/ui/Icon.js';
import { Input } from '../components/ui/Input.js';
import { useToast } from '../contexts/ToastContext.js';
import apiClient from '../api/client.js';

export const SenderIDManagement = () => {
    const { showToast } = useToast();
    const [senderIds, setSenderIds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newId, setNewId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchSenderIds();
    }, []);

    const fetchSenderIds = async () => {
        setLoading(true);
        try {
            const response = await apiClient.get('/sender-ids');
            setSenderIds(response.data);
        } catch (error) {
            console.error('Failed to fetch Sender IDs:', error);
            showToast('Failed to load Sender IDs', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleRequest = async (e) => {
        e.preventDefault();
        const cleanId = newId.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (!cleanId || cleanId.length < 3) {
            showToast('Sender ID must be at least 3 alphanumeric characters', 'error');
            return;
        }
        setIsSubmitting(true);
        try {
            await apiClient.post('/sender-ids', { sender_id: cleanId });
            showToast('Sender ID requested successfully!', 'success');
            setNewId('');
            fetchSenderIds();
        } catch (error) {
            showToast(error.response?.data?.detail || 'Request failed', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return html`
        <div className="space-y-6 fade-in max-w-4xl mx-auto">
            <${Card} className="p-6 overflow-hidden relative transition-all">
                <div className="absolute top-0 left-0 w-full h-1 bg-primary-600"></div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Request New Sender ID</h2>
                        <p className="text-sm text-gray-500 dark:text-midnight-400 mt-1">
                            Submit a new alphanumeric identity for approval
                        </p>
                    </div>
                </div>
                
                <form onSubmit=${handleRequest} className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1">
                        <${Input} 
                            placeholder="e.g. MY_BRAND" 
                            value=${newId} 
                            onChange=${(e) => setNewId(e.target.value.toUpperCase())}
                            maxLength=${11}
                            className="text-lg font-black tracking-widest text-primary-700 dark:text-primary-400"
                        />
                    </div>
                    <${Button} type="submit" disabled=${isSubmitting || newId.trim().length < 3} className="sm:px-8">
                        ${isSubmitting ? 'Requesting...' : 'Request Approval'}
                    </${Button}>
                </form>
            </${Card}>

            <div className="flex items-center justify-between px-2">
                <h3 className="font-bold text-gray-900 dark:text-white uppercase tracking-wider text-sm flex items-center gap-2">
                    <${Icon} name="history" size=${16} className="text-primary-600" />
                    Request History
                </h3>
                <button onClick=${fetchSenderIds} className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1 transition-colors">
                    <${Icon} name="refresh-cw" size=${12} />
                    Refresh
                </button>
            </div>

            <${Card} className="overflow-hidden bg-white/50 dark:bg-midnight-950/50 backdrop-blur-sm border-gray-100 dark:border-midnight-800 transition-all">
                ${loading ? html`
                    <div className="p-12 text-center">
                        <div className="animate-spin inline-block text-primary-600"><${Icon} name="loader-2" size=${32} /></div>
                        <p className="text-sm text-gray-500 mt-4">Loading history...</p>
                    </div>
                ` : senderIds.length === 0 ? html`
                    <div className="p-16 text-center text-gray-500">
                        <div className="w-20 h-20 bg-gray-50 dark:bg-midnight-900 rounded-full flex items-center justify-center mx-auto mb-4">
                            <${Icon} name="pen-tool" size=${32} className="text-gray-300 dark:text-midnight-700" />
                        </div>
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">No Sender IDs yet</h4>
                        <p className="text-sm">Requests you make will appear here.</p>
                    </div>
                ` : html`
                    <div className="divide-y divide-gray-100 dark:divide-midnight-800">
                        ${senderIds.map((item) => html`
                            <div key=${item.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white dark:hover:bg-midnight-900 transition-colors">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-3">
                                        <p className="font-black text-xl text-gray-900 dark:text-white tracking-widest uppercase">${item.sender_id}</p>
                                        <${Badge} variant=${item.status === 'approved' ? 'success' : item.status === 'rejected' ? 'error' : 'warning'}>
                                            ${item.status}
                                        </${Badge}>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] sm:text-xs text-gray-500 dark:text-midnight-500 font-bold uppercase tracking-wider">
                                        <span>Requested ${new Date(item.created_at).toLocaleDateString()}</span>
                                        <span className="opacity-30">•</span>
                                        <span>ID: #${item.id}</span>
                                    </div>
                                </div>
                                
                                ${item.admin_comment && html`
                                    <div className="flex-1 max-w-sm sm:mx-6 p-3 bg-gray-50 dark:bg-midnight-800 rounded-xl text-xs text-gray-600 dark:text-midnight-300 border border-gray-100 dark:border-midnight-800 flex gap-2 animate-in fade-in slide-in-from-left-2 transition-all">
                                        <${Icon} name="message-square" size=${14} className="mt-0.5 shrink-0 text-primary-500" />
                                        <div>
                                            <span className="font-bold text-gray-400 uppercase text-[10px] block mb-0.5">Admin Comment</span>
                                            ${item.admin_comment}
                                        </div>
                                    </div>
                                `}

                                ${item.status === 'rejected' && html`
                                    <${Button} variant="outline" size="sm" onClick=${() => { setNewId(item.sender_id); window.scrollTo({top: 0, behavior: 'smooth'}); }} className="text-[10px] font-bold uppercase py-1">
                                        Retry
                                    </${Button}>
                                `}
                            </div>
                        `)}
                    </div>
                `}
            </${Card}>
        </div>
    `;
};
