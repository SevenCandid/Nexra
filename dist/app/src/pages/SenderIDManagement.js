import { html, useState, useEffect } from '../utils/htm.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';
import { Icon } from '../components/ui/Icon.js';
import { Input } from '../components/ui/Input.js';
import { useToast } from '../contexts/ToastContext.js';
import { useAuth } from '../contexts/AuthContext.js';
import apiClient from '../api/client.js';

const STATUS_FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'approved', label: 'Approved' },
    { key: 'pending', label: 'Pending' },
    { key: 'need_verification', label: 'Need Verification' },
    { key: 'rejected', label: 'Rejected' },
];

const statusMeta = (status) => {
    const normalized = (status || 'pending').toLowerCase();
    if (normalized === 'approved') return { label: 'Approved', variant: 'success', icon: 'check-circle' };
    if (normalized === 'need_verification') return { label: 'Need Verification', variant: 'warning', icon: 'file-search' };
    if (normalized === 'rejected') return { label: 'Rejected', variant: 'error', icon: 'x-circle' };
    return { label: 'Pending', variant: 'info', icon: 'clock' };
};

const getUseCasePreview = (item) => {
    const snapshot = item.application_snapshot || {};
    const request = snapshot.request || item;
    const text = (request.use_case || '').trim();
    if (!text) return 'No use case provided';
    return text.length > 90 ? `${text.slice(0, 90)}…` : text;
};

const isAdminRole = (role) => ['staff', 'superadmin'].includes((role || '').toLowerCase());

