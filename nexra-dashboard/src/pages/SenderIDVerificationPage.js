import { html, useEffect, useState } from '../utils/htm.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';
import { Icon } from '../components/ui/Icon.js';
import { Input } from '../components/ui/Input.js';
import { useToast } from '../context/ToastContext.js';
import apiClient from '../api/client.js';

const statusMeta = (status) => {
    const normalized = (status || 'pending').toLowerCase();
    if (normalized === 'approved') return { label: 'Approved ✅', variant: 'success' };
    if (normalized === 'need_verification') return { label: 'Need Verification 🟡', variant: 'warning' };
    if (normalized === 'rejected') return { label: 'Rejected ❌', variant: 'error' };
    return { label: 'Pending', variant: 'default' };
};

export const SenderIDVerificationPage = ({ requestId }) => {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [request, setRequest] = useState(null);
    const [form, setForm] = useState({
        company_name: '',
        username: '',
        use_case: '',
        website_or_social: '',
        official_email: '',
        notes: '',
        registration_certificate: null,
        authorization_letter: null,
    });

    useEffect(() => {
        fetchRequest();
    }, [requestId]);

    const fetchRequest = async () => {
        setLoading(true);
        try {
            const response = await apiClient.get('/sender-ids');
            const found = (response.data || []).find((item) => item.id === requestId);
            setRequest(found || null);
            if (found) {
                setForm((prev) => ({
                    ...prev,
                    company_name: found.company_name || found.organization_name || '',
                    username: found.username || '',
                    use_case: found.use_case || '',
                    website_or_social: found.website_or_social || '',
                    official_email: found.official_email || '',
                }));
            }
        } catch (error) {
            console.error('Failed to load sender ID request:', error);
            showToast('Failed to load the verification page.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const setField = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!request) return;

        const payload = new FormData();
        payload.append('company_name', form.company_name || '');
        payload.append('username', form.username || '');
        payload.append('use_case', form.use_case || '');
        payload.append('website_or_social', form.website_or_social || '');
        payload.append('official_email', form.official_email || '');
        payload.append('notes', form.notes || '');
        if (form.registration_certificate) {
            payload.append('registration_certificate', form.registration_certificate);
        }
        if (form.authorization_letter) {
            payload.append('authorization_letter', form.authorization_letter);
        }

        setSubmitting(true);
        try {
            await apiClient.post(`/sender-ids/${request.id}/verification`, payload);
            showToast('Verification documents submitted successfully.', 'success');
            window.location.hash = '#/sender-ids';
        } catch (error) {
            showToast(error.response?.data?.detail || 'Unable to submit verification documents.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return html`
            <div className="max-w-4xl mx-auto">
                <${Card} className="p-12 text-center">
                    <div className="animate-spin inline-block text-primary-600"><${Icon} name="loader-2" size=${32} /></div>
                    <p className="text-sm text-gray-500 mt-4">Loading verification request...</p>
                </${Card}>
            </div>
        `;
    }

    if (!request) {
        return html`
            <div className="max-w-4xl mx-auto">
                <${Card} className="p-8 text-center space-y-4">
                    <div className="w-16 h-16 mx-auto rounded-full bg-red-50 text-red-600 flex items-center justify-center">
                        <${Icon} name="alert-triangle" size=${28} />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Verification request not found</h2>
                    <p className="text-sm text-gray-500 dark:text-midnight-400">The link may be outdated or the request may not belong to your organization.</p>
                    <${Button} onClick=${() => window.location.hash = '#/sender-ids'}>Back to Sender IDs</${Button}>
                </${Card}>
            </div>
        `;
    }

    const meta = statusMeta(request.status);

    return html`
        <div className="max-w-4xl mx-auto space-y-6 fade-in">
            <${Card} className="p-6 sm:p-8">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-[10px] font-black uppercase tracking-widest mb-3">
                            <${Icon} name="file-search" size=${12} />
                            Verification Page
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white">Submit Supporting Documents</h2>
                        <p className="text-sm text-gray-500 dark:text-midnight-400 mt-1">
                            Provide the requested documents so the team can finish reviewing your Sender ID.
                        </p>
                    </div>
                    <${Badge} variant=${meta.variant}>${meta.label}</${Badge}>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-midnight-900/50 border border-gray-100 dark:border-midnight-800">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Sender ID</p>
                        <p className="font-black text-xl text-gray-900 dark:text-white tracking-widest">${request.sender_id}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-midnight-900/50 border border-gray-100 dark:border-midnight-800">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Use Case</p>
                        <p className="text-sm text-gray-700 dark:text-midnight-300">${request.use_case || 'Not provided'}</p>
                    </div>
                </div>

                <form onSubmit=${handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <${Input}
                            label="Organization Name"
                            value=${form.company_name}
                            onChange=${(e) => setField('company_name', e.target.value)}
                            placeholder="Registered company name"
                        />
                        <${Input}
                            label="Username / Campaign Leader"
                            value=${form.username}
                            onChange=${(e) => setField('username', e.target.value)}
                            placeholder="Username or contact person"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <${Input}
                            label="Official Email Address"
                            type="email"
                            value=${form.official_email}
                            onChange=${(e) => setField('official_email', e.target.value)}
                            placeholder="official@company.com"
                        />
                        <${Input}
                            label="Website or Social Media Page"
                            value=${form.website_or_social}
                            onChange=${(e) => setField('website_or_social', e.target.value)}
                            placeholder="Optional"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-midnight-400 ml-1">Use Case</label>
                        <textarea
                            value=${form.use_case}
                            onChange=${(e) => setField('use_case', e.target.value)}
                            rows=${4}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-midnight-900/50 text-gray-900 dark:text-white border border-gray-200 dark:border-midnight-800 rounded-2xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all text-sm"
                            placeholder="Describe what you will send and why this Sender ID is needed."
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-midnight-400 ml-1">Registration Certificate</label>
                            <input
                                type="file"
                                accept=".pdf,.png,.jpg,.jpeg"
                                onChange=${(e) => setField('registration_certificate', e.target.files?.[0] || null)}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-midnight-900/50 text-gray-900 dark:text-white border border-gray-200 dark:border-midnight-800 rounded-2xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all text-sm file:mr-4 file:px-4 file:py-2 file:rounded-xl file:border-0 file:bg-primary-600 file:text-white file:font-bold"
                            />
                            <p className="text-[11px] text-gray-500 dark:text-midnight-500">
                                Recommended for registered businesses.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-midnight-400 ml-1">Authorization Letter</label>
                            <input
                                type="file"
                                accept=".pdf,.png,.jpg,.jpeg"
                                onChange=${(e) => setField('authorization_letter', e.target.files?.[0] || null)}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-midnight-900/50 text-gray-900 dark:text-white border border-gray-200 dark:border-midnight-800 rounded-2xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all text-sm file:mr-4 file:px-4 file:py-2 file:rounded-xl file:border-0 file:bg-primary-600 file:text-white file:font-bold"
                            />
                            <p className="text-[11px] text-gray-500 dark:text-midnight-500">
                                Required when requesting on behalf of another organization.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-midnight-400 ml-1">Notes</label>
                        <textarea
                            value=${form.notes}
                            onChange=${(e) => setField('notes', e.target.value)}
                            rows=${3}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-midnight-900/50 text-gray-900 dark:text-white border border-gray-200 dark:border-midnight-800 rounded-2xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all text-sm"
                            placeholder="Anything else we should know?"
                        />
                    </div>

                    <div className="rounded-2xl border border-amber-100 dark:border-amber-900/40 bg-amber-50/70 dark:bg-amber-900/10 p-4 text-sm text-amber-900 dark:text-amber-100">
                        <p className="font-bold mb-1">Verification checklist</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Organization name or username</li>
                            <li>Website or social page, if any</li>
                            <li>Registration certificate for businesses</li>
                            <li>Official email address</li>
                            <li>Authorization letter when needed</li>
                        </ul>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <${Button} type="submit" disabled=${submitting} className="sm:px-8">
                            ${submitting ? 'Submitting...' : 'Submit Verification Docs'}
                        </${Button}>
                        <button
                            type="button"
                            onClick=${() => window.location.hash = '#/sender-ids'}
                            className="px-4 py-2 rounded-2xl border border-gray-200 dark:border-midnight-800 text-sm font-bold text-gray-600 dark:text-midnight-300 hover:bg-gray-50 dark:hover:bg-midnight-900 transition-colors"
                        >
                            Back to Sender IDs
                        </button>
                    </div>
                </form>
            </${Card}>
        </div>
    `;
};
