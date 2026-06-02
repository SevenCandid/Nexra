import { html, useState, useEffect } from '../utils/htm.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';
import { Icon } from '../components/ui/Icon.js';
import { Input } from '../components/ui/Input.js';
import { useToast } from '../contexts/ToastContext.js';
import { useAuth } from '../contexts/AuthContext.js';
import apiClient from '../api/client.js';

const statusMeta = (status) => {
    const normalized = (status || 'pending').toLowerCase();
    if (normalized === 'approved') return { label: 'Approved ✅', variant: 'success' };
    if (normalized === 'need_verification') return { label: 'Need Verification 🟡', variant: 'warning' };
    if (normalized === 'rejected') return { label: 'Rejected ❌', variant: 'error' };
    return { label: 'Pending', variant: 'default' };
};

const isAdminRole = (role) => ['staff', 'superadmin'].includes((role || '').toLowerCase());

const valueNode = (value) => html`<span className="font-medium text-gray-900 dark:text-white">${value || 'Not provided'}</span>`;

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

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
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

    const renderSnapshot = (item) => {
        const snapshot = item.application_snapshot || {};
        const requester = snapshot.requester || {};
        const org = snapshot.organization || {};
        const request = snapshot.request || item;

        return html`
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-2xl bg-gray-50 dark:bg-midnight-900/40 border border-gray-100 dark:border-midnight-800">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Requester</p>
                    <p className="font-semibold text-gray-900 dark:text-white">${requester.full_name || 'Unknown'}</p>
                    <p className="text-xs text-gray-500 dark:text-midnight-500">${requester.email || 'No email'}${requester.phone_number ? ` • ${requester.phone_number}` : ''}</p>
                    <p className="text-[10px] uppercase tracking-widest text-gray-400 mt-1">${requester.role || 'user'}</p>
                </div>
                <div className="p-3 rounded-2xl bg-gray-50 dark:bg-midnight-900/40 border border-gray-100 dark:border-midnight-800">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Organization</p>
                    <p className="font-semibold text-gray-900 dark:text-white">${org.name || 'Unknown org'}</p>
                    <p className="text-xs text-gray-500 dark:text-midnight-500">${org.plan_name || 'No plan'}${org.slug ? ` • ${org.slug}` : ''}</p>
                </div>
                <div className="p-3 rounded-2xl bg-gray-50 dark:bg-midnight-900/40 border border-gray-100 dark:border-midnight-800">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Sender ID</p>
                    <p className="font-black text-xl tracking-widest text-gray-900 dark:text-white uppercase">${request.sender_id || item.sender_id}</p>
                    <p className="text-xs text-gray-500 dark:text-midnight-500">${statusMeta(item.status).label}</p>
                </div>
                <div className="p-3 rounded-2xl bg-gray-50 dark:bg-midnight-900/40 border border-gray-100 dark:border-midnight-800">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Official Email</p>
                    ${valueNode(request.official_email)}
                </div>
                <div className="p-3 rounded-2xl bg-gray-50 dark:bg-midnight-900/40 border border-gray-100 dark:border-midnight-800">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Company / Username</p>
                    ${valueNode(request.company_name || request.username)}
                </div>
                <div className="p-3 rounded-2xl bg-gray-50 dark:bg-midnight-900/40 border border-gray-100 dark:border-midnight-800">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Website / Social</p>
                    ${valueNode(request.website_or_social)}
                </div>
                <div className="md:col-span-2 p-3 rounded-2xl bg-gray-50 dark:bg-midnight-900/40 border border-gray-100 dark:border-midnight-800">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Use Case</p>
                    <p className="text-gray-900 dark:text-white font-medium whitespace-pre-wrap">${request.use_case || 'Not provided'}</p>
                </div>
                <div className="md:col-span-2 p-3 rounded-2xl bg-gray-50 dark:bg-midnight-900/40 border border-gray-100 dark:border-midnight-800">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Documents</p>
                    <div className="flex flex-wrap gap-2 text-xs">
                        <span className="px-2 py-1 rounded-full bg-white dark:bg-midnight-950 border border-gray-200 dark:border-midnight-800">Certificate: ${request.registration_certificate ? 'Provided' : 'Not provided'}</span>
                        <span className="px-2 py-1 rounded-full bg-white dark:bg-midnight-950 border border-gray-200 dark:border-midnight-800">Authorization: ${request.authorization_letter ? 'Provided' : 'Not provided'}</span>
                    </div>
                </div>
            </div>
        `;
    };

    const renderRequestCard = (item, isAdmin = false) => {
        const meta = statusMeta(item.status);
        return html`
            <div key=${item.id} className="p-5 flex flex-col gap-4 hover:bg-white dark:hover:bg-midnight-900 transition-colors">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                            <p className="font-black text-xl text-gray-900 dark:text-white tracking-widest uppercase">${item.sender_id}</p>
                            <${Badge} variant=${meta.variant}>${meta.label}</${Badge}>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[10px] sm:text-xs text-gray-500 dark:text-midnight-500 font-bold uppercase tracking-wider">
                            <span>Requested ${new Date(item.created_at).toLocaleDateString()}</span>
                            <span className="opacity-30">•</span>
                            <span>ID: #${item.id}</span>
                            ${item.organization_name && html`
                                <span>${item.organization_name}</span>
                            `}
                        </div>

                        ${renderSnapshot(item)}

                        ${item.admin_comment && html`
                            <div className="p-3 bg-gray-50 dark:bg-midnight-800 rounded-xl text-xs text-gray-600 dark:text-midnight-300 border border-gray-100 dark:border-midnight-800 flex gap-2">
                                <${Icon} name="message-square" size=${14} className="mt-0.5 shrink-0 text-primary-500" />
                                <div>
                                    <span className="font-bold text-gray-400 uppercase text-[10px] block mb-0.5">Admin Comment</span>
                                    ${item.admin_comment}
                                </div>
                            </div>
                        `}

                        ${isAdmin && item.status === 'pending' && html`
                            <div className="space-y-2 pt-1">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Admin Note</label>
                                <textarea
                                    value=${reviewComments[item.id] || ''}
                                    onChange=${(e) => handleReviewCommentChange(item.id, e.target.value)}
                                    rows=${3}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-midnight-900/50 text-gray-900 dark:text-white border border-gray-200 dark:border-midnight-800 rounded-2xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all text-sm"
                                    placeholder="Add context, request changes, or ask for verification."
                                />
                            </div>
                        `}
                    </div>

                    <div className="flex flex-col items-start lg:items-end gap-2">
                        ${item.status === 'need_verification' && html`
                            <a
                                href=${`#/sender-ids/verify/${item.id}`}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500 text-white text-xs font-black uppercase tracking-widest hover:bg-amber-600 transition-colors"
                            >
                                <${Icon} name="file-search" size=${14} />
                                Continue Verification
                            </a>
                        `}
                        ${item.status === 'rejected' && html`
                            <${Button}
                                variant="outline"
                                size="sm"
                                onClick=${() => {
                                    setRequestForm((prev) => ({ ...prev, sender_id: item.sender_id }));
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className="text-[10px] font-bold uppercase py-1"
                            >
                                Retry Request
                            </${Button}>
                        `}
                        ${isAdmin && html`
                            <${Button}
                                size="sm"
                                variant="outline"
                                onClick=${() => openRequestDetails(item)}
                                className="text-[10px] uppercase border-gray-300 dark:border-midnight-700"
                            >
                                View Details
                            </${Button}>
                            <div className="flex flex-wrap gap-2">
                                <${Button} size="sm" onClick=${() => updateSenderStatus(item.id, 'approved')} className="text-[10px] uppercase">Approve</${Button}>
                                <${Button} size="sm" variant="outline" onClick=${() => updateSenderStatus(item.id, 'need_verification')} className="text-[10px] uppercase border-amber-300 text-amber-700 dark:text-amber-300">Need Verification</${Button}>
                                <${Button} size="sm" variant="danger" onClick=${() => updateSenderStatus(item.id, 'rejected')} className="text-[10px] uppercase">Reject</${Button}>
                            </div>
                        `}
                    </div>
                </div>
            </div>
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

    const renderUserRequests = () => html`
        <div className="space-y-6">
            ${renderUserRequestForm()}
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
                        ${senderIds.map((item) => renderRequestCard(item, false))}
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
                        ` : pendingRequests.map((item) => renderRequestCard(item, true))}
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
                        ` : historyRequests.map((item) => renderRequestCard(item, true))}
                    </div>
                </${Card}>
            </div>
        </div>
    `;

    const renderDetailModal = () => {
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
            <div className=${`p-4 rounded-2xl bg-gray-50 dark:bg-midnight-900/50 border border-gray-100 dark:border-midnight-800 ${wide ? 'md:col-span-2' : ''}`}>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">${label}</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white whitespace-pre-wrap break-words">${value || 'Not provided'}</p>
            </div>
        `;

        return html`
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                <button
                    type="button"
                    className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
                    onClick=${closeRequestDetails}
                    aria-label="Close sender ID details"
                ></button>

                <div className="relative w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-3xl bg-white dark:bg-midnight-950 shadow-2xl border border-gray-100 dark:border-midnight-800">
                    <div className="p-6 border-b border-gray-100 dark:border-midnight-800 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-primary-600">Sender ID Application Snapshot</p>
                            <div className="flex flex-wrap items-center gap-3">
                                <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-widest uppercase">${detailRequest.sender_id}</h3>
                                <${Badge} variant=${meta.variant}>${meta.label}</${Badge}>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-midnight-400">
                                Request #${detailRequest.id} · Submitted ${new Date(detailRequest.created_at).toLocaleString()}
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            ${detailRequest.status === 'need_verification' && html`
                                <a
                                    href=${verificationLink}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500 text-white text-xs font-black uppercase tracking-widest hover:bg-amber-600 transition-colors"
                                >
                                    <${Icon} name="file-search" size=${14} />
                                    Verification Page
                                </a>
                            `}
                            <button
                                type="button"
                                onClick=${closeRequestDetails}
                                className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-gray-200 dark:border-midnight-800 text-gray-500 dark:text-midnight-300 hover:bg-gray-50 dark:hover:bg-midnight-900 transition-colors"
                                aria-label="Close details"
                            >
                                <${Icon} name="x" size=${18} />
                            </button>
                        </div>
                    </div>

                    <div className="max-h-[calc(90vh-110px)] overflow-y-auto p-6 space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            ${detailField('Requester Name', requester.full_name)}
                            ${detailField('Requester Email', requester.email)}
                            ${detailField('Requester Phone', requester.phone_number)}
                            ${detailField('Requester Role', requester.role)}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            ${detailField('Organization Name', organization.name)}
                            ${detailField('Organization Username', request.username || organization.username)}
                            ${detailField('Official Email', request.official_email)}
                            ${detailField('Website / Social Page', request.website_or_social)}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            ${detailField('Sender ID', request.sender_id || detailRequest.sender_id)}
                            ${detailField('Use Case', request.use_case, true)}
                            ${detailField('Registration Certificate', request.registration_certificate)}
                            ${detailField('Authorization Letter', request.authorization_letter)}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            ${detailField('Organization Plan', organization.plan_name)}
                            ${detailField('Organization Slug', organization.slug)}
                            ${detailField('Verification Submitted', detailRequest.verification_submitted_at ? new Date(detailRequest.verification_submitted_at).toLocaleString() : 'Not yet submitted')}
                            ${detailField('Verification Link', detailRequest.status === 'need_verification' ? verificationLink : 'Only shown when verification is required')}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            ${detailField('Documents Received', verification && Object.keys(verification).length ? 'Yes' : 'No')}
                            ${detailField('Admin Comment', detailRequest.admin_comment || 'No admin note yet')}
                        </div>

                        <div className="p-5 rounded-2xl bg-gray-50 dark:bg-midnight-900/50 border border-gray-100 dark:border-midnight-800">
                            <div className="flex items-center justify-between gap-3 mb-4">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Review Note</p>
                                    <p className="text-sm text-gray-500 dark:text-midnight-400">Leave a note before changing the approval state.</p>
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Current review: ${meta.label}</span>
                            </div>
                            <textarea
                                value=${reviewComments[detailRequest.id] || ''}
                                onChange=${(e) => handleReviewCommentChange(detailRequest.id, e.target.value)}
                                rows=${4}
                                className="w-full px-4 py-3 bg-white dark:bg-midnight-950 text-gray-900 dark:text-white border border-gray-200 dark:border-midnight-800 rounded-2xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all text-sm"
                                placeholder="Add review context, request changes, or explain verification requirements."
                            />
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center">
                            <div className="flex flex-wrap gap-2">
                                <${Button} size="sm" onClick=${() => updateSenderStatus(detailRequest.id, 'approved')} className="text-[10px] uppercase">Approve</${Button}>
                                <${Button} size="sm" variant="outline" onClick=${() => updateSenderStatus(detailRequest.id, 'need_verification')} className="text-[10px] uppercase border-amber-300 text-amber-700 dark:text-amber-300">Need Verification</${Button}>
                                <${Button} size="sm" variant="danger" onClick=${() => updateSenderStatus(detailRequest.id, 'rejected')} className="text-[10px] uppercase">Reject</${Button}>
                            </div>
                            <button
                                type="button"
                                onClick=${closeRequestDetails}
                                className="text-sm font-bold text-gray-500 dark:text-midnight-400 hover:text-gray-700 dark:hover:text-white transition-colors"
                            >
                                Close details
                            </button>
                        </div>
                    </div>
                </div>
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
            ${renderDetailModal()}
        </div>
    `;
};