export const SenderIDManagement = () => {
    const { showToast } = useToast();
    const { user } = useAuth();
    const adminMode = isAdminRole(user?.role);

    const [senderIds, setSenderIds] = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [historyRequests, setHistoryRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [adminLoading, setAdminLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState('my-requests');
    const [statusFilter, setStatusFilter] = useState('all');
    const [reviewComments, setReviewComments] = useState({});
    const [detailRequest, setDetailRequest] = useState(null);
    const [requestForm, setRequestForm] = useState({
        sender_id: '',
        company_name: '',
        username: '',
        use_case: '',
        website_or_social: '',
        official_email: '',
        registration_certificate: '',
        authorization_letter: '',
    });

    useEffect(() => {
        fetchSenderIds();
    }, []);

    useEffect(() => {
        if (adminMode) {
            fetchAdminQueues();
            setActiveTab('review-queue');
        }
    }, [adminMode]);

    useEffect(() => {
        if (!detailRequest) return undefined;

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setDetailRequest(null);
            }
        };

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [detailRequest]);

    const fetchSenderIds = async () => {
        setLoading(true);
        try {
            const response = await apiClient.get('/sender-ids');
            setSenderIds(response.data || []);
        } catch (error) {
            console.error('Failed to fetch Sender IDs:', error);
            showToast('Failed to load Sender IDs', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchAdminQueues = async () => {
        setAdminLoading(true);
        try {
            const [pendingRes, historyRes] = await Promise.all([
                apiClient.get('/sender-ids/admin/pending'),
                apiClient.get('/sender-ids/admin/history'),
            ]);
            setPendingRequests(pendingRes.data || []);
            setHistoryRequests(historyRes.data || []);
        } catch (error) {
            console.error('Failed to load admin queues:', error);
            showToast('Failed to load sender ID review queue', 'error');
        } finally {
            setAdminLoading(false);
        }
    };

    const handleChange = (field, value) => {
        setRequestForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleReviewCommentChange = (id, value) => {
        setReviewComments((prev) => ({ ...prev, [id]: value }));
    };

    const openRequestDetails = (item) => {
        setDetailRequest(item);
    };

    const closeRequestDetails = () => {
        setDetailRequest(null);
    };

    const handleRequest = async (e) => {
        e.preventDefault();
        const cleanId = requestForm.sender_id.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (!cleanId || cleanId.length < 3) {
            showToast('Sender ID must be at least 3 alphanumeric characters', 'error');
            return;
        }
        if (!requestForm.use_case.trim() || requestForm.use_case.trim().length < 10) {
            showToast('Please describe the use case in at least 10 characters.', 'error');
            return;
        }
        if (!requestForm.company_name.trim() && !requestForm.username.trim()) {
            showToast('Please provide either a company name or a username.', 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            await apiClient.post('/sender-ids', {
                sender_id: cleanId,
                company_name: requestForm.company_name.trim() || null,
                username: requestForm.username.trim() || null,
                use_case: requestForm.use_case.trim(),
                website_or_social: requestForm.website_or_social.trim() || null,
                official_email: requestForm.official_email.trim() || null,
                registration_certificate: requestForm.registration_certificate.trim() || null,
                authorization_letter: requestForm.authorization_letter.trim() || null,
            });
            showToast('Sender ID requested successfully!', 'success');
            setRequestForm({
                sender_id: '',
                company_name: '',
                username: '',
                use_case: '',
                website_or_social: '',
                official_email: '',
                registration_certificate: '',
                authorization_letter: '',
            });
            fetchSenderIds();
        } catch (error) {
            showToast(error.response?.data?.detail || 'Request failed', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const updateSenderStatus = async (id, status) => {
        try {
            await apiClient.patch(`/sender-ids/${id}/status`, {
                status,
                admin_comment: reviewComments[id] || null,
            });
            showToast('Sender ID status updated', 'success');
            await fetchAdminQueues();
            await fetchSenderIds();
        } catch (error) {
            showToast(error.response?.data?.detail || 'Failed to update status', 'error');
        }
    };

    const renderHistoryListItem = (item, isAdmin = false) => {
        const meta = statusMeta(item.status);
        const snapshot = item.application_snapshot || {};
        const request = snapshot.request || item;

        return html`
            <button
                key=${item.id}
                type="button"
                onClick=${() => openRequestDetails(item)}
                className="w-full text-left p-4 sm:p-5 flex items-start gap-4 hover:bg-gray-50 dark:hover:bg-midnight-900/60 transition-colors group"
            >
                <div className=${`shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center border ${
                    meta.variant === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/50 text-emerald-600 dark:text-emerald-400' :
                    meta.variant === 'warning' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800/50 text-amber-600 dark:text-amber-400' :
                    meta.variant === 'error' ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800/50 text-rose-600 dark:text-rose-400' :
                    meta.variant === 'info' ? 'bg-sky-50 dark:bg-sky-900/20 border-sky-100 dark:border-sky-800/50 text-sky-600 dark:text-sky-400' :
                    'bg-gray-50 dark:bg-midnight-900 border-gray-100 dark:border-midnight-800 text-gray-500'
                }`}>
                    <${Icon} name=${meta.icon} size=${18} />
                </div>

                <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="font-black text-lg text-gray-900 dark:text-white tracking-widest uppercase">${item.sender_id}</p>
                        <${Badge} variant=${meta.variant}>${meta.label}</${Badge}>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-midnight-300 line-clamp-2">${getUseCasePreview(item)}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] sm:text-xs text-gray-500 dark:text-midnight-500 font-bold uppercase tracking-wider">
                        <span>Requested ${new Date(item.created_at).toLocaleDateString()}</span>
                        <span className="opacity-30">•</span>
                        <span>#${item.id}</span>
                        ${request.company_name || request.username ? html`
                            <span className="opacity-30">•</span>
                            <span>${request.company_name || request.username}</span>
                        ` : ''}
                        ${isAdmin && item.organization_name ? html`
                            <span className="opacity-30">•</span>
                            <span>${item.organization_name}</span>
                        ` : ''}
                    </div>
                    ${item.admin_comment && html`
                        <p className="text-xs text-gray-500 dark:text-midnight-400 line-clamp-1 flex items-center gap-1.5">
                            <${Icon} name="message-square" size=${12} className="shrink-0 text-primary-500" />
                            ${item.admin_comment}
                        </p>
                    `}
                </div>

                <div className="shrink-0 flex flex-col items-end gap-2 pt-1">
                    ${item.status === 'need_verification' && html`
                        <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[10px] font-black uppercase tracking-widest">
                            Action needed
                        </span>
                    `}
                    <${Icon} name="chevron-right" size=${18} className="text-gray-300 dark:text-midnight-600 group-hover:text-primary-500 transition-colors" />
                </div>
            </button>
        `;
    };

    const renderUserRequestForm = () => html`
        <${Card} className="p-6 overflow-hidden relative transition-all">
            <div className="absolute top-0 left-0 w-full h-1 bg-primary-600"></div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Request New Sender ID</h2>
                    <p className="text-sm text-gray-500 dark:text-midnight-400 mt-1">
                        Share your brand details, use case, and basic verification info so the team can review quickly.
                    </p>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-xs font-bold">
                    <${Icon} name="shield-alert" size=${14} />
                    Need Verification opens a docs page
                </div>
            </div>

            <form onSubmit=${handleRequest} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <${Input}
                        label="Sender ID"
                        placeholder="e.g. MYBRAND"
                        value=${requestForm.sender_id}
                        onChange=${(e) => handleChange('sender_id', e.target.value.toUpperCase())}
                        maxLength=${11}
                        className="text-lg font-black tracking-widest text-primary-700 dark:text-primary-400"
                        required
                    />
                    <${Input}
                        label="Official Email"
                        type="email"
                        placeholder="hello@company.com"
                        value=${requestForm.official_email}
                        onChange=${(e) => handleChange('official_email', e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <${Input}
                        label="Company Name"
                        placeholder="Company / Organization name"
                        value=${requestForm.company_name}
                        onChange=${(e) => handleChange('company_name', e.target.value)}
                    />
                    <${Input}
                        label="Username"
                        placeholder="For freelancers or campaign leaders"
                        value=${requestForm.username}
                        onChange=${(e) => handleChange('username', e.target.value)}
                    />
                </div>

                <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-midnight-400 ml-1">Use Case</label>
                    <textarea
                        value=${requestForm.use_case}
                        onChange=${(e) => handleChange('use_case', e.target.value)}
                        placeholder="Explain what you will send Sender ID messages for, who will receive them, and why the name is needed."
                        rows=${4}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-midnight-900/50 text-gray-900 dark:text-white border border-gray-200 dark:border-midnight-800 rounded-2xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all text-sm"
                        required
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <${Input}
                        label="Website or Social Page"
                        placeholder="Optional"
                        value=${requestForm.website_or_social}
                        onChange=${(e) => handleChange('website_or_social', e.target.value)}
                    />
                    <${Input}
                        label="Registration Certificate Reference"
                        placeholder="Optional note or file link"
                        value=${requestForm.registration_certificate}
                        onChange=${(e) => handleChange('registration_certificate', e.target.value)}
                    />
                </div>

                <${Input}
                    label="Authorization Letter Reference"
                    placeholder="Optional unless you are requesting on behalf of another organization"
                    value=${requestForm.authorization_letter}
                    onChange=${(e) => handleChange('authorization_letter', e.target.value)}
                />

                <div className="rounded-2xl border border-amber-100 dark:border-amber-900/40 bg-amber-50/70 dark:bg-amber-900/10 p-4 text-sm text-amber-900 dark:text-amber-100">
                    <p className="font-bold mb-1">Basic verification checklist</p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Organization name or username for freelancers and campaign leaders</li>
                        <li>Website or social media page, if available</li>
                        <li>Registration certificate for registered businesses</li>
                        <li>Official email address</li>
                        <li>Letter of authorization if you are impersonating another organization</li>
                    </ul>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <${Button} type="submit" disabled=${isSubmitting} className="sm:px-8">
                        ${isSubmitting ? 'Submitting...' : 'Request Approval'}
                    </${Button}>
                    <button
                        type="button"
                        onClick=${fetchSenderIds}
                        className="px-4 py-2 rounded-2xl border border-gray-200 dark:border-midnight-800 text-sm font-bold text-gray-600 dark:text-midnight-300 hover:bg-gray-50 dark:hover:bg-midnight-900 transition-colors"
                    >
                        Refresh Requests
                    </button>
                </div>
            </form>
        </${Card}>
    `;

    const renderStatusSummary = (items) => {
        const counts = STATUS_FILTERS.reduce((acc, filter) => {
            acc[filter.key] = filter.key === 'all'
                ? items.length
                : items.filter((item) => (item.status || 'pending').toLowerCase() === filter.key).length;
            return acc;
        }, {});

        return html`
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                ${STATUS_FILTERS.map((filter) => {
                    const meta = filter.key === 'all'
                        ? { variant: 'primary', icon: 'layers' }
                        : statusMeta(filter.key);
                    const active = statusFilter === filter.key;
                    return html`
                        <button
                            key=${filter.key}
                            type="button"
                            onClick=${() => setStatusFilter(filter.key)}
                            className=${`p-4 rounded-2xl border text-left transition-all ${
                                active
                                    ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800 shadow-sm'
                                    : 'bg-white/70 dark:bg-midnight-950/50 border-gray-100 dark:border-midnight-800 hover:border-primary-200 dark:hover:border-primary-800'
                            }`}
                        >
                            <div className="flex items-center justify-between gap-2 mb-2">
                                <${Icon} name=${meta.icon || 'layers'} size=${16} className=${active ? 'text-primary-600' : 'text-gray-400'} />
                                <span className="text-xl font-black text-gray-900 dark:text-white">${counts[filter.key]}</span>
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-midnight-400">${filter.label}</p>
                        </button>
                    `;
                })}
            </div>
        `;
    };

    const filteredSenderIds = statusFilter === 'all'
        ? senderIds
        : senderIds.filter((item) => (item.status || 'pending').toLowerCase() === statusFilter);

    const renderUserRequests = () => html`
        <div className="space-y-6">
            ${renderUserRequestForm()}

            <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-white uppercase tracking-wider text-sm flex items-center gap-2">
                            <${Icon} name="history" size=${16} className="text-primary-600" />
                            Request History
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-midnight-400 mt-1">
                            All your sender IDs in one place — tap any row to open details.
                        </p>
                    </div>
                    <button onClick=${fetchSenderIds} className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1 transition-colors">
                        <${Icon} name="refresh-cw" size=${12} />
                        Refresh
                    </button>
                </div>

                ${!loading && senderIds.length > 0 && renderStatusSummary(senderIds)}

                <div className="flex flex-wrap gap-2 px-1">
                    ${STATUS_FILTERS.map((filter) => html`
                        <button
                            key=${filter.key}
                            type="button"
                            onClick=${() => setStatusFilter(filter.key)}
                            className=${`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-colors ${
                                statusFilter === filter.key
                                    ? 'bg-primary-600 text-white border-primary-600'
                                    : 'bg-white dark:bg-midnight-950 text-gray-600 dark:text-midnight-300 border-gray-200 dark:border-midnight-800'
                            }`}
                        >
                            ${filter.label}
                        </button>
                    `)}
                </div>
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
                ` : filteredSenderIds.length === 0 ? html`
                    <div className="p-12 text-center text-gray-500">
                        <${Icon} name="filter" size=${28} className="mx-auto mb-3 text-gray-300 dark:text-midnight-700" />
                        <p className="text-sm">No ${statusFilter.replace('_', ' ')} sender IDs found.</p>
                        <button
                            type="button"
                            onClick=${() => setStatusFilter('all')}
                            className="mt-3 text-xs font-bold text-primary-600 hover:text-primary-700"
                        >
                            Show all requests
                        </button>
                    </div>
                ` : html`
                    <div className="divide-y divide-gray-100 dark:divide-midnight-800">
                        ${filteredSenderIds.map((item) => renderHistoryListItem(item, false))}
                    </div>
                `}
            </${Card}>
        </div>
    `;

    const renderAdminQueues = () => html`
        <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
                <button
                    onClick=${() => setActiveTab('review-queue')}
                    className=${`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest border transition-colors ${activeTab === 'review-queue' ? 'bg-primary-600 text-white border-primary-600' : 'bg-white dark:bg-midnight-950 text-gray-600 dark:text-midnight-300 border-gray-200 dark:border-midnight-800'}`}
                >
                    Review Queue
                </button>
                <button
                    onClick=${() => setActiveTab('history')}
                    className=${`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest border transition-colors ${activeTab === 'history' ? 'bg-primary-600 text-white border-primary-600' : 'bg-white dark:bg-midnight-950 text-gray-600 dark:text-midnight-300 border-gray-200 dark:border-midnight-800'}`}
                >
                    Full History
                </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <${Card} className="overflow-hidden bg-white/50 dark:bg-midnight-950/50 backdrop-blur-sm border-gray-100 dark:border-midnight-800">
                    <div className="p-5 border-b border-gray-100 dark:border-midnight-800 flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-black text-gray-900 dark:text-white">Pending Review</h3>
                            <p className="text-xs text-gray-500 dark:text-midnight-500">Approve, request verification, or reject from here.</p>
                        </div>
                        <button onClick=${fetchAdminQueues} className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1">
                            <${Icon} name="refresh-cw" size=${12} />
                            Refresh
                        </button>
                    </div>
                    <div className="max-h-[900px] overflow-y-auto divide-y divide-gray-100 dark:divide-midnight-800">
                        ${adminLoading ? html`
                            <div className="p-10 text-center text-gray-500">
                                <div className="animate-spin inline-block text-primary-600"><${Icon} name="loader-2" size=${28} /></div>
                                <p className="mt-3 text-sm">Loading review queue...</p>
                            </div>
                        ` : pendingRequests.length === 0 ? html`
                            <div className="p-10 text-center text-gray-500">
                                <p className="text-sm">No pending requests.</p>
                            </div>
                        ` : pendingRequests.map((item) => renderHistoryListItem(item, true))}
                    </div>
                </${Card}>

                <${Card} className="overflow-hidden bg-white/50 dark:bg-midnight-950/50 backdrop-blur-sm border-gray-100 dark:border-midnight-800">
                    <div className="p-5 border-b border-gray-100 dark:border-midnight-800 flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-black text-gray-900 dark:text-white">Request History</h3>
                            <p className="text-xs text-gray-500 dark:text-midnight-500">All sender ID decisions in one place.</p>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                            {historyRequests.length} total
                        </span>
                    </div>
                    <div className="max-h-[900px] overflow-y-auto divide-y divide-gray-100 dark:divide-midnight-800">
                        ${adminLoading ? html`
                            <div className="p-10 text-center text-gray-500">
                                <div className="animate-spin inline-block text-primary-600"><${Icon} name="loader-2" size=${28} /></div>
                                <p className="mt-3 text-sm">Loading history...</p>
                            </div>
                        ` : historyRequests.length === 0 ? html`
                            <div className="p-10 text-center text-gray-500">
                                <p className="text-sm">No history records.</p>
                            </div>
                        ` : historyRequests.map((item) => renderHistoryListItem(item, true))}
                    </div>
                </${Card}>
            </div>
        </div>
    `;

    const handleDrawerStatusUpdate = async (id, status) => {
        await updateSenderStatus(id, status);
        setDetailRequest(null);
    };

    const renderDetailDrawer = () => {
        if (!detailRequest) {
            return null;
        }

        const snapshot = detailRequest.application_snapshot || {};
        const requester = snapshot.requester || {};
        const organization = snapshot.organization || {};
        const request = snapshot.request || detailRequest;
        const verification = snapshot.verification || detailRequest.verification_payload || {};
        const meta = statusMeta(detailRequest.status);
        const verificationLink = `#/sender-ids/verify/${detailRequest.id}`;

        const detailField = (label, value, wide = false) => html`
            <div className=${`p-4 rounded-2xl bg-gray-50 dark:bg-midnight-900/50 border border-gray-100 dark:border-midnight-800 ${wide ? 'sm:col-span-2' : ''}`}>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">${label}</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white whitespace-pre-wrap break-words">${value || 'Not provided'}</p>
            </div>
        `;

        return html`
            <div className="fixed inset-0 z-50 flex justify-end">
                <button
                    type="button"
                    className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px]"
                    onClick=${closeRequestDetails}
                    aria-label="Close sender ID details"
                ></button>

                <aside className="relative w-full max-w-xl h-full bg-white dark:bg-midnight-950 shadow-2xl border-l border-gray-100 dark:border-midnight-800 flex flex-col animate-in slide-in-from-right duration-300">
                    <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-midnight-800 flex items-start justify-between gap-4 shrink-0">
                        <div className="space-y-2 min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-primary-600">Sender ID Details</p>
                            <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-widest uppercase truncate">${detailRequest.sender_id}</h3>
                                <${Badge} variant=${meta.variant}>${meta.label}</${Badge}>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-midnight-400">
                                Request #${detailRequest.id} · ${new Date(detailRequest.created_at).toLocaleString()}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick=${closeRequestDetails}
                            className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-gray-200 dark:border-midnight-800 text-gray-500 dark:text-midnight-300 hover:bg-gray-50 dark:hover:bg-midnight-900 transition-colors shrink-0"
                            aria-label="Close details"
                        >
                            <${Icon} name="x" size=${18} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
                        ${detailRequest.status === 'approved' && html`
                            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50 flex gap-3">
                                <${Icon} name="check-circle" size=${18} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">Ready to use</p>
                                    <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80 mt-1">This sender ID is approved and available when sending campaigns.</p>
                                </div>
                            </div>
                        `}

                        ${detailRequest.status === 'pending' && html`
                            <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-900/20 border border-sky-100 dark:border-sky-800/50 flex gap-3">
                                <${Icon} name="clock" size=${18} className="text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-bold text-sky-800 dark:text-sky-200">Under review</p>
                                    <p className="text-xs text-sky-700/80 dark:text-sky-300/80 mt-1">Your request is waiting for admin review. You will be notified when the status changes.</p>
                                </div>
                            </div>
                        `}

                        ${detailRequest.status === 'need_verification' && html`
                            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50 flex gap-3">
                                <${Icon} name="file-search" size=${18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-sm font-bold text-amber-800 dark:text-amber-200">Verification required</p>
                                        <p className="text-xs text-amber-700/80 dark:text-amber-300/80 mt-1">Upload supporting documents so the team can complete your review.</p>
                                    </div>
                                    <a
                                        href=${verificationLink}
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500 text-white text-xs font-black uppercase tracking-widest hover:bg-amber-600 transition-colors"
                                    >
                                        <${Icon} name="upload" size=${14} />
                                        Continue Verification
                                    </a>
                                </div>
                            </div>
                        `}

                        ${detailRequest.status === 'rejected' && html`
                            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800/50 flex gap-3">
                                <${Icon} name="x-circle" size=${18} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-sm font-bold text-rose-800 dark:text-rose-200">Request rejected</p>
                                        <p className="text-xs text-rose-700/80 dark:text-rose-300/80 mt-1">Review the admin note below, update your details, and submit a new request if needed.</p>
                                    </div>
                                    <${Button}
                                        variant="outline"
                                        size="sm"
                                        onClick=${() => {
                                            setRequestForm((prev) => ({ ...prev, sender_id: detailRequest.sender_id }));
                                            closeRequestDetails();
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}
                                        className="text-[10px] font-bold uppercase"
                                    >
                                        Retry Request
                                    </${Button}>
                                </div>
                            </div>
                        `}

                        ${detailRequest.admin_comment && html`
                            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-midnight-900/50 border border-gray-100 dark:border-midnight-800">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-1.5">
                                    <${Icon} name="message-square" size=${12} />
                                    Admin Comment
                                </p>
                                <p className="text-sm text-gray-700 dark:text-midnight-200 whitespace-pre-wrap">${detailRequest.admin_comment}</p>
                            </div>
                        `}

                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Application Details</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                ${detailField('Company / Username', request.company_name || request.username)}
                                ${detailField('Official Email', request.official_email)}
                                ${detailField('Website / Social', request.website_or_social)}
                                ${detailField('Organization', organization.name)}
                                ${detailField('Use Case', request.use_case, true)}
                                ${detailField('Registration Certificate', request.registration_certificate ? 'Provided' : 'Not provided')}
                                ${detailField('Authorization Letter', request.authorization_letter ? 'Provided' : 'Not provided')}
                            </div>
                        </div>

                        ${adminMode && html`
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Requester</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    ${detailField('Name', requester.full_name)}
                                    ${detailField('Email', requester.email)}
                                    ${detailField('Phone', requester.phone_number)}
                                    ${detailField('Role', requester.role)}
                                    ${detailField('Organization Plan', organization.plan_name)}
                                    ${detailField('Verification Submitted', detailRequest.verification_submitted_at ? new Date(detailRequest.verification_submitted_at).toLocaleString() : 'Not yet submitted')}
                                </div>
                            </div>
                        `}

                        ${adminMode && Object.keys(verification).length > 0 && html`
                            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-midnight-900/50 border border-gray-100 dark:border-midnight-800">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Verification Documents</p>
                                <p className="text-sm text-gray-700 dark:text-midnight-200">Supporting documents were submitted for review.</p>
                            </div>
                        `}

                        ${adminMode && html`
                            <div className="p-5 rounded-2xl bg-gray-50 dark:bg-midnight-900/50 border border-gray-100 dark:border-midnight-800 space-y-4">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Review Note</p>
                                    <p className="text-sm text-gray-500 dark:text-midnight-400 mt-1">Leave a note before changing the approval state.</p>
                                </div>
                                <textarea
                                    value=${reviewComments[detailRequest.id] || ''}
                                    onChange=${(e) => handleReviewCommentChange(detailRequest.id, e.target.value)}
                                    rows=${4}
                                    className="w-full px-4 py-3 bg-white dark:bg-midnight-950 text-gray-900 dark:text-white border border-gray-200 dark:border-midnight-800 rounded-2xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all text-sm"
                                    placeholder="Add review context, request changes, or explain verification requirements."
                                />
                                <div className="flex flex-wrap gap-2">
                                    <${Button} size="sm" onClick=${() => handleDrawerStatusUpdate(detailRequest.id, 'approved')} className="text-[10px] uppercase">Approve</${Button}>
                                    <${Button} size="sm" variant="outline" onClick=${() => handleDrawerStatusUpdate(detailRequest.id, 'need_verification')} className="text-[10px] uppercase border-amber-300 text-amber-700 dark:text-amber-300">Need Verification</${Button}>
                                    <${Button} size="sm" variant="danger" onClick=${() => handleDrawerStatusUpdate(detailRequest.id, 'rejected')} className="text-[10px] uppercase">Reject</${Button}>
                                </div>
                            </div>
                        `}
                    </div>
                </aside>
            </div>
        `;
    };

    return html`
        <div className="space-y-6 fade-in max-w-6xl mx-auto">
            ${adminMode ? html`
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white">Sender ID Review Center</h2>
                        <p className="text-sm text-gray-500 dark:text-midnight-400 mt-1">
                            Review sender ID applications with full requester, organization, and request details.
                        </p>
                    </div>
                    <div className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-xs font-bold">
                        <${Icon} name="shield-check" size=${14} />
                        Admin review mode
                    </div>
                </div>
                ${renderAdminQueues()}
            ` : renderUserRequests()}
            ${renderDetailDrawer()}
        </div>
    `;
};
