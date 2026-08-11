import apiClient from '../api/client.js';
import { html, useState, useEffect, useRef, useMemo, useCallback } from '../utils/htm.js';
import { Icon, Button, Badge, Card, Modal, Skeleton, TrendChart, ConfirmModal, Input, Dropdown, TemplateSelector } from '../components/ui/index.js';
import { useToast, useAuth } from '../context/index.js';
import { AdminStatCard, SystemHealthWidget, PlatformRow, DateFilterDropdown } from '../components/layout/index.js';

export const AdminBugsPage = () => {
    const { showToast } = useToast();
    const [bugs, setBugs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchBugs();
    }, []);

    const fetchBugs = async () => {
        setLoading(true);
        try {
            const response = await apiClient.get('/bugs/');
            setBugs(response.data);
        } catch (error) {
            console.error('Failed to fetch bugs:', error);
            showToast('Failed to load bug reports', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (id, status) => {
        try {
            await apiClient.patch(`/bugs/${id}`, { status });
            showToast(`Bug report marked as ${status}`, 'success');
            fetchBugs();
        } catch (error) {
            showToast('Failed to update bug report', 'error');
        }
    };

    return html`
        <div className="space-y-4 lg:space-y-6 fade-in max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold dark:text-white">Bug Reports</h2>
                    <p className="text-sm text-gray-500 dark:text-midnight-400 mt-1">Manage platform issues reported by users.</p>
                </div>
                <${Button} onClick=${fetchBugs} variant="secondary" size="sm">
                    <${Icon} name="refresh-cw" size=${16} className=${loading ? 'animate-spin' : ''} />
                    Refresh
                </${Button}>
            </div>

            ${loading ? html`
                <div className="grid gap-4">
                    ${[1,2,3,4].map(i => html`
                        <div key=${i} className="bg-white dark:bg-midnight-900 border border-gray-100 dark:border-midnight-800 rounded-2xl p-5 shadow-sm">
                            <div className="flex justify-between mb-4">
                                <${Skeleton} className="w-1/3 h-5" />
                                <${Skeleton} className="w-24 h-5 rounded-full" />
                            </div>
                            <div className="space-y-2">
                                <${Skeleton} className="w-full h-4" />
                                <${Skeleton} className="w-5/6 h-4" />
                            </div>
                        </div>
                    `)}
                </div>
            ` : bugs.length === 0 ? html`
                <${Card} className="p-12 text-center text-gray-500 border-none lg:border">
                    <${Icon} name="check-circle" size=${64} className="mx-auto mb-4 text-green-500/20" />
                    <p className="text-lg font-medium">No bug reports</p>
                    <p className="text-sm">The platform is running smoothly.</p>
                </${Card}>
            ` : html`
                <div className="grid gap-3 lg:gap-4">
                    ${bugs.map((bug) => html`
                        <${Card} key=${bug.id} className="p-5 lg:p-6 flex flex-col md:flex-row md:items-start justify-between bg-white dark:bg-midnight-900 border-gray-100 dark:border-midnight-800 shadow-sm gap-4">
                            <div className="flex-1 space-y-3">
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 flex items-center justify-center shrink-0">
                                        <${Icon} name="alert-triangle" size=${20} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">${bug.subject}</h3>
                                        <div className="flex flex-wrap items-center gap-2 mt-1">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-gray-100 dark:bg-midnight-800 px-2 py-0.5 rounded">
                                                Org #${bug.organization_id} • User #${bug.user_id}
                                            </span>
                                            <span className="text-xs text-gray-400">•</span>
                                            <span className="text-xs text-gray-500">${new Date(bug.created_at).toLocaleString()}</span>
                                            <span className="text-xs text-gray-400">•</span>
                                            <${Badge} variant=${bug.status === 'resolved' ? 'success' : bug.status === 'in_progress' ? 'warning' : bug.status === 'closed' ? 'default' : 'error'}>
                                                ${bug.status.replace('_', ' ')}
                                            </${Badge}>
                                        </div>
                                    </div>
                                </div>
                                <div className="pl-13 text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap bg-gray-50 dark:bg-midnight-950 p-4 rounded-xl border border-gray-100 dark:border-midnight-800">
                                    ${bug.description}
                                </div>
                            </div>
                            
                            <div className="flex md:flex-col gap-2 w-full md:w-auto shrink-0 md:pl-4">
                                ${bug.status !== 'resolved' && bug.status !== 'closed' && html`
                                    <${Button} size="sm" className="flex-1 md:flex-none" onClick=${() => handleUpdateStatus(bug.id, 'resolved')}>
                                        Mark Resolved
                                    </${Button}>
                                    ${bug.status === 'open' && html`
                                        <${Button} variant="secondary" size="sm" className="flex-1 md:flex-none" onClick=${() => handleUpdateStatus(bug.id, 'in_progress')}>
                                            In Progress
                                        </${Button}>
                                    `}
                                `}
                                ${bug.status !== 'closed' && html`
                                    <${Button} variant="ghost" size="sm" className="flex-1 md:flex-none text-gray-500 hover:text-gray-700" onClick=${() => handleUpdateStatus(bug.id, 'closed')}>
                                        Close
                                    </${Button}>
                                `}
                            </div>
                        </${Card}>
                    `)}
                </div>
            `}
        </div>
    `;
};