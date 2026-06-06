import { html, useState, useEffect } from '../../utils/htm.js';
import { Icon } from './Icon.js';
import apiClient from '../../api/client.js';

export const TemplateSelector = ({ onSelect }) => {
    const [templates, setTemplates] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const fetchTemplates = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/templates');
            setTemplates(res.data);
        } catch (error) {
            console.error('Failed to fetch templates:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) fetchTemplates();
    }, [isOpen]);

    return html`
        <div className="relative">
            <button 
                type="button"
                onClick=${() => setIsOpen(!isOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 dark:bg-primary-900/10 hover:bg-primary-100 dark:hover:bg-primary-900/20 border border-primary-100 dark:border-primary-900/30 rounded-lg text-[10px] font-black text-primary-600 dark:text-primary-400 uppercase tracking-widest transition-all shadow-sm"
            >
                <${Icon} name="layout" size=${12} />
                Load Template
            </button>

            ${isOpen && html`
                <div className="absolute bottom-full mb-2 right-0 w-64 bg-white dark:bg-midnight-900 border border-gray-100 dark:border-midnight-800 rounded-2xl shadow-premium z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-3 border-b border-gray-50 dark:border-midnight-800 bg-gray-50/50 dark:bg-midnight-950/50 flex items-center justify-between">
                        <span className="text-[10px] font-black text-gray-400 dark:text-midnight-500 uppercase tracking-widest">Saved Templates</span>
                        <button onClick=${() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
                            <${Icon} name="x" size=${14} />
                        </button>
                    </div>
                    <div className="max-h-64 overflow-y-auto p-2 space-y-1">
                        ${loading ? html`<div className="p-4 text-center animate-pulse"><div className="h-4 w-24 bg-gray-100 dark:bg-midnight-800 rounded mx-auto"></div></div>` : 
                          templates.length === 0 ? html`<div className="p-4 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">No templates found</div>` :
                          templates.map(t => html`
                            <button
                                key=${t.id}
                                type="button"
                                onClick=${() => {
                                    onSelect(t.content);
                                    setIsOpen(false);
                                }}
                                className="w-full p-3 text-left hover:bg-primary-50 dark:hover:bg-primary-900/10 rounded-xl transition-colors group"
                            >
                                <p className="text-xs font-black text-gray-900 dark:text-white mb-0.5 group-hover:text-primary-600">${t.title}</p>
                                <p className="text-[10px] text-gray-500 dark:text-midnight-400 line-clamp-1 italic">"${t.content}"</p>
                            </button>
                          `)}
                    </div>
                    <div className="p-3 border-t border-gray-50 dark:border-midnight-800 bg-gray-50/50 dark:bg-midnight-950/50">
                        <a href="#/templates" onClick=${() => setIsOpen(false)} className="text-[9px] font-black text-primary-600 dark:text-primary-400 uppercase tracking-widest hover:underline flex items-center justify-center gap-1.5">
                            <${Icon} name="settings" size=${10} />
                            Manage Templates
                        </a>
                    </div>
                </div>
            `}
        </div>
    `;
};
