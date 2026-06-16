import { html, useState, useEffect } from '../utils/htm.js';
import { Icon } from './ui/Icon.js';
import apiClient from '../api/client.js';

export const AnnouncementsBanner = () => {
    const [announcements, setAnnouncements] = useState([]);
    const [dismissedIds, setDismissedIds] = useState([]);

    useEffect(() => {
        try {
            const saved = window.localStorage.getItem('nexra_dismissed_announcements');
            if (saved) {
                setDismissedIds(JSON.parse(saved));
            }
        } catch (_) {}
    }, []);

    useEffect(() => {
        apiClient.get('/admin/announcements/active')
            .then(res => setAnnouncements(res.data))
            .catch(() => {});
    }, []);

    const handleDismiss = (id) => {
        setDismissedIds((prev) => {
            const next = prev.includes(id) ? prev : [...prev, id];
            try {
                window.localStorage.setItem('nexra_dismissed_announcements', JSON.stringify(next));
            } catch (_) {}
            return next;
        });
    };

    const visibleAnnouncements = announcements.filter((ann) => !dismissedIds.includes(ann.id));

    if (visibleAnnouncements.length === 0) return null;

    return html`
        <div className="w-full z-50 flex flex-col shrink-0">
            ${visibleAnnouncements.map(ann => html`
                <div key=${ann.id} className="relative overflow-hidden p-3 sm:p-5 flex flex-col sm:flex-row gap-2.5 sm:gap-4 animate-slide-down shadow-sm
                    ${ann.type === 'warning' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white' : 
                      ann.type === 'emergency' ? 'bg-gradient-to-r from-rose-500 to-red-600 text-white' : 
                      'bg-gradient-to-r from-primary-600 to-indigo-600 text-white'}">
                    
                    <div className="absolute inset-y-0 left-0 w-1 bg-white opacity-40 animate-pulse"></div>
                    <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/10 blur-3xl animate-pulse hidden sm:block"></div>
                    
                    <div className="flex-shrink-0 relative self-start">
                        <div className="relative w-8 h-8 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center bg-white/20 border border-white/30 shadow-sm">
                            <${Icon} 
                                name=${ann.type === 'warning' ? 'alert-triangle' : ann.type === 'emergency' ? 'flame' : 'megaphone'} 
                                size=${16} 
                            />
                        </div>
                    </div>
                    
                    <div className="flex-1 relative z-10 min-w-0 pr-6">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
                            <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.25em] sm:tracking-[0.35em] leading-none opacity-80">Platform Broadcast</p>
                            <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full text-[8px] sm:text-[10px] font-black uppercase tracking-widest bg-white/30 border border-white/20 animate-pulse">
                                ${ann.type === 'emergency' ? 'Urgent' : ann.type === 'warning' ? 'Heads Up' : 'Notice'}
                            </span>
                        </div>
                        <h4 className="font-extrabold text-sm sm:text-xl leading-tight mb-1 sm:mb-2 text-white">${ann.title}</h4>
                        <div className="text-[12px] sm:text-sm leading-relaxed opacity-95 text-white whitespace-pre-wrap">${ann.content}</div>
                    </div>
                    
                    <button
                        type="button"
                        onClick=${() => handleDismiss(ann.id)}
                        className="absolute top-2 right-2 sm:top-3 sm:right-3 p-1.5 sm:p-2 rounded-full hover:bg-black/10 transition-colors z-20"
                        aria-label="Dismiss announcement"
                    >
                        <${Icon} name="x" size=${16} />
                    </button>
                </div>
            `)}
        </div>
    `;
};
