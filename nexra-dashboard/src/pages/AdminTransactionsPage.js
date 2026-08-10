import { html, useState, useEffect, useCallback } from '../utils/htm.js';
import apiClient from '../api/client.js';
import { Modal } from '../components/ui/Modal.js';

const SOURCE_LABELS = {
    paystack: { label: 'Paystack', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
    admin: { label: 'Admin', color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' },
};

const CATEGORY_LABELS = {
    paystack_topup: { label: 'Paystack Top-Up', icon: '💳' },
    topup: { label: 'Manual Top-Up', icon: '➕' },
    manual_deduction: { label: 'Manual Deduction', icon: '➖' },
    subscription_renewal: { label: 'Plan Renewal', icon: '🔄' },
};

const STATUS_STYLES = {
    success: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    failed: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    abandoned: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

function formatDate(dt) {
    if (!dt) return '—';
    const d = new Date(dt);
    return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function StatCard({ label, value, sub, accent }) {
    return html`
        <div className="bg-white dark:bg-midnight-900 rounded-2xl p-5 border border-gray-100 dark:border-midnight-800 flex flex-col gap-1 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-midnight-500">${label}</p>
            <p className="text-3xl font-black ${accent || 'text-gray-900 dark:text-white'}">${value}</p>
            ${sub ? html`<p className="text-xs text-gray-400 dark:text-midnight-500">${sub}</p>` : null}
        </div>
    `;
}

const AdjustBalanceModal = ({ isOpen, onClose, onSuccess, showToast }) => {
    const [organizations, setOrganizations] = useState([]);
    const [loadingOrgs, setLoadingOrgs] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        organization_id: '',
        amount: '',
        description: ''
    });

    useEffect(() => {
        if (isOpen) {
            setFormData({ organization_id: '', amount: '', description: '' });
            fetchOrganizations();
        }
    }, [isOpen]);

    const fetchOrganizations = async () => {
        setLoadingOrgs(true);
        try {
            const res = await apiClient.get('/platform/organizations?limit=200');
            setOrganizations(res.data.items || []);
        } catch (err) {
            showToast && showToast('Failed to load organizations', 'error');
        } finally {
            setLoadingOrgs(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.organization_id || !formData.amount || !formData.description) {
            showToast && showToast('Please fill all fields', 'error');
            return;
        }

        setSubmitting(true);
        try {
            await apiClient.post(`/billing/admin/adjust-balance?organization_id=${formData.organization_id}&amount=${formData.amount}&description=${encodeURIComponent(formData.description)}`);
            showToast && showToast('Balance adjusted successfully', 'success');
            onSuccess();
            onClose();
        } catch (err) {
            showToast && showToast(err?.response?.data?.detail || 'Failed to adjust balance', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    return html`
        <${Modal} isOpen=${isOpen} onClose=${onClose} title="Adjust Balance">
            <form onSubmit=${handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Organization</label>
                    <select
                        required
                        value=${formData.organization_id}
                        onChange=${e => setFormData({ ...formData, organization_id: e.target.value })}
                        disabled=${loadingOrgs || submitting}
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-midnight-900 border border-gray-200 dark:border-midnight-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all dark:text-white"
                    >
                        <option value="">Select an organization...</option>
                        ${organizations.map(org => html`
                            <option key=${org.id} value=${org.id}>${org.name} (ID: ${org.id})</option>
                        `)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Amount (GHS)</label>
                    <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="e.g. 50.00 or -20.00"
                        value=${formData.amount}
                        onChange=${e => setFormData({ ...formData, amount: e.target.value })}
                        disabled=${submitting}
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-midnight-900 border border-gray-200 dark:border-midnight-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all dark:text-white"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-midnight-400">Use negative values to deduct credit.</p>
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Description</label>
                    <textarea
                        required
                        placeholder="Reason for adjustment..."
                        value=${formData.description}
                        onChange=${e => setFormData({ ...formData, description: e.target.value })}
                        disabled=${submitting}
                        rows="3"
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-midnight-900 border border-gray-200 dark:border-midnight-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all dark:text-white resize-none"
                    ></textarea>
                </div>
                <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-midnight-800">
                    <button
                        type="button"
                        onClick=${onClose}
                        disabled=${submitting}
                        className="px-5 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-midnight-800 rounded-xl transition-colors"
                    >Cancel</button>
                    <button
                        type="submit"
                        disabled=${submitting}
                        className="px-5 py-2.5 text-sm font-semibold bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition-colors flex items-center gap-2"
                    >
                        ${submitting ? 'Processing...' : 'Submit Adjustment'}
                    </button>
                </div>
            </form>
        </${Modal}>
    `;
};

export const AdminTransactionsPage = ({ showToast }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [timeFilter, setTimeFilter] = useState('monthly');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchTransactions = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            let url = '/billing/admin/transactions?';
            if (timeFilter === 'daily') url += 'days=1';
            else if (timeFilter === 'weekly') url += 'days=7';
            else if (timeFilter === 'monthly') url += 'days=30';
            else if (timeFilter === 'all_time') url += 'all_time=true';
            else if (timeFilter === 'custom') {
                if (startDate) url += `&start_date=${startDate}T00:00:00Z`;
                if (endDate) url += `&end_date=${endDate}T23:59:59Z`;
            }
            
            const res = await apiClient.get(url);
            setData(res.data);
        } catch (err) {
            setError(err?.response?.data?.detail || 'Failed to load transactions.');
        } finally {
            setLoading(false);
        }
    }, [timeFilter, startDate, endDate]);

    useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

    const transactions = data?.transactions || [];

    const filtered = transactions.filter(tx => {
        if (filter !== 'all' && tx.source !== filter) return false;
        if (categoryFilter !== 'all' && tx.category !== categoryFilter) return false;
        if (search) {
            const q = search.toLowerCase();
            return (
                (tx.reference || '').toLowerCase().includes(q) ||
                (tx.customer_email || '').toLowerCase().includes(q) ||
                (tx.customer_name || '').toLowerCase().includes(q) ||
                (tx.organization_name || '').toLowerCase().includes(q) ||
                (tx.description || '').toLowerCase().includes(q)
            );
        }
        return true;
    });

    const totalGHS = filtered
        .filter(tx => tx.type === 'credit' && tx.status === 'success')
        .reduce((sum, tx) => sum + (tx.amount || 0), 0);

    const successCount = filtered.filter(tx => tx.status === 'success').length;

    return html`
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white">Transaction Ledger</h1>
                    <p className="text-sm text-gray-500 dark:text-midnight-400 mt-0.5">All Paystack payments and admin-credited transactions</p>
                </div>
                <div className="flex flex-col gap-2 items-end">
                    <div className="flex items-center gap-3">
                        <select
                            value=${timeFilter}
                            onChange=${e => setTimeFilter(e.target.value)}
                            className="px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-midnight-700 bg-white dark:bg-midnight-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                            <option value="all_time">All Time</option>
                            <option value="custom">Date Range</option>
                        </select>
                        <button
                            onClick=${() => setIsModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-violet-600 hover:bg-violet-700 text-white rounded-xl transition-colors"
                        >+ Adjust Balance</button>
                        <button
                            onClick=${fetchTransactions}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition-colors"
                        >Refresh</button>
                    </div>
                    ${timeFilter === 'custom' ? html`
                        <div className="flex items-center gap-2 mt-2">
                            <input 
                                type="date" 
                                value=${startDate} 
                                onChange=${e => setStartDate(e.target.value)}
                                className="px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-midnight-700 bg-white dark:bg-midnight-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                            <span className="text-gray-400">to</span>
                            <input 
                                type="date" 
                                value=${endDate} 
                                onChange=${e => setEndDate(e.target.value)}
                                className="px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-midnight-700 bg-white dark:bg-midnight-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                    ` : null}
                </div>
            </div>

            ${loading ? html`
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    ${[1,2,3,4].map(i => html`<div key=${i} className="bg-white dark:bg-midnight-900 rounded-2xl p-5 border border-gray-100 dark:border-midnight-800 h-24 animate-pulse" />`)}
                </div>
            ` : html`
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <${StatCard} label="Total Transactions" value=${data?.total ?? 0} sub="in selected period" />
                    <${StatCard} label="Paystack Payments" value=${data?.paystack_count ?? 0} sub="live from API" accent="text-emerald-600 dark:text-emerald-400" />
                    <${StatCard} label="Admin Credited" value=${data?.admin_count ?? 0} sub="manual & plan renewals" accent="text-violet-600 dark:text-violet-400" />
                    <${StatCard} label="Total Credited" value=${'GH₵ ' + totalGHS.toFixed(2)} sub="${successCount} successful" accent="text-primary-600 dark:text-primary-400" />
                </div>
            `}

            ${data?.paystack_error ? html`
                <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-700 dark:text-amber-400">
                    ⚠️ Paystack: ${data.paystack_error}
                </div>
            ` : null}

            <div className="bg-white dark:bg-midnight-900 rounded-2xl border border-gray-100 dark:border-midnight-800 p-4 flex flex-wrap gap-3 items-center">
                <div className="flex-1 min-w-52 relative">
                    <input
                        type="text"
                        placeholder="Search by reference, email, org…"
                        value=${search}
                        onInput=${e => setSearch(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-midnight-700 bg-gray-50 dark:bg-midnight-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                </div>
                <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-midnight-700 text-sm">
                    ${['all', 'paystack', 'admin'].map(s => html`
                        <button key=${s} onClick=${() => setFilter(s)}
                            className="px-4 py-2 font-medium transition-colors ${filter === s ? 'bg-primary-600 text-white' : 'bg-white dark:bg-midnight-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-midnight-800'}"
                        >${s === 'all' ? 'All Sources' : s === 'paystack' ? '💳 Paystack' : '🛠 Admin'}</button>
                    `)}
                </div>
                <select value=${categoryFilter} onChange=${e => setCategoryFilter(e.target.value)}
                    className="px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-midnight-700 bg-white dark:bg-midnight-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                    <option value="all">All Categories</option>
                    <option value="paystack_topup">Paystack Top-Up</option>
                    <option value="topup">Manual Top-Up</option>
                    <option value="subscription_renewal">Plan Renewal</option>
                    <option value="manual_deduction">Manual Deduction</option>
                </select>
            </div>

            <div className="bg-white dark:bg-midnight-900 rounded-2xl border border-gray-100 dark:border-midnight-800 overflow-hidden shadow-sm">
                ${loading ? html`
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                        <p className="text-sm text-gray-400 dark:text-midnight-500">Loading transactions…</p>
                    </div>
                ` : error ? html`
                    <div className="flex flex-col items-center justify-center py-20 gap-3 text-red-500">
                        <p className="font-semibold">${error}</p>
                    </div>
                ` : filtered.length === 0 ? html`
                    <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400 dark:text-midnight-500">
                        <p className="font-semibold text-base">No transactions found</p>
                        <p className="text-sm">Try widening the date range or clearing filters.</p>
                    </div>
                ` : html`
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-midnight-800">
                                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-midnight-500">Date</th>
                                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-midnight-500">Reference</th>
                                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-midnight-500">Source</th>
                                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-midnight-500">Category</th>
                                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-midnight-500">Customer / Org</th>
                                    <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-midnight-500">Amount (GHS)</th>
                                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-midnight-500">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-midnight-800">
                                ${filtered.map(tx => {
                                    const srcStyle = SOURCE_LABELS[tx.source] || SOURCE_LABELS.admin;
                                    const catMeta = CATEGORY_LABELS[tx.category] || { label: tx.category, icon: '•' };
                                    const statusStyle = STATUS_STYLES[tx.status] || STATUS_STYLES.abandoned;
                                    const isDebit = tx.type === 'debit';
                                    return html`
                                        <tr key=${tx.id} className="hover:bg-gray-50 dark:hover:bg-midnight-800/50 transition-colors">
                                            <td className="px-5 py-3.5 text-gray-500 dark:text-midnight-400 whitespace-nowrap">${formatDate(tx.created_at)}</td>
                                            <td className="px-5 py-3.5 max-w-xs">
                                                <p className="font-mono text-xs text-gray-700 dark:text-gray-300 truncate" title=${tx.reference}>${tx.reference}</p>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span className="px-2.5 py-1 rounded-lg text-xs font-semibold ${srcStyle.color}">${srcStyle.label}</span>
                                            </td>
                                            <td className="px-5 py-3.5 text-gray-700 dark:text-gray-300">
                                                <span title=${tx.description}>${catMeta.icon} ${catMeta.label}</span>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                ${tx.customer_email ? html`
                                                    <p className="text-gray-700 dark:text-gray-300 font-medium">${tx.customer_name || tx.customer_email}</p>
                                                    <p className="text-xs text-gray-400 dark:text-midnight-500">${tx.customer_email}</p>
                                                ` : tx.organization_name ? html`
                                                    <p className="text-gray-700 dark:text-gray-300 font-medium">${tx.organization_name}</p>
                                                    <p className="text-xs text-gray-400 dark:text-midnight-500">Org #${tx.organization_id}</p>
                                                ` : html`<span className="text-gray-300 dark:text-midnight-600">—</span>`}
                                            </td>
                                            <td className="px-5 py-3.5 text-right">
                                                <span className="font-bold text-base ${isDebit ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}">
                                                    ${isDebit ? '−' : '+'}GH₵ ${tx.amount?.toFixed(2)}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span className="px-2.5 py-1 rounded-lg text-xs font-semibold capitalize ${statusStyle}">${tx.status}</span>
                                            </td>
                                        </tr>
                                    `;
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="px-5 py-3 border-t border-gray-100 dark:border-midnight-800 text-xs text-gray-400 dark:text-midnight-500">
                        Showing ${filtered.length} of ${transactions.length} transactions
                    </div>
                `}
            </div>
            <${AdjustBalanceModal} isOpen=${isModalOpen} onClose=${() => setIsModalOpen(false)} onSuccess=${fetchTransactions} showToast=${showToast} />
        </div>
    `;
};
