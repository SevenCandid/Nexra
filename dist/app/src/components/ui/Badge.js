import { html } from '../../utils/htm.js';

export const Badge = ({ children, variant = 'default', className = '' }) => {
    const variants = {
        default: 'bg-gray-100 text-gray-700 border-gray-200/50 dark:bg-midnight-800 dark:text-midnight-300 dark:border-midnight-700/50',
        success: 'bg-emerald-50 text-emerald-700 border-emerald-100/50 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50',
        warning: 'bg-amber-50 text-amber-700 border-amber-100/50 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/50',
        error: 'bg-rose-50 text-rose-700 border-rose-100/50 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800/50 font-semibold',
        info: 'bg-sky-50 text-sky-700 border-sky-100/50 dark:bg-sky-900/20 dark:text-sky-400 dark:border-sky-800/50',
        primary: 'bg-primary-50 text-primary-700 border-primary-100/50 dark:bg-primary-900/20 dark:text-primary-400 dark:border-primary-800/50',
    };

    return html`
        <span className=${`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold border ${variants[variant] || variants.default} ${className}`}>
            ${children}
        </span>
    `;
};
