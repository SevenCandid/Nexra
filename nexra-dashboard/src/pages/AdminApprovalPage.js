import apiClient from '../api/client.js';
import { html, useState, useEffect, useRef, useMemo, useCallback } from '../utils/htm.js';
import { Icon, Button, Badge, Card, Modal, Skeleton, TrendChart, ConfirmModal, Input, Dropdown, TemplateSelector } from '../components/ui/index.js';
import { useToast, useAuth } from '../context/index.js';
import { AdminStatCard, SystemHealthWidget, PlatformRow, DateFilterDropdown } from '../components/layout/index.js';

export const AdminApprovalPage = () => {
    const { showToast } = useToast();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('pending'); // 'pending' or 'history'
    const [detailRequest, setDetailRequest] = useState(null);

    useEffect(() => {
        fetchRequests();
    }, [tab]);

    useEffect(() => {
        if (!detailRequest) return undefined;
        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                setDetailRequest(null);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [detailRequest]);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const endpoint = tab === 'pending' ? '/sender-ids/admin/pending' : '/sender-ids/admin/history';
            const response = await apiClient.get(endpoint);
            setRequests(response.data);
        } catch (error) {
            console.error('Failed to fetch requests:', error);
            showToast('Failed to load requests', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (id, status) => {
        let comment = null;
        if (status === 'rejected') {
            comment = prompt('Reason for rejection (required):');
            if (comment === null || comment.trim() === '') return; // cancelled or empty
        } else if (status === 'approved') {
            comment = prompt('Optional approval note (press OK to skip):') || null;
        } else if (status === 'need_verification') {
            comment = prompt('Optional verification note (press OK to skip):') || null;
        }

        try {
            await apiClient.patch(`/sender-ids/${id}/status`, { status, admin_comment: comment });
            showToast(`Sender ID ${status}!`, 'success');
            setDetailRequest((current) => (current?.id === id ? null : current));
            fetchRequests();
        } catch (error) {
            showToast('Action failed', 'error');
        }
    };

    return html`
        <div className="space-y-4 lg:space-y-6 fade-in max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-2xl font-bold dark:text-white">Sender ID Approvals</h2>
                <div className="flex bg-gray-100 dark:bg-midnight-800 p-1 rounded-xl">
                    <button
                        onClick=${() => setTab('pending')}
                        className="px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${tab === 'pending' ? 'bg-white dark:bg-primary-600 text-primary-600 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}"
                    >
                        Pending
                    </button>
                    <button
                        onClick=${() => setTab('history')}
                        className="px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${tab === 'history' ? 'bg-white dark:bg-primary-600 text-primary-600 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}"
                    >
                        History
                    </button>
                </div>
            </div>

            ${loading ? html`
                <div className="grid gap-3 lg:gap-4 p-4 lg:p-0">
                    ${[1,2,3,4].map(i => html`
                        <div key=${i} className="bg-white dark:bg-midnight-900 border border-gray-100 dark:border-midnight-800 rounded-2xl p-5 shadow-sm">
                            <div className="flex flex-col md:flex-row justify-between gap-4">
                                <div className="space-y-3 flex-1">
                                    <${Skeleton} className="w-1/4 h-6" />
                                    <${Skeleton} className="w-1/2 h-4" />
                                </div>
                                <div className="flex gap-2">
                                    <${Skeleton} className="w-24 h-10 rounded-xl" />
                                    <${Skeleton} className="w-24 h-10 rounded-xl" />
                                </div>
                            </div>
                        </div>
                    `)}
                </div>
            ` : requests.length === 0 ? html`
                <${Card} className="p-12 text-center text-gray-500 border-none lg:border">
                    <${Icon} name="check-circle" size=${64} className="mx-auto mb-4 text-green-500/20" />
                    <p className="text-lg font-medium">No ${tab} requests</p>
                    <p className="text-sm">Everything is up to date.</p>
                </${Card}>
            ` : html`
                <div className="grid gap-3 lg:gap-4">
                    ${requests.map((req) => html`
                        <${Card} key=${req.id} className="p-5 lg:p-6 flex flex-col md:flex-row md:items-center justify-between bg-white dark:bg-midnight-900 border-gray-100 dark:border-midnight-800 shadow-sm animate-pop-in gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-xl lg:text-2xl font-black text-gray-900 dark:text-white tracking-widest uppercase">${req.sender_id}</h3>
                                    <${Badge} variant=${req.status === 'approved' ? 'success' : req.status === 'need_verification' ? 'warning' : req.status === 'rejected' ? 'error' : 'default'}>
                                        ${req.status === 'approved' ? 'Approved ✅' : req.status === 'need_verification' ? 'Need Verification 🟡' : req.status === 'rejected' ? 'Rejected ❌' : 'Pending'}
                                    </${Badge}>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                    <span className="text-[10px] font-bold text-primary-700 dark:text-primary-400 uppercase px-2 py-0.5 bg-primary-50 dark:bg-primary-900/30 rounded">${req.organization_name || `Org #${req.organization_id}`}</span>
                                    <span className="text-xs text-gray-400">•</span>
                                    <span className="text-xs text-gray-500">${new Date(req.created_at).toLocaleString()}</span>
                                </div>
                                ${req.admin_comment && html`
                                    <div className="mt-3 p-3 bg-gray-50 dark:bg-midnight-800 rounded-xl text-xs text-gray-600 dark:text-midnight-300 border border-gray-100 dark:border-midnight-800">
                                        <span className="font-bold text-gray-400 mr-2 uppercase">Reason:</span>
                                        ${req.admin_comment}
                                    </div>
                                `}
                            </div>
                            
                            <div className="flex flex-wrap gap-2 w-full md:w-auto">
                                <${Button} variant="outline" size="sm" className="flex-1 md:flex-none text-[10px] uppercase border-gray-300 dark:border-midnight-700" onClick=${() => setDetailRequest(req)}>
                                    View Details
                                </${Button}>
                                ${req.status === 'pending' && html`
                                    <${Button} variant="ghost" size="sm" className="flex-1 md:flex-none text-[10px] uppercase text-amber-700 hover:bg-amber-50" onClick=${() => handleAction(req.id, 'need_verification')}>
                                        Need Verification
                                    </${Button}>
                                    <${Button} variant="ghost" size="sm" className="flex-1 md:flex-none text-rose-600 hover:bg-rose-50 text-[10px] uppercase" onClick=${() => handleAction(req.id, 'rejected')}>
                                        Reject
                                    </${Button}>
                                    <${Button} size="sm" className="flex-1 md:flex-none text-[10px] uppercase" onClick=${() => handleAction(req.id, 'approved')}>
                                        Approve
                                    </${Button}>
                                `}
                            </div>
                        </${Card}>
                    `)}
                </div>
            `}
            ${detailRequest && html`
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                    <button
                        type="button"
                        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
                        onClick=${() => setDetailRequest(null)}
                        aria-label="Close sender ID details"
                    ></button>

                    <div className="relative w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-3xl bg-white dark:bg-midnight-950 shadow-2xl border border-gray-100 dark:border-midnight-800">
                        <div className="p-6 border-b border-gray-100 dark:border-midnight-800 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                            <div className="space-y-2">
                                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-primary-600">Sender ID Application Snapshot</p>
                                <div className="flex flex-wrap items-center gap-3">
                                    <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-widest uppercase">${detailRequest.sender_id}</h3>
                                    <${Badge} variant=${detailRequest.status === 'approved' ? 'success' : detailRequest.status === 'need_verification' ? 'warning' : detailRequest.status === 'rejected' ? 'error' : 'default'}>
                                        ${detailRequest.status === 'approved' ? 'Approved ✅' : detailRequest.status === 'need_verification' ? 'Need Verification 🟡' : detailRequest.status === 'rejected' ? 'Rejected ❌' : 'Pending'}
                                    </${Badge}>
                                </div>
                                <p className="text-sm text-gray-500 dark:text-midnight-400">
                                    Request #${detailRequest.id} · Submitted ${new Date(detailRequest.created_at).toLocaleString()}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick=${() => setDetailRequest(null)}
                                className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-gray-200 dark:border-midnight-800 text-gray-500 dark:text-midnight-300 hover:bg-gray-50 dark:hover:bg-midnight-900 transition-colors"
                                aria-label="Close details"
                            >
                                <${Icon} name="x" size=${18} />
                            </button>
                        </div>

                        <div className="max-h-[calc(90vh-110px)] overflow-y-auto p-6 space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm">
                                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-midnight-900/50 border border-gray-100 dark:border-midnight-800">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Organization</p>
                                    <p className="font-medium text-gray-900 dark:text-white">${detailRequest.organization_name || `Org #${detailRequest.organization_id}`}</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-midnight-900/50 border border-gray-100 dark:border-midnight-800">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Official Email</p>
                                    <p className="font-medium text-gray-900 dark:text-white">${detailRequest.official_email || 'Not provided'}</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-midnight-900/50 border border-gray-100 dark:border-midnight-800">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Company / Username</p>
                                    <p className="font-medium text-gray-900 dark:text-white">${detailRequest.company_name || detailRequest.username || 'Not provided'}</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-midnight-900/50 border border-gray-100 dark:border-midnight-800">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Website / Social</p>
                                    <p className="font-medium text-gray-900 dark:text-white">${detailRequest.website_or_social || 'Not provided'}</p>
                                </div>
                                <div className="md:col-span-2 p-4 rounded-2xl bg-gray-50 dark:bg-midnight-900/50 border border-gray-100 dark:border-midnight-800">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Use Case</p>
                                    <p className="font-medium text-gray-900 dark:text-white whitespace-pre-wrap">${detailRequest.use_case || 'Not provided'}</p>
                                </div>
                                <div className="md:col-span-2 p-4 rounded-2xl bg-gray-50 dark:bg-midnight-900/50 border border-gray-100 dark:border-midnight-800">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Documents</p>
                                    <div className="flex flex-wrap gap-2 text-xs">
                                        <span className="px-2 py-1 rounded-full bg-white dark:bg-midnight-950 border border-gray-200 dark:border-midnight-800">Certificate: ${detailRequest.registration_certificate ? 'Provided' : 'Not provided'}</span>
                                        <span className="px-2 py-1 rounded-full bg-white dark:bg-midnight-950 border border-gray-200 dark:border-midnight-800">Authorization: ${detailRequest.authorization_letter ? 'Provided' : 'Not provided'}</span>
                                    </div>
                                </div>
                                <div className="md:col-span-2 p-4 rounded-2xl bg-gray-50 dark:bg-midnight-900/50 border border-gray-100 dark:border-midnight-800">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Admin Comment</p>
                                    <p className="font-medium text-gray-900 dark:text-white whitespace-pre-wrap">${detailRequest.admin_comment || 'No admin note yet'}</p>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center">
                                <div className="flex flex-wrap gap-2">
                                    <${Button} size="sm" onClick=${() => handleAction(detailRequest.id, 'approved')} className="text-[10px] uppercase">Approve</${Button}>
                                    <${Button} size="sm" variant="outline" onClick=${() => handleAction(detailRequest.id, 'need_verification')} className="text-[10px] uppercase border-amber-300 text-amber-700 dark:text-amber-300">Need Verification</${Button}>
                                    <${Button} size="sm" variant="ghost" className="text-[10px] uppercase text-rose-600 hover:bg-rose-50" onClick=${() => handleAction(detailRequest.id, 'rejected')}>Reject</${Button}>
                                </div>
                                <button
                                    type="button"
                                    onClick=${() => setDetailRequest(null)}
                                    className="text-sm font-bold text-gray-500 dark:text-midnight-400 hover:text-gray-700 dark:hover:text-white transition-colors"
                                >
                                    Close details
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `}
        </div>
    `;
};