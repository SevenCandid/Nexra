import { html, useState, useEffect, useRef } from '../../utils/htm.js';
import { Icon } from './Icon.js';
import apiClient from '../../api/client.js';

export const CommandPalette = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState({ campaigns: [], contacts: [], segments: [] });
    const [loading, setLoading] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(true);
            }
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };

        const handleCustomEvent = () => setIsOpen(true);

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('nexra:open-search', handleCustomEvent);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('nexra:open-search', handleCustomEvent);
        };
    }, []);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current.focus(), 100);
        } else {
            setQuery('');
            setResults({ campaigns: [], contacts: [], segments: [] });
        }
    }, [isOpen]);

    useEffect(() => {
        if (!query.trim()) {
            setResults({ campaigns: [], contacts: [], segments: [] });
            setLoading(false);
            return;
        }

        setLoading(true);

        const fetchResults = async () => {
            try {
                const res = await apiClient.get(`/search?q=${encodeURIComponent(query)}`);
                setResults(res.data);
            } catch (err) {
                console.error("Search failed", err);
            } finally {
                setLoading(false);
            }
        };

        const timer = setTimeout(fetchResults, 300);
        return () => clearTimeout(timer);
    }, [query]);

    if (!isOpen) return null;

    const navigateTo = (path) => {
        setIsOpen(false);
        window.location.hash = path;
    };

    const hasResults = results.campaigns.length > 0 || results.contacts.length > 0 || results.segments.length > 0;

    return html`
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 sm:pt-32">
            <div className="fixed inset-0 bg-midnight-950/80 backdrop-blur-sm transition-opacity" onClick=${() => setIsOpen(false)}></div>
            <div className="relative w-full max-w-2xl bg-white dark:bg-midnight-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-100 dark:border-midnight-800 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center px-4 py-3 border-b border-gray-100 dark:border-midnight-800">
                    <${Icon} name="search" size=${20} className="text-gray-400 dark:text-midnight-400 mr-3" />
                    <input 
                        ref=${inputRef}
                        type="text" 
                        value=${query}
                        onChange=${e => setQuery(e.target.value)}
                        placeholder="Search campaigns, contacts, segments..." 
                        className="flex-1 bg-transparent border-0 outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-midnight-500 text-lg"
                    />
                    <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 dark:text-midnight-500 bg-gray-100 dark:bg-midnight-800 px-2 py-1 rounded">
                        ESC
                    </div>
                </div>

                <div className="max-h-96 overflow-y-auto p-2">
                    ${loading && query.trim() ? html`
                        <div className="flex items-center justify-center py-10">
                            <${Icon} name="loader-2" size=${24} className="animate-spin text-primary-600" />
                        </div>
                    ` : !hasResults && query.trim() ? html`
                        <div className="text-center py-10 text-gray-500 dark:text-midnight-500">
                            <p>No results found for "${query}"</p>
                        </div>
                    ` : html`
                        ${results.campaigns.length > 0 && html`
                            <div className="mb-4">
                                <h3 className="px-3 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-midnight-500 mb-2">Campaigns</h3>
                                ${results.campaigns.map(c => html`
                                    <button onClick=${() => navigateTo(`/campaigns/${c.id}`)} className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-midnight-800/50 rounded-lg transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-lg">
                                                <${Icon} name="send" size=${16} />
                                            </div>
                                            <span className="text-sm font-medium text-gray-900 dark:text-white">${c.name}</span>
                                        </div>
                                        <span className="text-xs text-gray-500 dark:text-midnight-500 capitalize">${c.status}</span>
                                    </button>
                                `)}
                            </div>
                        `}

                        ${results.contacts.length > 0 && html`
                            <div className="mb-4">
                                <h3 className="px-3 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-midnight-500 mb-2">Contacts</h3>
                                ${results.contacts.map(c => html`
                                    <button onClick=${() => navigateTo(`/contacts`)} className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-midnight-800/50 rounded-lg transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
                                                <${Icon} name="user" size=${16} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900 dark:text-white">${c.name}</p>
                                                <p className="text-xs text-gray-500 dark:text-midnight-400">${c.phone_number}</p>
                                            </div>
                                        </div>
                                    </button>
                                `)}
                            </div>
                        `}

                        ${results.segments.length > 0 && html`
                            <div className="mb-2">
                                <h3 className="px-3 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-midnight-500 mb-2">Segments</h3>
                                ${results.segments.map(s => html`
                                    <button onClick=${() => navigateTo(`/contacts`)} className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-midnight-800/50 rounded-lg transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg">
                                                <${Icon} name="users" size=${16} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900 dark:text-white">${s.name}</p>
                                                ${s.description && html`<p className="text-xs text-gray-500 dark:text-midnight-400 line-clamp-1">${s.description}</p>`}
                                            </div>
                                        </div>
                                    </button>
                                `)}
                            </div>
                        `}
                    `}
                </div>
            </div>
        </div>
    `;
};
