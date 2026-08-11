import apiClient from '../api/client.js';
import { html, useState, useEffect, useRef, useMemo, useCallback } from '../utils/htm.js';
import { Icon, Button, Badge, Card, Modal, Skeleton, TrendChart, ConfirmModal, Input, Dropdown, TemplateSelector } from '../components/ui/index.js';
import { useToast, useAuth } from '../context/index.js';
import { AdminStatCard, SystemHealthWidget, PlatformRow, DateFilterDropdown } from '../components/layout/index.js';

export const AdminUsersPage = () => {
    const { showToast } = useToast();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [exportOptions, setExportOptions] = useState({
        include_id: true,
        include_name: true,
        include_email: true,
        include_phone: true,
        include_role: true,
        include_organization: true
    });
    const [showExportModal, setShowExportModal] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await apiClient.get('/admin/users');
            setUsers(response.data);
        } catch (error) {
            console.error('Failed to fetch users:', error);
            showToast('Failed to load users', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        try {
            const response = await apiClient.get('/admin/users/export', {
                params: exportOptions,
                responseType: 'blob'
            });
            const blob = new Blob([response.data], { type: 'text/csv' });
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `nexra_users_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(downloadUrl);
            setShowExportModal(false);
            showToast('Export successful', 'success');
        } catch (error) {
            console.error('Export error:', error);
            showToast('Failed to export users', 'error');
        }
    };

    if (loading) return html`
        <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
        </div>
    `;

    return html`
        <div className="space-y-6 max-w-6xl mx-auto pb-20 fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold dark:text-white">Registered Users</h2>
                    <p className="text-sm text-gray-500 dark:text-midnight-400 mt-1">View all signed up users.</p>
                </div>
                <div className="relative">
                    <${Button} variant="primary" onClick=${() => setShowExportModal(!showExportModal)}>
                        <${Icon} name="download" size=${18} className="mr-2" />
                        Export to CSV
                    </${Button}>

                    ${showExportModal && html`
                        <div className="absolute right-0 mt-2 w-64 rounded-xl shadow-xl bg-white dark:bg-midnight-900 ring-1 ring-black/5 dark:ring-white/10 z-50 overflow-hidden">
                            <div className="p-4 border-b border-gray-100 dark:border-midnight-800 flex justify-between items-center">
                                <h3 className="font-bold text-sm dark:text-white">Export Options</h3>
                                <button onClick=${() => setShowExportModal(false)} className="text-gray-400 hover:text-gray-600">
                                    <${Icon} name="x" size=${16} />
                                </button>
                            </div>
                            <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                                ${Object.entries(exportOptions).map(([key, value]) => html`
                                    <label key=${key} className="flex items-center gap-3 cursor-pointer group">
                                        <div className="relative flex items-center justify-center">
                                            <input 
                                                type="checkbox" 
                                                checked=${value} 
                                                onChange=${(e) => setExportOptions({...exportOptions, [key]: e.target.checked})} 
                                                className="peer sr-only" 
                                            />
                                            <div className="w-5 h-5 border-2 border-gray-300 dark:border-midnight-600 rounded bg-white dark:bg-midnight-950 peer-checked:bg-primary-500 peer-checked:border-primary-500 transition-colors"></div>
                                            <${Icon} name="check" size=${14} className="absolute text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" />
                                        </div>
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Include ${key.replace('include_', '').charAt(0).toUpperCase() + key.replace('include_', '').slice(1)}
                                        </span>
                                    </label>
                                `)}
                                <${Button} variant="primary" className="w-full" onClick=${handleExport}>
                                    Download CSV
                                </${Button}>
                            </div>
                        </div>
                    `}
                </div>
            </div>

            <${Card} className="overflow-hidden border border-gray-100 dark:border-midnight-800 bg-white dark:bg-midnight-950">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 dark:bg-midnight-900/50 border-b border-gray-100 dark:border-midnight-800">
                                <th className="px-6 py-4 text-xs font-black text-gray-400 dark:text-midnight-400 uppercase tracking-widest">ID</th>
                                <th className="px-6 py-4 text-xs font-black text-gray-400 dark:text-midnight-400 uppercase tracking-widest">User</th>
                                <th className="px-6 py-4 text-xs font-black text-gray-400 dark:text-midnight-400 uppercase tracking-widest">Contact</th>
                                <th className="px-6 py-4 text-xs font-black text-gray-400 dark:text-midnight-400 uppercase tracking-widest">Role</th>
                                <th className="px-6 py-4 text-xs font-black text-gray-400 dark:text-midnight-400 uppercase tracking-widest">Organization</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-midnight-800/50">
                            ${users.map(u => html`
                                <tr key=${u.id} className="hover:bg-gray-50/30 dark:hover:bg-midnight-900/20 transition-colors">
                                    <td className="px-6 py-4">
                                        <span className="text-xs font-mono text-gray-400 dark:text-midnight-500">#${u.id}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-900 dark:text-gray-200">${u.full_name || 'N/A'}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-600 dark:text-midnight-300">${u.email}</div>
                                        ${u.phone_number && html`<div className="text-xs text-gray-400 dark:text-midnight-500 mt-0.5">${u.phone_number}</div>`}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className=${`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-widest ${
                                            u.role === 'superadmin' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                            u.role === 'staff' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                            'bg-gray-100 text-gray-700 dark:bg-midnight-800 dark:text-gray-400'
                                        }`}>
                                            ${u.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-900 dark:text-gray-300 font-medium">${u.organization_name}</div>
                                    </td>
                                </tr>
                            `)}
                            ${users.length === 0 && html`
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500 dark:text-midnight-400">
                                        No users found.
                                    </td>
                                </tr>
                            `}
                        </tbody>
                    </table>
                </div>
            </${Card}>
        </div>
    `;
};