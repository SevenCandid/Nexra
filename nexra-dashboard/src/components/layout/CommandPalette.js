import { html, useState, useEffect, useRef } from '../../utils/htm.js';
import apiClient from '../../api/client.js';
import { Icon } from '../ui/index.js';

export const CommandPalette = ({ onNavigate, onImpersonate }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const inputRef = useRef(null);
    const debounceTimeout = useRef(null);

    // Global keyboard shortcut
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current.focus(), 100);
            setQuery('');
            setResults([]);
            setActiveIndex(0);
        }
    }, [isOpen]);

    // Search logic
    const handleSearch = (searchTerm) => {
        setQuery(searchTerm);
        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);

        if (!searchTerm.trim()) {
            setResults([]);
            return;
        }

        debounceTimeout.current = setTimeout(async () => {
            setLoading(true);
            try {
                // Determine search type
                let searchResults = [];

                // Page routes (static)
                const pages = [
                    { id: 'overview', title: 'Business Overview', icon: 'trending-up', type: 'page' },
                    { id: 'admin-transactions', title: 'Transaction Ledger', icon: 'dollar-sign', type: 'page' },
                    { id: 'approvals', title: 'Sender ID Approvals', icon: 'check-square', type: 'page' },
                    { id: 'management', title: 'Platform Management', icon: 'grid', type: 'page' },
                    { id: 'bugs', title: 'Bug Reports', icon: 'alert-triangle', type: 'page' },
                    { id: 'staff', title: 'Staff Management', icon: 'users', type: 'page' },
                    { id: 'users', title: 'Users Directory', icon: 'user-check', type: 'page' },
                    { id: 'audit', title: 'Audit Logs', icon: 'shield-check', type: 'page' },
                    { id: 'announcements', title: 'Announcements', icon: 'megaphone', type: 'page' },
                    { id: 'health', title: 'System Health', icon: 'activity', type: 'page' },
                ];

                const pageMatches = pages.filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()));
                searchResults = [...searchResults, ...pageMatches.map(p => ({ ...p, group: 'Pages' }))];

                // Fetch API search
                try {
                    const response = await apiClient.get('/admin/messages/search', { params: { q: searchTerm } });
                    const apiData = response.data;
                    
                    if (apiData.users) {
                        searchResults = [
                            ...searchResults, 
                            ...apiData.users.map(u => ({
                                id: u.id,
                                title: u.email,
                                subtitle: u.full_name,
                                icon: 'user',
                                group: 'Users',
                                raw: u,
                                type: 'user'
                            }))
                        ];
                    }

                    if (apiData.messages) {
                        searchResults = [
                            ...searchResults,
                            ...apiData.messages.map(m => ({
                                id: m.message_id,
                                title: m.recipient,
                                subtitle: m.content ? (m.content.substring(0, 40) + '...') : '',
                                icon: 'message-square',
                                group: 'Messages',
                                raw: m,
                                type: 'message'
                            }))
                        ];
                    }
                } catch (e) {
                    console.error("API search failed", e);
                }

                setResults(searchResults);
                setActiveIndex(0);
            } finally {
                setLoading(false);
            }
        }, 400);
    };

    const handleAction = (item) => {
        if (!item) return;
        
        if (item.type === 'page') {
            onNavigate(item.id);
            setIsOpen(false);
        } else if (item.type === 'user') {
            onNavigate('users');
            setIsOpen(false);
            // Optionally, handle impersonate here if passed down
            if (onImpersonate) onImpersonate(item.raw);
        } else {
            console.log("Selected item:", item);
        }
    };

    const handleKeyDownModal = (e) => {
        if (!results.length) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(prev => (prev > 0 ? prev - 1 : prev));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            handleAction(results[activeIndex]);
        }
    };

    if (!isOpen) return null;

    return html`
        <div className="fixed inset-0 z-[200] flex items-start justify-center pt-24 sm:pt-32 px-4">
            <!-- Backdrop -->
            <div 
                className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                onClick=${() => setIsOpen(false)}
            ></div>
            
            <!-- Modal -->
            <div 
                className="relative bg-white dark:bg-midnight-950 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-200 dark:border-midnight-800 animate-in zoom-in-95 duration-200"
                onKeyDown=${handleKeyDownModal}
            >
                <!-- Search Input -->
                <div className="flex items-center px-4 py-4 border-b border-gray-100 dark:border-midnight-800 gap-3">
                    <${Icon} name="search" size=${20} className="text-gray-400 shrink-0" />
                    <input
                        ref=${inputRef}
                        type="text"
                        value=${query}
                        onInput=${(e) => handleSearch(e.target.value)}
                        placeholder="Search users, transactions, or jump to page... (Esc to close)"
                        className="flex-1 bg-transparent border-none outline-none text-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600"
                    />
                    ${loading && html`
                        <div className="animate-spin text-primary-600 shrink-0"><${Icon} name="loader-2" size=${20} /></div>
                    `}
                    <div className="hidden sm:flex items-center gap-1 shrink-0">
                        <kbd className="px-2 py-1 bg-gray-100 dark:bg-midnight-900 rounded text-xs text-gray-500 font-sans border border-gray-200 dark:border-midnight-800">esc</kbd>
                    </div>
                </div>

                <!-- Results -->
                <div className="max-h-[60vh] overflow-y-auto p-2 no-scrollbar">
                    ${query && results.length === 0 && !loading && html`
                        <div className="p-8 text-center text-gray-500">
                            <${Icon} name="search-x" size=${48} className="mx-auto mb-4 opacity-20" />
                            <p>No results found for "${query}"</p>
                        </div>
                    `}
                    
                    ${!query && html`
                        <div className="p-8 text-center text-gray-400 text-sm">
                            Type to search globally across the platform.
                        </div>
                    `}

                    ${results.map((item, idx) => html`
                        <div 
                            key=${item.id + idx}
                            className="flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-colors ${idx === activeIndex ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400' : 'hover:bg-gray-50 dark:hover:bg-midnight-900 text-gray-700 dark:text-gray-300'}"
                            onClick=${() => handleAction(item)}
                            onMouseEnter=${() => setActiveIndex(idx)}
                        >
                            <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-midnight-800 flex items-center justify-center shrink-0">
                                <${Icon} name=${item.icon} size=${18} className=${idx === activeIndex ? 'text-primary-600' : 'text-gray-500'} />
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-bold truncate">${item.title}</p>
                                    <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-gray-100 dark:bg-midnight-800 text-gray-500">${item.group}</span>
                                </div>
                                ${item.subtitle && html`
                                    <p className="text-xs text-gray-500 truncate">${item.subtitle}</p>
                                `}
                            </div>
                            ${idx === activeIndex && html`
                                <div className="hidden sm:block text-xs text-primary-600 font-medium tracking-wide">Enter ↵</div>
                            `}
                        </div>
                    `)}
                </div>
            </div>
        </div>
    `;
};
