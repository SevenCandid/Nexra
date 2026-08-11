import apiClient from '../api/client.js';
import { html, useState, useEffect, useRef, useMemo, useCallback } from '../utils/htm.js';
import { Icon, Button, Badge, Card, Modal, Skeleton, TrendChart, ConfirmModal } from '../components/ui/index.js';
import { useToast, useAuth } from '../context/index.js';
import { AdminStatCard, SystemHealthWidget, PlatformRow, DateFilterDropdown } from '../components/layout/index.js';

export const PlatformManagementPage = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState('users'); // 'users' or 'orgs'
    const [data, setData] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const PAGE_SIZE = 20;
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setPage(0);
        fetchData(0);
    }, [activeTab]);

    const fetchData = async (pageNum = page) => {
        setLoading(true);
        try {
            const endpoint = activeTab === 'users' ? '/platform/users' : '/platform/organizations';
            const response = await apiClient.get(endpoint, {
                params: { skip: pageNum * PAGE_SIZE, limit: PAGE_SIZE }
            });
            // Handle both paginated {items,total} and legacy flat array responses
            const raw = response.data;
            if (raw && raw.items !== undefined) {
                setData(raw.items);
                setTotal(raw.total);
            } else {
                setData(Array.isArray(raw) ? raw : []);
                setTotal(Array.isArray(raw) ? raw.length : 0);
            }
        } catch (error) {
            showToast('Failed to fetch data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async (id, currentStatus) => {
        try {
            const endpoint = activeTab === 'users' ? `/platform/users/${id}` : `/platform/organizations/${id}`;
            await apiClient.patch(endpoint, { is_active: !currentStatus });
            showToast('Status updated successfully', 'success');
            fetchData();
        } catch (error) {
            showToast('Failed to update status', 'error');
        }
    };

    const handleTogglePermission = async (u, permission) => {
        try {
            const currentPerms = u.permissions || {};
            const newPerms = { ...currentPerms, [permission]: !currentPerms[permission] };
            await apiClient.patch(`/platform/users/${u.id}/permissions`, { permissions: newPerms });
            showToast('Permission delegated successfully', 'success');
            fetchData();
        } catch (error) {
            showToast('Delegation failed', 'error');
        }
    };

    const handlePromote = (u) => {
        setConfirmAction({
            open: true,
            title: 'Promote User?',
            message: `Promote ${u.email} to Superadmin? They will gain full platform access and management rights.`,
            onConfirm: async () => {
                try {
                    await apiClient.post(`/platform/users/${u.id}/promote`);
                    showToast(`${u.email} promoted to Superadmin!`, 'success');
                    setConfirmAction({ open: false });
                    fetchData();
                } catch (error) {
                    showToast(error.response?.data?.detail || 'Promotion failed', 'error');
                }
            }
        });
    };

    const handleImpersonate = (u) => {
        setConfirmAction({
            open: true,
            title: 'Impersonate User?',
            message: `Login as ${u.full_name}? This will grant you full access to their dashboard and account as if you were them.`,
            onConfirm: async () => {
                try {
                    const response = await apiClient.post(`/auth/admin/impersonate/${u.id}`);
                    const { access_token } = response.data;
                    const url = `index.html?impersonate_token=${access_token}#/dashboard`;
                    window.open(url, '_blank');
                    showToast(`Logged in as ${u.full_name}`, 'success');
                    setConfirmAction({ open: false });
                } catch (error) {
                    showToast('Impersonation failed', 'error');
                }
            }
        });
    };

    const [adjustmentModal, setAdjustmentModal] = useState({ open: false, org: null });
    const [adjAmount, setAdjAmount] = useState('');
    const [adjDesc, setAdjDesc] = useState('');
    const [adjLoading, setAdjLoading] = useState(false);

    const [planModal, setPlanModal] = useState({ open: false, org: null });
    const [selectedPlan, setSelectedPlan] = useState('');
    const [planLoading, setPlanLoading] = useState(false);

    const [confirmAction, setConfirmAction] = useState({ open: false, title: '', message: '', onConfirm: null });

    const handleAdjustBalance = async (e) => {
        e.preventDefault();
        if (!adjustmentModal.org) return;
        setAdjLoading(true);
        try {
            await apiClient.post('/billing/admin/adjust-balance', null, {
                params: {
                    organization_id: adjustmentModal.org.id,
                    amount: parseFloat(adjAmount),
                    description: adjDesc
                }
            });
            showToast('Balance adjusted successfully', 'success');
            setAdjustmentModal({ open: false, org: null });
            setAdjAmount('');
            setAdjDesc('');
            fetchData();
        } catch (error) {
            showToast(error.response?.data?.detail || 'Adjustment failed', 'error');
        } finally {
            setAdjLoading(false);
        }
    };

    const handleAssignPlan = async (e) => {
        if (e) e.preventDefault();
        if (!planModal.org) return;
        setPlanLoading(true);
        try {
            await apiClient.post('/billing/admin/assign-plan', null, {
                params: {
                    org_id: planModal.org.id,
                    plan_slug: selectedPlan || undefined
                }
            });
            showToast('Plan updated successfully', 'success');
            setPlanModal({ open: false, org: null });
            fetchData();
        } catch (error) {
            showToast(error.response?.data?.detail || 'Update failed', 'error');
        } finally {
            setPlanLoading(false);
        }
    };

    const handleDelete = (id, name) => {
        setConfirmAction({
            open: true,
            title: 'Delete Forever?',
            message: `Are you absolutely sure you want to delete ${name}? This action is irreversible and will remove all associated data.`,
            onConfirm: async () => {
                try {
                    const endpoint = activeTab === 'users' ? `/platform/users/${id}` : `/platform/organizations/${id}`;
                    await apiClient.delete(endpoint);
                    showToast('Deleted successfully', 'success');
                    setConfirmAction({ open: false });
                    fetchData();
                } catch (error) {
                    showToast(error.response?.data?.detail || 'Delete failed', 'error');
                }
            }
        });
    };

    const totalPages = Math.ceil(total / PAGE_SIZE);
    const handlePageChange = (newPage) => {
        setPage(newPage);
        fetchData(newPage);
    };

    return html`
        <div className="space-y-6 fade-in max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold dark:text-white">Platform Management</h2>
                    <p className="text-sm text-gray-500 dark:text-midnight-400 mt-1">Manage all users and organizations on the NEXRA platform.</p>
                </div>
            </div>

            <div className="flex bg-gray-100 dark:bg-midnight-900/50 p-1 rounded-2xl w-full sm:w-fit">
                <button 
                    onClick=${() => setActiveTab('users')}
                    className="flex-1 sm:px-8 py-2.5 text-xs font-bold rounded-xl transition-all ${activeTab === 'users' ? 'bg-white dark:bg-primary-600 text-primary-600 dark:text-white shadow-sm' : 'text-gray-500'}"
                >
                    Users
                </button>
                <button 
                    onClick=${() => setActiveTab('orgs')}
                    className="flex-1 sm:px-8 py-2.5 text-xs font-bold rounded-xl transition-all ${activeTab === 'orgs' ? 'bg-white dark:bg-primary-600 text-primary-600 dark:text-white shadow-sm' : 'text-gray-500'}"
                >
                    Organizations
                </button>
            </div>

            <${Card} className="overflow-hidden border-none lg:border lg:border-gray-200 lg:dark:border-midnight-800 bg-transparent lg:bg-white lg:dark:bg-midnight-900/40 shadow-none lg:shadow-sm">
                ${loading ? html`
                    <div className="divide-y divide-gray-100 dark:divide-midnight-800/50">
                        ${[1,2,3,4,5].map(i => html`
                            <div key=${i} className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-4 flex-1">
                                    <${Skeleton} variant="circular" className="w-10 h-10 shrink-0" />
                                    <div className="space-y-2 flex-1 max-w-sm">
                                        <${Skeleton} className="w-full h-4" />
                                        <${Skeleton} className="w-2/3 h-3" />
                                    </div>
                                </div>
                                <${Skeleton} className="w-20 h-8 rounded" />
                            </div>
                        `)}
                    </div>
                ` : html`
                    <!-- Desktop Table -->
                    <div className="hidden lg:block overflow-x-auto no-scrollbar">
                        <table className="w-full text-left min-w-[900px]">
                            <thead className="bg-gray-50 dark:bg-midnight-900/80 border-b border-gray-100 dark:border-midnight-800">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">${activeTab === 'users' ? 'User' : 'Organization'}</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">${activeTab === 'users' ? 'Role' : 'Plan / Created'}</th>
                                    ${activeTab === 'users' && user?.role === 'superadmin' && html`<th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Delegation</th>`}
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-midnight-800">
                                ${data.length === 0 ? html`
                                    <tr><td colSpan="5" className="px-6 py-12 text-center text-gray-400">No records found.</td></tr>
                                ` : data.map((item) => html`
                                    <tr key=${item.id} className="hover:bg-gray-50/50 dark:hover:bg-midnight-900/20 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-midnight-800 flex items-center justify-center text-primary-600 font-bold text-sm shadow-inner">
                                                    ${(item.full_name || item.name || item.email || '?').charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-gray-900 dark:text-white truncate max-w-[200px]">${item.full_name || item.name}</p>
                                                    <p className="text-[10px] text-gray-400 truncate max-w-[200px]">${item.email || item.slug}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className=${`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter ${item.is_active ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'}`}>
                                                ${item.is_active ? 'Active' : 'Restricted'}
                                            </span>
                                        </td>
                                        ${activeTab === 'users' ? html`
                                            <td className="px-6 py-4">
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 bg-gray-50 dark:bg-midnight-800 px-2 py-1 rounded">${item.role}</span>
                                            </td>
                                        ` : html`
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[10px] font-black uppercase text-primary-600 bg-primary-50 dark:bg-primary-900/30 px-2 py-0.5 rounded w-fit">${item.plan_slug || 'payg'}</span>
                                                    <span className="text-[10px] text-gray-400">${new Date(item.created_at).toLocaleDateString()}</span>
                                                </div>
                                            </td>
                                        `}
                                        ${activeTab === 'users' && user?.role === 'superadmin' && html`
                                            <td className="px-6 py-4">
                                                ${item.role === 'staff' ? html`
                                                    <div className="flex items-center gap-2">
                                                        <button 
                                                            onClick=${() => handleTogglePermission(item, 'manage_sender_ids')}
                                                            title="Toggle Sender ID Management"
                                                            className=${`p-1.5 rounded-lg transition-all ${item.permissions?.manage_sender_ids ? 'bg-primary-500 text-white' : 'bg-gray-100 dark:bg-midnight-800 text-gray-400'}`}
                                                        >
                                                            <${Icon} name="check-square" size=${14} />
                                                        </button>
                                                        <button 
                                                            onClick=${() => handleTogglePermission(item, 'manage_platform')}
                                                            title="Toggle Platform Management"
                                                            className=${`p-1.5 rounded-lg transition-all ${item.permissions?.manage_platform ? 'bg-primary-500 text-white' : 'bg-gray-100 dark:bg-midnight-800 text-gray-400'}`}
                                                        >
                                                            <${Icon} name="grid" size=${14} />
                                                        </button>
                                                    </div>
                                                ` : html`<span className="text-[10px] text-gray-300 italic">None</span>`}
                                            </td>
                                        `}
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                ${activeTab === 'users' && html`
                                                    <${Button} size="sm" variant="ghost" className="h-8 !px-3 text-primary-600 hover:bg-primary-50" title="Login as this user" onClick=${() => handleImpersonate(item)}>
                                                        <${Icon} name="user-check" size=${14} />
                                                    </${Button}>
                                                `}
                                                ${activeTab === 'orgs' && user?.role === 'superadmin' && html`
                                                    <${Button} size="sm" variant="ghost" className="h-8 !px-3 text-emerald-600 hover:bg-emerald-50" title="Give Credit" onClick=${() => setAdjustmentModal({ open: true, org: item })}>
                                                        <${Icon} name="plus-circle" size=${14} />
                                                    </${Button}>
                                                    <${Button} size="sm" variant="ghost" className="h-8 !px-3 text-primary-600 hover:bg-primary-50" title="Plan" onClick=${() => { setPlanModal({ open: true, org: item }); setSelectedPlan(item.plan_slug || ''); }}>
                                                        <${Icon} name="credit-card" size=${14} />
                                                    </${Button}>
                                                `}
                                                ${activeTab === 'users' && user?.role === 'superadmin' && item.role !== 'superadmin' && html`
                                                    <${Button} size="sm" variant="ghost" className="h-8 !px-3 text-amber-600 hover:bg-amber-50" title="Promote" onClick=${() => handlePromote(item)}>
                                                        <${Icon} name="chevrons-up" size=${14} />
                                                    </${Button}>
                                                `}
                                                <${Button} size="sm" variant=${item.is_active ? 'secondary' : 'primary'} className="h-8 !px-3" onClick=${() => handleToggleStatus(item.id, item.is_active)}>
                                                    <${Icon} name=${item.is_active ? 'shield-off' : 'shield-check'} size=${14} />
                                                </${Button}>
                                                <${Button} size="sm" variant="ghost" className="h-8 w-8 !p-0 text-rose-500 hover:bg-rose-50" onClick=${() => handleDelete(item.id, item.full_name || item.name)}>
                                                    <${Icon} name="trash-2" size=${16} />
                                                </${Button}>
                                            </div>
                                        </td>
                                    </tr>
                                `)}
                            </tbody>
                        </table>
                    </div>

                    <!-- Mobile Card List -->
                    <div className="lg:hidden space-y-4">
                        ${data.length === 0 ? html`
                            <div className="p-12 text-center text-gray-400">No records found.</div>
                        ` : data.map((item) => html`
                            <div key=${item.id} className="bg-white dark:bg-midnight-900/60 p-5 rounded-2xl border border-gray-100 dark:border-midnight-800 shadow-sm">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-midnight-800 flex items-center justify-center text-primary-600 font-bold text-lg shadow-inner">
                                            ${(item.full_name || item.name || item.email || '?').charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-[150px]">${item.full_name || item.name}</p>
                                            <p className="text-[10px] text-gray-400 truncate max-w-[150px]">${item.email || item.slug}</p>
                                        </div>
                                    </div>
                                    <span className=${`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter ${item.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                        ${item.is_active ? 'Active' : 'Restricted'}
                                    </span>
                                </div>
                                
                                <div className="flex items-center gap-4 py-3 border-t border-gray-50 dark:border-midnight-800">
                                    ${activeTab === 'users' ? html`
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Role</p>
                                            <p className="text-xs font-bold dark:text-gray-300 mt-1 uppercase">${item.role}</p>
                                        </div>
                                    ` : html`
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Plan</p>
                                            <p className="text-xs font-black text-primary-600 mt-1 uppercase">${item.plan_slug || 'payg'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Created</p>
                                            <p className="text-xs font-medium text-gray-500 mt-1">${new Date(item.created_at).toLocaleDateString()}</p>
                                        </div>
                                    `}
                                </div>

                                <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-50 dark:border-midnight-800">
                                    ${activeTab === 'users' && html`
                                        <${Button} size="sm" variant="ghost" className="h-10 w-10 !p-0 text-primary-600" title="Impersonate" onClick=${() => handleImpersonate(item)}>
                                            <${Icon} name="user-check" size=${18} />
                                        </${Button}>
                                    `}
                                    ${activeTab === 'orgs' && user?.role === 'superadmin' && html`
                                        <${Button} size="sm" variant="ghost" className="h-10 w-10 !p-0 text-emerald-600" onClick=${() => setAdjustmentModal({ open: true, org: item })}>
                                            <${Icon} name="plus-circle" size=${18} />
                                        </${Button}>
                                        <${Button} size="sm" variant="ghost" className="h-10 w-10 !p-0 text-primary-600" onClick=${() => { setPlanModal({ open: true, org: item }); setSelectedPlan(item.plan_slug || ''); }}>
                                            <${Icon} name="credit-card" size=${18} />
                                        </${Button}>
                                    `}
                                    <${Button} size="sm" variant=${item.is_active ? 'secondary' : 'primary'} className="h-10 px-4 text-xs" onClick=${() => handleToggleStatus(item.id, item.is_active)}>
                                        <${Icon} name=${item.is_active ? 'shield-off' : 'shield-check'} size=${16} />
                                        ${item.is_active ? 'Restrict' : 'Activate'}
                                    </${Button}>
                                    <${Button} size="sm" variant="ghost" className="h-10 w-10 !p-0 text-rose-500" onClick=${() => handleDelete(item.id, item.full_name || item.name)}>
                                        <${Icon} name="trash-2" size=${18} />
                                    </${Button}>
                                </div>
                            </div>
                        `)}
                    </div>

                    ${totalPages > 1 && html`
                        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-midnight-800">
                            <span className="text-xs text-gray-500">Showing ${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, total)} of ${total}</span>
                            <div className="flex gap-2">
                                <${Button} size="sm" variant="secondary" onClick=${() => handlePageChange(page - 1)} disabled=${page === 0}>
                                    <${Icon} name="chevron-left" size=${14} /> Previous
                                </${Button}>
                                <${Button} size="sm" variant="secondary" onClick=${() => handlePageChange(page + 1)} disabled=${page >= totalPages - 1}>
                                    Next <${Icon} name="chevron-right" size=${14} />
                                </${Button}>
                            </div>
                        </div>
                    `}
                `}
            </${Card}>

            <${Modal} 
                isOpen=${adjustmentModal.open} 
                onClose=${() => setAdjustmentModal({ open: false, org: null })}
                title="Manual Credit Grant"
            >
                <form onSubmit=${handleAdjustBalance} className="space-y-4">
                    <p className="text-sm text-gray-500 mb-2">Manually give credits to: <span className="font-bold text-gray-900 dark:text-white">${adjustmentModal.org?.name}</span></p>
                    <div className="bg-emerald-50 dark:bg-emerald-900/10 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/20 mb-4">
                        <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-widest">Administrator Action</p>
                        <p className="text-xs text-emerald-600/80 dark:text-emerald-400/60 mt-1">This will instantly update the client's wallet balance. Positive values add credit, negative values subtract.</p>
                    </div>
                    <${Input} 
                        label="Amount to Grant (GHS)" 
                        type="number" 
                        step="0.01" 
                        placeholder="e.g. 100" 
                        value=${adjAmount}
                        onChange=${(e) => setAdjAmount(e.target.value)}
                        required
                    />
                    <${Input} 
                        label="Internal Reference / Reason" 
                        placeholder="Manual top-up for custom deal / support" 
                        value=${adjDesc}
                        onChange=${(e) => setAdjDesc(e.target.value)}
                        required
                    />
                    <div className="pt-4 flex gap-3">
                        <${Button} type="button" variant="ghost" className="flex-1" onClick=${() => setAdjustmentModal({ open: false, org: null })}>Cancel</${Button}>
                        <${Button} type="submit" variant="primary" className="flex-1 bg-emerald-600 hover:bg-emerald-700 border-none text-white" disabled=${adjLoading}>
                            ${adjLoading ? 'Granting...' : 'Grant Credits'}
                        </${Button}>
                    </div>
                </form>
            </${Modal}>

            <${Modal} 
                isOpen=${planModal.open} 
                onClose=${() => setPlanModal({ open: false, org: null })}
                title="Manage Organization Plan"
            >
                <form onSubmit=${handleAssignPlan} className="space-y-4">
                    <div className="p-4 bg-primary-50 dark:bg-primary-900/10 rounded-2xl border border-primary-100 dark:border-primary-900/20 mb-4">
                        <p className="text-[10px] text-primary-700 dark:text-primary-400 font-bold uppercase tracking-widest">Plan Management</p>
                        <p className="text-xs text-primary-600/80 dark:text-primary-400/60 mt-1">Forcefully assign or cancel a subscription plan for <span className="font-bold text-primary-700 dark:text-primary-300">${planModal.org?.name}</span>.</p>
                    </div>

                    <div className="space-y-3">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Select New Plan</label>
                        <div className="grid grid-cols-1 gap-2">
                            ${[
                                { id: '', name: 'No Plan / Cancel Plan', desc: 'Remove all subscription benefits' },
                                { id: 'payg', name: 'Pay As You Go', desc: 'Standard usage-based pricing' },
                                { id: 'starter', name: 'Starter Plan', desc: 'GHS 25 / Month - 357 Credits' },
                                { id: 'enterprise', name: 'Enterprise Plan', desc: 'GHS 50 / Month - 833 Credits' }
                            ].map(p => html`
                                <button
                                    type="button"
                                    onClick=${() => setSelectedPlan(p.id)}
                                    className=${`flex flex-col items-start p-4 rounded-2xl border transition-all text-left ${selectedPlan === p.id ? 'bg-primary-50 border-primary-500 ring-1 ring-primary-500 dark:bg-primary-900/20' : 'bg-white dark:bg-midnight-900 border-gray-100 dark:border-midnight-800 hover:border-primary-200'}`}
                                >
                                    <div className="flex items-center justify-between w-full">
                                        <span className=${`text-sm font-bold ${selectedPlan === p.id ? 'text-primary-700 dark:text-primary-400' : 'text-gray-900 dark:text-white'}`}>${p.name}</span>
                                        ${selectedPlan === p.id && html`<${Icon} name="check-circle" size=${16} className="text-primary-500" />`}
                                    </div>
                                    <span className="text-[11px] text-gray-500 mt-0.5">${p.desc}</span>
                                </button>
                            `)}
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <${Button} type="button" variant="ghost" className="flex-1" onClick=${() => setPlanModal({ open: false, org: null })}>Cancel</${Button}>
                        <${Button} type="submit" variant="primary" className="flex-1" disabled=${planLoading}>
                            ${planLoading ? 'Updating...' : 'Update Plan'}
                        </${Button}>
                    </div>
                </form>
            </${Modal}>

            <${ConfirmModal}
                isOpen=${confirmAction.open}
                onClose=${() => setConfirmAction({ ...confirmAction, open: false })}
                onConfirm=${confirmAction.onConfirm}
                title=${confirmAction.title}
                message=${confirmAction.message}
                variant="danger"
            />
        </div>
    `;
};