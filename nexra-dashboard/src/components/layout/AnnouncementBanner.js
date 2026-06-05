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
        shell: 'from-rose-50 via-white to-rose-50 border-rose-200 text-rose-950 dark:from-rose-950/30 dark:via-midnight-950 dark:to-rose-950/15 dark:border-rose-900/40 dark:text-rose-200',
        iconBg: 'bg-rose-600 text-white',
        accent: 'bg-rose-500',
    },
    warning: {
        shell: 'from-amber-50 via-white to-amber-50 border-amber-200 text-amber-950 dark:from-amber-950/30 dark:via-midnight-950 dark:to-amber-950/15 dark:border-amber-900/40 dark:text-amber-200',
        iconBg: 'bg-amber-500 text-white',
        accent: 'bg-amber-500',
    },
    success: {
        shell: 'from-emerald-50 via-white to-emerald-50 border-emerald-200 text-emerald-950 dark:from-emerald-950/20 dark:via-midnight-950 dark:to-emerald-950/10 dark:border-emerald-900/40 dark:text-emerald-200',
        iconBg: 'bg-emerald-600 text-white',
        accent: 'bg-emerald-500',
    },
    info: {
        shell: 'from-primary-50 via-white to-primary-50 border-primary-200 text-primary-950 dark:from-primary-950/20 dark:via-midnight-950 dark:to-primary-950/10 dark:border-primary-900/40 dark:text-primary-200',
        iconBg: 'bg-primary-600 text-white',
        accent: 'bg-primary-500',
    },
};

const PRIORITY_META = {
    critical: { label: 'Critical', className: 'bg-rose-600 text-white shadow-rose-500/20' },
    high: { label: 'High', className: 'bg-amber-500 text-white shadow-amber-500/20' },
    normal: { label: 'Normal', className: 'bg-white/80 text-gray-700 border border-gray-200 dark:bg-midnight-950/70 dark:text-midnight-200 dark:border-midnight-800' },
    low: { label: 'Low', className: 'bg-gray-100 text-gray-600 border border-gray-200 dark:bg-midnight-900 dark:text-midnight-400 dark:border-midnight-800' },
};

const AnnouncementBanner = () => {
    const [announcements, setAnnouncements] = useState([]);
    const [dismissedIds, setDismissedIds] = useState([]);
    const [activeIndex, setActiveIndex] = useState(0);
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
    }, [activeIndex, visibleAnnouncements.length]);

    useEffect(() => {
        if (timerRef.current) clearInterval(timerRef.current);

        if (visibleAnnouncements.length > 1) {
            timerRef.current = window.setInterval(() => {
                setActiveIndex((current) => (current + 1) % visibleAnnouncements.length);
            }, 5000);
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [visibleAnnouncements.length]);

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
    const priority = (activeAnnouncement.priority || 'normal').toLowerCase();
    const priorityMeta = PRIORITY_META[priority] || PRIORITY_META.normal;
    const typeLabel =
        activeAnnouncement.type === 'emergency'
            ? 'Urgent Notice'
            : activeAnnouncement.type === 'warning'
                ? 'Heads Up'
                : activeAnnouncement.type === 'success'
                    ? 'Update'
                    : 'Platform Broadcast';

    return html`
        <div className="w-full pointer-events-auto">
            <div className="relative overflow-hidden rounded-2xl sm:rounded-[1.4rem] border shadow-lg sm:shadow-xl transition-all duration-300 ${typeTheme.shell} bg-gradient-to-r"
                 onMouseEnter=${() => {}}
                 onMouseLeave=${() => {}}>
                <div className=${`absolute inset-y-0 left-0 w-1 sm:w-1.5 ${typeTheme.accent} opacity-70 animate-pulse`}></div>
                <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-current/10 blur-3xl animate-pulse hidden sm:block"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 dark:from-white/0 dark:via-white/5 dark:to-white/0 animate-pulse"></div>

                <div className="relative px-3 py-2.5 sm:px-4 sm:py-3.5 flex items-center gap-2.5 sm:gap-3 min-h-[64px] sm:min-h-[76px]">
                    <div className="relative shrink-0 self-start sm:self-center">
                        <div className="absolute -inset-1 rounded-2xl bg-current/10 blur-md animate-pulse"></div>
                        <div className=${`relative w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center ${typeTheme.iconBg} shadow-sm`}>
                            <${Icon}
                                name=${activeAnnouncement.type === 'warning' ? 'alert-triangle' : activeAnnouncement.type === 'emergency' ? 'flame' : 'megaphone'}
                                size=${16}
                                className="sm:opacity-95 opacity-90"
                            />
                        </div>
                    </div>

                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
                            <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.28em] sm:tracking-[0.35em] opacity-70">${typeLabel}</span>
                            <span className=${`px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full text-[8px] sm:text-[10px] font-black uppercase tracking-widest ${priorityMeta.className}`}>
                                ${priorityMeta.label}
                            </span>
                        </div>
                        <h4 className="font-black text-[12px] sm:text-sm lg:text-[15px] leading-tight mb-0.5 sm:mb-1 truncate">${activeAnnouncement.title}</h4>
                        <p className="text-[11px] sm:text-[12px] leading-snug opacity-90 line-clamp-1 sm:line-clamp-2">${activeAnnouncement.content}</p>
                    </div>

                    <div className="shrink-0 flex flex-col items-end gap-2 sm:gap-2.5 self-stretch justify-between">
                        <button
                            type="button"
                            onClick=${() => handleDismiss(activeAnnouncement.id)}
                            className="p-1.5 sm:p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                            aria-label="Dismiss announcement"
                        >
                            <${Icon} name="x" size=${12} className="sm:opacity-80 opacity-70" />
                        </button>

                        ${visibleAnnouncements.length > 1 && html`
                            <div className="flex items-center gap-1.5 sm:gap-1">
                                ${visibleAnnouncements.map((announcement, index) => html`
                                    <button
                                        key=${announcement.id}
                                        type="button"
                                        onClick=${() => setActiveIndex(index)}
                                        className=${`h-1.5 rounded-full transition-all duration-300 ${
                                            activeIndex === index
                                                ? 'w-5 sm:w-6 bg-current shadow-sm'
                                                : 'w-1.5 sm:w-2 bg-current/30 hover:bg-current/50'
                                        }`}
                                        aria-label=${`Show announcement ${index + 1}`}
                                        aria-pressed=${activeIndex === index}
                                    ></button>
                                `)}
                            </div>
                        `}
                    </div>
                </div>
            </div>
        </div>
    `;
};

export { AnnouncementBanner };
