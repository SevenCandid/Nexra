import { html, useState, useEffect } from '../utils/htm.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';
import { Icon } from '../components/ui/Icon.js';
import { Input } from '../components/ui/Input.js';
import { useToast } from '../contexts/ToastContext.js';
import apiClient from '../api/client.js';

const statusMeta = (status) => {
    const normalized = (status || 'pending').toLowerCase();
    if (normalized === 'approved') {
        return { label: 'Approved ✅', variant: 'success', tone: 'text-emerald-700 dark:text-emerald-400' };
    }
    if (normalized === 'need_verification') {
        return { label: 'Need Verification 🟡', variant: 'warning', tone: 'text-amber-700 dark:text-amber-400' };
    }
    if (normalized === 'rejected') {
        return { label: 'Rejected ❌', variant: 'error', tone: 'text-rose-700 dark:text-rose-400' };
    }
    return { label: 'Pending', variant: 'default', tone: 'text-gray-700 dark:text-midnight-400' };
};

export const SenderIDManagement = () => {
    const { showToast } = useToast();
    const [senderIds, setSenderIds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
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

    const handleChange = (field, value) => {
        setRequestForm((prev) => ({ ...prev, [field]: value }));
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

    return html`
        <div className="space-y-6 fade-in max-w-5xl mx-auto">
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
                        ${senderIds.map((item) => {
                            const meta = statusMeta(item.status);
                            return html`
                                <div key=${item.id} className="p-5 flex flex-col gap-4 hover:bg-white dark:hover:bg-midnight-900 transition-colors">
                                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                                        <div className="space-y-2">
                                            <div className="flex flex-wrap items-center gap-3">
                                                <p className="font-black text-xl text-gray-900 dark:text-white tracking-widest uppercase">${item.sender_id}</p>
                                                <${Badge} variant=${meta.variant}>${meta.label}</${Badge}>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2 text-[10px] sm:text-xs text-gray-500 dark:text-midnight-500 font-bold uppercase tracking-wider">
                                                <span>Requested ${new Date(item.created_at).toLocaleDateString()}</span>
                                                <span className="opacity-30">•</span>
                                                <span>ID: #${item.id}</span>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-sm">
                                                <div className="p-3 rounded-2xl bg-gray-50 dark:bg-midnight-900/40 border border-gray-100 dark:border-midnight-800">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Company / Username</p>
                                                    <p className="text-gray-900 dark:text-white font-medium">${item.company_name || item.username || 'Not provided'}</p>
                                                </div>
                                                <div className="p-3 rounded-2xl bg-gray-50 dark:bg-midnight-900/40 border border-gray-100 dark:border-midnight-800">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Use Case</p>
                                                    <p className="text-gray-900 dark:text-white font-medium line-clamp-2">${item.use_case || 'Not provided'}</p>
                                                </div>
                                                <div className="p-3 rounded-2xl bg-gray-50 dark:bg-midnight-900/40 border border-gray-100 dark:border-midnight-800">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Official Email</p>
                                                    <p className="text-gray-900 dark:text-white font-medium">${item.official_email || 'Not provided'}</p>
                                                </div>
                                                <div className="p-3 rounded-2xl bg-gray-50 dark:bg-midnight-900/40 border border-gray-100 dark:border-midnight-800">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Website / Social</p>
                                                    <p className="text-gray-900 dark:text-white font-medium truncate">${item.website_or_social || 'Optional'}</p>
                                                </div>
                                            </div>
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
                                        </div>
                                    </div>

                                    ${item.admin_comment && html`
                                        <div className="p-3 bg-gray-50 dark:bg-midnight-800 rounded-xl text-xs text-gray-600 dark:text-midnight-300 border border-gray-100 dark:border-midnight-800 flex gap-2">
                                            <${Icon} name="message-square" size=${14} className="mt-0.5 shrink-0 text-primary-500" />
                                            <div>
                                                <span className="font-bold text-gray-400 uppercase text-[10px] block mb-0.5">Admin Comment</span>
                                                ${item.admin_comment}
                                            </div>
                                        </div>
                                    `}
                                </div>
                            `;
                        })}
                    </div>
                `}
            </${Card}>
        </div>
    `;
};
