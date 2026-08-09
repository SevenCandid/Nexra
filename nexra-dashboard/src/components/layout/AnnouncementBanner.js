import { html, useEffect, useMemo, useRef, useState } from '../../utils/htm.js';
import apiClient from '../../api/client.js';
import { Icon } from '../ui/Icon.js';

const PRIORITY_RANK = {
    critical: 4,
    high: 3,
    normal: 2,
    low: 1,
};

const TYPE_THEME = {
    emergency: {
        shell: 'from-rose-50 via-white to-rose-50 border-rose-200 text-rose-950 dark:from-rose-950/30 dark:via-gray-900 dark:to-rose-950/15 dark:border-rose-900/40 dark:text-rose-200',
        iconColor: 'text-rose-600 dark:text-rose-400',
        accent: 'bg-rose-500',
    },
    warning: {
        shell: 'from-amber-50 via-white to-amber-50 border-amber-200 text-amber-950 dark:from-amber-950/30 dark:via-gray-900 dark:to-amber-950/15 dark:border-amber-900/40 dark:text-amber-200',
        iconColor: 'text-amber-600 dark:text-amber-400',
        accent: 'bg-amber-500',
    },
    success: {
        shell: 'from-emerald-50 via-white to-emerald-50 border-emerald-200 text-emerald-950 dark:from-emerald-950/20 dark:via-gray-900 dark:to-emerald-950/10 dark:border-emerald-900/40 dark:text-emerald-200',
        iconColor: 'text-emerald-600 dark:text-emerald-400',
        accent: 'bg-emerald-500',
    },
    info: {
        shell: 'from-primary-50 via-white to-primary-50 border-primary-200 text-primary-950 dark:from-primary-950/20 dark:via-gray-900 dark:to-primary-950/10 dark:border-primary-900/40 dark:text-primary-200',
        iconColor: 'text-primary-600 dark:text-primary-400',
        accent: 'bg-primary-500',
    },
};

