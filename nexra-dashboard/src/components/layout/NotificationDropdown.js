import { html, useState } from '../../utils/htm.js';
import { Icon } from '../ui/Icon.js';

export const NotificationDropdown = ({ notifications, onMarkRead, onMarkAllRead }) => {
    const [isOpen, setIsOpen] = useState(false);
    const unreadCount = notifications.filter(n => !n.is_read).length;

    return html`
        <div className="relative">
            <button 
                onClick=${() => setIsOpen(!isOpen)}
                className="relative p-2.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/10 rounded-2xl transition-all"
            >
                <${Icon} name="bell" size=${20} />
                ${unreadCount > 0 && html`
                    <span className="absolute top-2 right-2 w-4 h-4 bg-red-500 border-2 border-white dark:border-midnight-950 rounded-full text-[8px] font-black text-white flex items-center justify-center animate-pulse">
                        ${unreadCount}
                    </span>
                `}
            </button>

            ${isOpen && html`
                <div className="absolute top-full right-0 mt-3 w-80 bg-white dark:bg-midnight-900 border border-gray-100 dark:border-midnight-800 rounded-3xl shadow-premium z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                    <div className="p-4 border-b border-gray-50 dark:border-midnight-800 bg-gray-50/50 dark:bg-midnight-950/50 flex items-center justify-between">
                        <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest">Notifications</span>
                        <button onClick=${onMarkAllRead} className="text-[10px] font-bold text-primary-600 hover:underline">Mark all read</button>
                    </div>
                    
                    <div className="max-h-[360px] overflow-y-auto custom-scrollbar">
                        ${notifications.length === 0 ? html`
                            <div className="p-12 text-center text-gray-400 dark:text-midnight-500">
                                <${Icon} name="bell-off" size=${32} className="mx-auto mb-3 opacity-20" />
                                <p className="text-[10px] font-bold uppercase tracking-widest">All caught up!</p>
                            </div>
                        ` : notifications.map(n => html`
                            <div 
                                key=${n.id}
                                onClick=${() => {
                                    if (!n.is_read) onMarkRead(n.id);
                                    if (n.link) window.location.hash = n.link;
                                    setIsOpen(false);
                                }}
                                className="p-4 border-b border-gray-50 dark:border-midnight-800 hover:bg-gray-50 dark:hover:bg-midnight-950/50 cursor-pointer transition-colors relative group"
                            >
                                <div className="flex gap-4">
                                    <div className="mt-1">
                                        <div className="p-2 rounded-xl bg-primary-50 dark:bg-primary-900/10 text-primary-600">
                                            <${Icon} name=${
                                                n.type === 'success' ? 'check-circle' :
                                                n.type === 'error' ? 'alert-circle' :
                                                n.type === 'warning' ? 'alert-triangle' : 'info'
                                            } size=${16} />
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-0.5">
                                            <p className="text-xs font-black text-gray-900 dark:text-white">${n.title}</p>
                                            <span className="text-[9px] font-bold text-gray-400">${new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <p className="text-[11px] text-gray-600 dark:text-midnight-400 leading-relaxed">${n.message}</p>
                                    </div>
                                </div>
                                ${!n.is_read && html`<div className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary-600 rounded-full group-hover:h-full transition-all" />`}
                            </div>
                        `)}
                    </div>
                    
                    <div className="p-3 border-t border-gray-50 dark:border-midnight-800 text-center bg-gray-50/50 dark:bg-midnight-950/50">
                        <button onClick=${() => { window.location.hash = '#/notifications'; setIsOpen(false); }} className="text-[10px] font-black text-gray-400 dark:text-midnight-500 uppercase tracking-widest hover:text-primary-600">View All Updates</button>
                    </div>
                </div>
            `}
        </div>
    `;
};
