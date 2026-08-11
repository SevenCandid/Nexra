import apiClient from '../api/client.js';
import { html, useState, useEffect, useRef, useMemo, useCallback } from '../utils/htm.js';
import { Icon, Button, Badge, Card, Modal, Skeleton, TrendChart, ConfirmModal } from '../components/ui/index.js';
import { useToast, useAuth } from '../context/index.js';
import { AdminStatCard, SystemHealthWidget, PlatformRow, DateFilterDropdown } from '../components/layout/index.js';

export const StaffManagementPage = () => {
    const { showToast } = useToast();
    const [invites, setInvites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        fetchInvites();
    }, []);

    const fetchInvites = async () => {
        try {
            const response = await apiClient.get('/staff/invites');
            setInvites(response.data);
        } catch (error) {
            console.error('Failed to fetch invites:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            await apiClient.post('/staff/invites');
            showToast('Unique Staff ID generated successfully!', 'success');
            fetchInvites();
        } catch (error) {
            showToast('Generation failed: Only Master Admin can generate codes.', 'error');
        } finally {
            setGenerating(false);
        }
    };

    if (loading) return html`<div className="p-8 text-center animate-pulse">Loading Staff IDs...</div>`;

    return html`
        <div className="space-y-6 fade-in max-w-5xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold dark:text-white">Staff Management</h2>
                    <p className="text-sm text-gray-500 dark:text-midnight-400 mt-1">Generate and track secure signup IDs for your employees.</p>
                </div>
                <${Button} onClick=${handleGenerate} disabled=${generating}>
                    <${Icon} name="plus-circle" size=${18} />
                    ${generating ? 'Generating...' : 'Generate New Staff ID'}
                </${Button}>
            </div>

            <${Card} className="overflow-hidden border-none lg:border lg:border-gray-200 lg:dark:border-midnight-800 bg-transparent lg:bg-white lg:dark:bg-midnight-900/40 shadow-none lg:shadow-sm">
                <!-- Desktop Table -->
                <table className="hidden lg:table w-full">
                    <thead className="bg-gray-50 dark:bg-midnight-900/80 border-b border-gray-200 dark:border-midnight-800">
                        <tr>
                            <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Official Staff ID</th>
                            <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                            <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Created At</th>
                            <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Used By</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-midnight-800">
                        ${invites.length === 0 ? html`
                            <tr>
                                <td colSpan="4" className="px-6 py-12 text-center text-gray-400">
                                    No staff IDs generated yet. Click the button above to start.
                                </td>
                            </tr>
                        ` : invites.map((item) => html`
                            <tr key=${item.id} className="hover:bg-gray-50 dark:hover:bg-midnight-900/30 transition-colors">
                                <td className="px-6 py-4">
                                    <span className="font-mono text-lg font-black text-primary-600 dark:text-primary-400 tracking-wider">
                                        ${item.staff_id}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <${Badge} variant=${item.is_used ? 'default' : 'success'}>
                                        ${item.is_used ? 'Redeemed' : 'Ready / Active'}
                                    </${Badge}>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    ${new Date(item.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 text-sm font-medium dark:text-gray-300">
                                    ${item.is_used ? html`
                                        <div className="flex items-center gap-2">
                                            <${Icon} name="user-check" size=${16} className="text-primary-500" />
                                            Active User #${item.used_by_id}
                                        </div>
                                    ` : html`<span className="text-gray-300 italic">Unassigned</span>`}
                                </td>
                            </tr>
                        `)}
                    </tbody>
                </table>

                <!-- Mobile Card List -->
                <div className="lg:hidden space-y-4">
                    ${invites.length === 0 ? html`
                        <div className="p-12 text-center text-gray-400">No staff IDs found.</div>
                    ` : invites.map((item) => html`
                        <div key=${item.id} className="bg-white dark:bg-midnight-900/60 p-5 rounded-2xl border border-gray-100 dark:border-midnight-800 shadow-sm">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Staff ID</span>
                                    <span className="font-mono text-xl font-black text-primary-600 dark:text-primary-400 tracking-wider">${item.staff_id}</span>
                                </div>
                                <${Badge} variant=${item.is_used ? 'default' : 'success'}>${item.is_used ? 'Redeemed' : 'Active'}</${Badge}>
                            </div>
                            <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-midnight-800">
                                <div className="text-[10px] text-gray-400 font-medium">
                                    Created: ${new Date(item.created_at).toLocaleDateString()}
                                </div>
                                <div className="text-xs font-bold dark:text-gray-300">
                                    ${item.is_used ? `User #${item.used_by_id}` : 'Unassigned'}
                                </div>
                            </div>
                        </div>
                    `)}
                </div>
            </${Card}>
            
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 p-4 rounded-xl flex gap-4">
                <${Icon} name="shield-alert" size=${24} className="text-amber-600 flex-shrink-0" />
                <div className="text-xs text-amber-800 dark:text-amber-400">
                    <p className="font-bold mb-1 uppercase tracking-wider">Security Notice</p>
                    <p>Generated Staff IDs are strictly single-use. Do not share these publicly. Only provide them to trusted employees for their initial registration.</p>
                </div>
            </div>
        </div>
    `;
};