const AnnouncementBanner = () => {
    const [announcements, setAnnouncements] = useState([]);
    const [dismissedIds, setDismissedIds] = useState([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [expanded, setExpanded] = useState(false);
    const timerRef = useRef(null);

    useEffect(() => {
        try {
            const saved = window.localStorage.getItem('nexra_dismissed_announcements');
            if (saved) setDismissedIds(JSON.parse(saved));
        } catch (_) {}
    }, []);

    const fetchAnnouncements = async () => {
        try {
            const res = await apiClient.get('/admin/announcements/active');
            setAnnouncements(res.data || []);
        } catch (_) {}
    };

    useEffect(() => {
        fetchAnnouncements();
        const refreshTimer = window.setInterval(fetchAnnouncements, 60000);
        return () => window.clearInterval(refreshTimer);
    }, []);

    const visibleAnnouncements = useMemo(() => {
        const filtered = announcements.filter((ann) => !dismissedIds.includes(ann.id));
        return [...filtered].sort((a, b) => {
            const aPriority = PRIORITY_RANK[(a.priority || 'normal').toLowerCase()] || PRIORITY_RANK.normal;
            const bPriority = PRIORITY_RANK[(b.priority || 'normal').toLowerCase()] || PRIORITY_RANK.normal;
            if (aPriority !== bPriority) return bPriority - aPriority;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
    }, [announcements, dismissedIds]);

    useEffect(() => {
        if (activeIndex >= visibleAnnouncements.length) {
            setActiveIndex(0);
        }
        setExpanded(false);
    }, [activeIndex, visibleAnnouncements.length]);

    useEffect(() => {
        if (visibleAnnouncements.length <= 1 || expanded) return;

        const timer = window.setInterval(() => {
            setActiveIndex((current) => {
                // If the array shrank while we were waiting, bounds check
                if (current + 1 >= visibleAnnouncements.length) return 0;
                return current + 1;
            });
        }, 5000);

        return () => window.clearInterval(timer);
    }, [visibleAnnouncements.length, expanded]);

    const handleDismiss = (id) => {
        setDismissedIds((prev) => {
            const next = prev.includes(id) ? prev : [...prev, id];
            try {
                window.localStorage.setItem('nexra_dismissed_announcements', JSON.stringify(next));
            } catch (_) {}
            return next;
        });
    };

    if (visibleAnnouncements.length === 0) return null;

    const activeAnnouncement = visibleAnnouncements[activeIndex] || visibleAnnouncements[0];
    const typeTheme = TYPE_THEME[(activeAnnouncement.type || 'info').toLowerCase()] || TYPE_THEME.info;

    const isLongContent = activeAnnouncement.content && activeAnnouncement.content.length > 80;

    return html`
        <div className="w-full pointer-events-auto z-50 flex-shrink-0">
            <div className=${`relative overflow-hidden border-b shadow-sm transition-all duration-300 ${typeTheme.shell} bg-gradient-to-r`}
                 onMouseEnter=${() => {}}
                 onMouseLeave=${() => {}}>
                <div className=${`absolute inset-y-0 left-0 w-1 ${typeTheme.accent} opacity-70 animate-pulse`}></div>
                <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-current/10 blur-3xl animate-pulse hidden sm:block"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 dark:from-white/0 dark:via-white/5 dark:to-white/0 animate-pulse pointer-events-none"></div>

                <div className="relative px-3 py-2 sm:px-4 sm:py-2 flex items-start sm:items-center gap-2 max-w-[1400px] mx-auto w-full">
                    <div className=${`shrink-0 mt-0.5 sm:mt-0 ${typeTheme.iconColor}`}>
                        <${Icon}
                            name=${activeAnnouncement.type === 'warning' ? 'alert-triangle' : activeAnnouncement.type === 'emergency' ? 'flame' : 'megaphone'}
                            size=${14}
                            className="opacity-90"
                        />
                    </div>

                    <div className="flex-1 min-w-0 flex flex-row items-center sm:items-baseline gap-1.5 sm:gap-2">
                        <div className=${`text-[11px] sm:text-[12px] leading-snug sm:leading-relaxed opacity-95 ${expanded ? 'whitespace-pre-wrap' : 'line-clamp-1 sm:line-clamp-2'}`}>
                            <span className="font-bold mr-1 sm:mr-2 text-[11px] sm:text-[13px]">${activeAnnouncement.title}</span>
                            <span>${activeAnnouncement.content}</span>
                        </div>
                        ${isLongContent && html`
                            <button 
                                onClick=${() => setExpanded(!expanded)} 
                                className="text-[10px] sm:text-[11px] font-bold opacity-70 hover:opacity-100 underline decoration-dotted underline-offset-2 transition-opacity shrink-0 whitespace-nowrap"
                            >
                                ${expanded ? 'Show less' : 'Read more'}
                            </button>
                        `}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-start sm:self-center ml-2">
                        ${visibleAnnouncements.length > 1 && html`
                            <div className="flex items-center gap-1">
                                ${visibleAnnouncements.map((announcement, index) => html`
                                    <button
                                        key=${announcement.id}
                                        type="button"
                                        onClick=${() => setActiveIndex(index)}
                                        className=${`h-1.5 rounded-full transition-all duration-300 ${
                                            activeIndex === index
                                                ? 'w-4 sm:w-5 bg-current shadow-sm'
                                                : 'w-1.5 sm:w-2 bg-current/30 hover:bg-current/50'
                                        }`}
                                        aria-label=${`Show announcement ${index + 1}`}
                                        aria-pressed=${activeIndex === index}
                                    ></button>
                                `)}
                            </div>
                        `}
                        <button
                            type="button"
                            onClick=${() => handleDismiss(activeAnnouncement.id)}
                            className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors -mr-1"
                            aria-label="Dismiss announcement"
                        >
                            <${Icon} name="x" size=${14} className="opacity-80" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
};

export { AnnouncementBanner };
