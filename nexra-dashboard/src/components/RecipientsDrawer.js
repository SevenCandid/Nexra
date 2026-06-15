import { html, useState, useEffect } from '../utils/htm.js';
import { Icon } from './ui/Icon.js';
import { Badge } from './ui/Badge.js';
import apiClient from '../api/client.js';

const STATUS_BADGE = {
    delivered:     { variant: 'success',  label: 'Delivered' },
    submitted:     { variant: 'info',     label: 'Submitted' },
    pending:       { variant: 'warning',  label: 'Pending' },
    processing:    { variant: 'warning',  label: 'Processing' },
    failed:        { variant: 'danger',   label: 'Failed' },
    not_delivered: { variant: 'danger',   label: 'Not Delivered' },
};

const PAGE_SIZE = 50;

export const RecipientsDrawer = ({ campaign, onClose }) => {
    const [recipients, setRecipients] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const isOpen = !!campaign;

    useEffect(() => {
        if (!campaign) return;
        setPage(0);
        setSearch('');
    }, [campaign?.id]);

    useEffect(() => {
        if (!campaign) return;
        fetchRecipients();
    }, [campaign?.id, page]);

    const fetchRecipients = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get(
                `/campaigns/${campaign.id}/recipients`,
                { params: { skip: page * PAGE_SIZE, limit: PAGE_SIZE } }
            );
            setRecipients(res.data.items || []);
            setTotal(res.data.total || 0);
        } catch (e) {
            console.error('Failed to fetch recipients', e);
        } finally {
            setLoading(false);
        }
    };

    const filtered = search
        ? recipients.filter(r =>
            r.phone.includes(search) ||
            (r.name && r.name.toLowerCase().includes(search.toLowerCase()))
          )
        : recipients;

    const totalPages = Math.ceil(total / PAGE_SIZE);

    const getInitial = (r) => {
        if (r.name) return r.name.charAt(0).toUpperCase();
        return r.phone.slice(-2);
    };

    const getAvatarColor = (str) => {
        const colors = [
            'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400',
            'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400',
            'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
            'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
            'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
            'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
        ];
        let hash = 0;
        for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
        return colors[Math.abs(hash) % colors.length];
    };

    const statusInfo = (status) => STATUS_BADGE[status] || { variant: 'default', label: status || 'Unknown' };

    return html`
        <>
            <!-- Backdrop -->
            <div
                onClick=${onClose}
                className=${`fixed inset-0 z-40 bg-midnight-950/30 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            ></div>

            <!-- Drawer Panel -->
            <div
                className=${`fixed top-0 right-0 h-full w-full max-w-md z-50 flex flex-col bg-white dark:bg-midnight-950 shadow-2xl transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
            >
                <!-- Header -->
                <div className="flex items-start justify-between p-5 border-b border-gray-100 dark:border-midnight-800 bg-white dark:bg-midnight-950">
                    <div>
                        <h2 className="text-base font-black text-gray-900 dark:text-white">Recipients</h2>
                        ${campaign && html`
                            <p className="text-xs text-gray-500 dark:text-midnight-400 mt-0.5 font-medium truncate max-w-[260px]">${campaign.name}</p>
                        `}
                        <p className="text-[11px] text-primary-600 dark:text-primary-400 font-bold mt-1">${total} total recipients</p>
                    </div>
                    <button
                        onClick=${onClose}
                        className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-midnight-800 hover:text-gray-600 transition-all"
                    >
                        <${Icon} name="x" size=${18} />
                    </button>
                </div>

                <!-- Search -->
                <div className="p-4 border-b border-gray-50 dark:border-midnight-800/50">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                            <${Icon} name="search" size=${15} className="text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Filter by name or number…"
                            value=${search}
                            onInput=${e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-midnight-900 border border-gray-100 dark:border-midnight-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                        />
                    </div>
                </div>

                <!-- Recipient List -->
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    ${loading ? html`
                        <div className="flex flex-col gap-3 p-4">
                            ${[...Array(8)].map((_, i) => html`
                                <div key=${i} className="animate-pulse flex items-center gap-3 p-3">
                                    <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-midnight-800 flex-shrink-0"></div>
                                    <div className="flex-1 space-y-2">
                                        <div className="h-3 bg-gray-100 dark:bg-midnight-800 rounded w-3/4"></div>
                                        <div className="h-2.5 bg-gray-100 dark:bg-midnight-800 rounded w-1/2"></div>
                                    </div>
                                    <div className="h-5 w-16 bg-gray-100 dark:bg-midnight-800 rounded-full"></div>
                                </div>
                            `)}
                        </div>
                    ` : filtered.length === 0 ? html`
                        <div className="flex flex-col items-center justify-center h-48 text-center px-8">
                            <${Icon} name="users" size=${32} className="text-gray-200 dark:text-midnight-700 mb-3" />
                            <p className="text-sm font-bold text-gray-900 dark:text-white">No recipients found</p>
                            <p className="text-xs text-gray-400 mt-1">Try adjusting your search filter.</p>
                        </div>
                    ` : html`
                        <ul className="divide-y divide-gray-50 dark:divide-midnight-800/50">
                            ${filtered.map((r, idx) => {
                                const si = statusInfo(r.status);
                                const avatarCls = getAvatarColor(r.phone);
                                return html`
                                    <li key=${idx} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50 dark:hover:bg-midnight-900/30 transition-colors">
                                        <!-- Avatar -->
                                        <div className=${`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs ${avatarCls}`}>
                                            ${getInitial(r)}
                                        </div>

                                        <!-- Name / Phone -->
                                        <div className="flex-1 min-w-0">
                                            ${r.name
                                                ? html`<p className="text-sm font-semibold text-gray-900 dark:text-white truncate">${r.name}</p>`
                                                : html`<p className="text-sm font-semibold text-gray-500 dark:text-midnight-400 truncate">Unknown Contact</p>`
                                            }
                                            <p className="text-xs text-gray-400 dark:text-midnight-500 font-mono mt-0.5">${r.phone}</p>
                                        </div>

                                        <!-- Status Badge -->
                                        <${Badge} variant=${si.variant} className="text-[10px] flex-shrink-0">${si.label}</${Badge}>
                                    </li>
                                `;
                            })}
                        </ul>
                    `}
                </div>

                <!-- Pagination Footer -->
                ${totalPages > 1 && !loading && html`
                    <div className="flex items-center justify-between p-4 border-t border-gray-100 dark:border-midnight-800 bg-white dark:bg-midnight-950 flex-shrink-0">
                        <p className="text-xs text-gray-500">
                            <span className="font-bold text-gray-900 dark:text-white">${page * PAGE_SIZE + 1}-${Math.min((page + 1) * PAGE_SIZE, total)}</span> of ${total}
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick=${() => setPage(p => Math.max(0, p - 1))}
                                disabled=${page === 0}
                                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-midnight-800 disabled:opacity-30 transition-all"
                            >
                                <${Icon} name="chevron-left" size=${16} />
                            </button>
                            <button
                                onClick=${() => setPage(p => Math.min(totalPages - 1, p + 1))}
                                disabled=${page >= totalPages - 1}
                                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-midnight-800 disabled:opacity-30 transition-all"
                            >
                                <${Icon} name="chevron-right" size=${16} />
                            </button>
                        </div>
                    </div>
                `}
            </div>
        </>
    `;
};
