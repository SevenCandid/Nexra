import apiClient from '../api/client.js';
import { html, useState, useEffect, useRef, useMemo, useCallback } from '../utils/htm.js';
import { Icon, Button, Badge, Card, Modal, Skeleton, TrendChart, ConfirmModal, Input, Dropdown, TemplateSelector } from '../components/ui/index.js';
import { useToast, useAuth } from '../context/index.js';
import { AdminStatCard, SystemHealthWidget, PlatformRow, DateFilterDropdown } from '../components/layout/index.js';

export const AuditLogPage = () => {
    const [logs, setLogs] = useState([]);
    const [filteredLogs, setFilteredLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [actionFilter, setActionFilter] = useState('');
    const [selectedLog, setSelectedLog] = useState(null);

    useEffect(() => {
        apiClient.get('/admin/audit-logs')
            .then(res => { 
                setLogs(res.data); 
                setFilteredLogs(res.data);
                setLoading(false); 
            })
            .catch(() => setLoading(false));
    }, []);

    useEffect(() => {
        const filtered = logs.filter(log => {
            const matchesSearch = log.admin_email.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesAction = actionFilter === '' || log.action === actionFilter;
            return matchesSearch && matchesAction;
        });
        setFilteredLogs(filtered);
    }, [searchTerm, actionFilter, logs]);

    if (loading) return html`
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 text-sm gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
            Loading audit trail...
        </div>
    `;

    const uniqueActions = [...new Set(logs.map(l => l.action))].sort();

    return html`
        <div className="space-y-6 fade-in max-w-6xl mx-auto pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold dark:text-white">Audit Logs</h2>
                    <p className="text-sm text-gray-500 dark:text-midnight-400">Security and management activity history.</p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative">
                        <${Icon} name="search" size=${16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search Admin Email..."
                            value=${searchTerm}
                            onChange=${(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 rounded-xl border border-gray-100 dark:border-midnight-800 bg-white dark:bg-midnight-900 text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all w-full sm:w-64"
                        />
                    </div>
                    <select
                        value=${actionFilter}
                        onChange=${(e) => setActionFilter(e.target.value)}
                        className="px-4 py-2 rounded-xl border border-gray-100 dark:border-midnight-800 bg-white dark:bg-midnight-900 text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                    >
                        <option value="">All Actions</option>
                        ${uniqueActions.map(action => html`<option value=${action}>${action}</option>`)}
                    </select>
                </div>
            </div>

            <${Card} className="overflow-hidden border-none lg:border lg:border-gray-100 lg:dark:border-midnight-800 bg-transparent lg:bg-white lg:dark:bg-midnight-900 shadow-none lg:shadow-sm">
                <!-- Desktop Table -->
                <div className="hidden lg:block overflow-x-auto no-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 dark:bg-midnight-900 border-b border-gray-100 dark:border-midnight-800">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Admin</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Action</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Target</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Timestamp</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-midnight-800">
                            ${filteredLogs.map(log => html`
                                <tr 
                                    key=${log.id} 
                                    onClick=${() => setSelectedLog(log)}
                                    className="hover:bg-gray-50/50 dark:hover:bg-midnight-900/20 transition-colors cursor-pointer group"
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-midnight-800 flex items-center justify-center text-primary-600 font-bold text-xs">
                                                ${log.admin_email.charAt(0).toUpperCase()}
                                            </div>
                                            <p className="text-xs font-bold text-gray-900 dark:text-white">${log.admin_email}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-primary-600 bg-primary-50 dark:bg-primary-900/20 px-2 py-1 rounded">
                                            ${log.action}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-xs text-gray-500 dark:text-midnight-400">
                                            <span className="font-bold text-gray-700 dark:text-midnight-200">${log.target_type}</span>: ${log.target_id || 'N/A'}
                                        </p>
                                    </td>
                                    <td className="px-6 py-4 text-right text-xs text-gray-400 group-hover:text-primary-500 transition-colors">
                                        ${new Date(log.created_at).toLocaleString()}
                                    </td>
                                </tr>
                            `)}
                        </tbody>
                    </table>
                </div>

                <!-- Mobile Card List -->
                <div className="lg:hidden space-y-4">
                    ${filteredLogs.map(log => html`
                        <div 
                            key=${log.id} 
                            onClick=${() => setSelectedLog(log)}
                            className="bg-white dark:bg-midnight-900 p-5 rounded-2xl border border-gray-100 dark:border-midnight-800 shadow-sm active:scale-[0.98] transition-transform"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center text-primary-600 font-bold">
                                        ${log.admin_email.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-[150px]">${log.admin_email}</p>
                                        <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mt-0.5">${log.action}</p>
                                    </div>
                                </div>
                                <span className="text-[10px] text-gray-400 font-medium bg-gray-50 dark:bg-midnight-800 px-2 py-1 rounded-lg">
                                    ${new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            <div className="pt-4 border-t border-gray-50 dark:border-midnight-800 flex justify-between items-center">
                                <p className="text-xs text-gray-500">
                                    Target: <span className="font-bold text-gray-700 dark:text-midnight-200">${log.target_type}</span> (${log.target_id || 'N/A'})
                                </p>
                                <${Icon} name="chevron-right" size=${16} className="text-gray-300" />
                            </div>
                        </div>
                    `)}
                </div>
            </${Card}>

            <${Modal} 
                isOpen=${!!selectedLog} 
                onClose=${() => setSelectedLog(null)}
                title="Action Details"
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Admin</p>
                            <p className="text-sm font-bold dark:text-white mt-1">${selectedLog?.admin_email}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Timestamp</p>
                            <p className="text-sm dark:text-white mt-1">${selectedLog ? new Date(selectedLog.created_at).toLocaleString() : ''}</p>
                        </div>
                    </div>
                    
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Action</p>
                        <p className="text-sm font-black text-primary-600 uppercase mt-1">${selectedLog?.action}</p>
                    </div>

                    <div className="p-4 bg-gray-50 dark:bg-midnight-950 rounded-2xl border border-gray-100 dark:border-midnight-800">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Technical Data</p>
                        <pre className="text-[11px] font-mono text-gray-600 dark:text-midnight-300 overflow-x-auto whitespace-pre-wrap">
                            ${JSON.stringify(selectedLog?.details || {}, null, 2)}
                        </pre>
                    </div>
                    
                    <${Button} className="w-full" onClick=${() => setSelectedLog(null)}>Close</${Button}>
                </div>
            </${Modal}>
        </div>
    `;
};