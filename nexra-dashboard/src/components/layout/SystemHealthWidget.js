import apiClient from '../../api/client.js';
import { html, useState, useEffect, useRef, useMemo, useCallback } from '../../utils/htm.js';
import { Icon, Button, Badge, Card, Modal, Skeleton } from '../ui/index.js';
import { useAuth } from '../../context/index.js';

export const SystemHealthWidget = () => {
    const [health, setHealth] = useState(null);

    useEffect(() => {
        const checkHealth = () => {
            apiClient.get('/health/worker')
                .then(res => setHealth(res.data))
                .catch(() => setHealth({ status: 'error', reason: 'Failed to contact API' }));
        };
        checkHealth();
        const interval = setInterval(checkHealth, 15000);
        return () => clearInterval(interval);
    }, []);

    if (!health) return null;

    let bgClass = 'bg-gray-50 dark:bg-midnight-900';
    let textClass = 'text-gray-900 dark:text-white';
    let dotClass = 'bg-gray-400';
    let icon = 'activity';
    let label = 'Checking Status...';

    if (health.status === 'healthy') {
        bgClass = 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30';
        textClass = 'text-emerald-700 dark:text-emerald-400';
        dotClass = 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]';
        icon = 'check-circle';
        label = 'Resolve Worker is Healthy';
    } else if (health.status === 'degraded') {
        bgClass = 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30';
        textClass = 'text-amber-700 dark:text-amber-400';
        dotClass = 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]';
        icon = 'alert-triangle';
        label = 'Worker is Degraded';
    } else if (health.status === 'pending') {
        bgClass = 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30';
        textClass = 'text-blue-700 dark:text-blue-400';
        dotClass = 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]';
        icon = 'clock';
        label = 'Worker is Starting';
    } else {
        bgClass = 'bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30';
        textClass = 'text-red-700 dark:text-red-400';
        dotClass = 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)] animate-pulse';
        icon = 'x-circle';
        label = 'Worker is Offline (Dead)';
    }

    return html`
        <div className=${`flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 mb-6 ${bgClass}`}>
            <div className="flex items-center gap-3">
                <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-white/50 dark:bg-midnight-950/50 backdrop-blur-sm shadow-inner">
                    <span className=${`absolute w-2 h-2 rounded-full ${dotClass}`}></span>
                    ${health.status === 'healthy' && html`<span className="absolute w-2 h-2 rounded-full bg-emerald-500 animate-ping opacity-75"></span>`}
                </div>
                <div>
                    <h4 className=${`text-sm font-black ${textClass}`}>${label}</h4>
                    <p className=${`text-[10px] font-medium mt-0.5 opacity-80 ${textClass}`}>
                        ${health.reason || (health.last_run_at ? `Last active: ${new Date(health.last_run_at).toLocaleTimeString()}` : 'No runs recorded yet')}
                    </p>
                </div>
            </div>
            <div className="hidden sm:block">
                <div className="px-3 py-1.5 rounded-lg bg-white/40 dark:bg-midnight-950/40 backdrop-blur-md flex items-center gap-2 shadow-sm border border-white/50 dark:border-midnight-700/50">
                    <${Icon} name=${icon} size=${14} className=${textClass} />
                    <span className=${`text-[10px] font-black uppercase tracking-widest ${textClass}`}>System Liveness</span>
                </div>
            </div>
        </div>
    `;
};