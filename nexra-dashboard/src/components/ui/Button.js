import { html } from '../../utils/htm.js';

export const Button = ({ children, variant = 'primary', size = 'md', className = '', ...props }) => {
    const baseClasses = 'font-bold rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2';

    const variants = {
        primary: 'bg-primary-600 hover:bg-primary-700 text-white shadow-lg shadow-primary-600/20',
        secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-900 dark:bg-midnight-800 dark:hover:bg-midnight-700 dark:text-white',
        outline: 'border-2 border-primary-600 text-primary-600 hover:bg-primary-50 dark:hover:bg-midnight-900/50 dark:border-primary-500 dark:text-primary-400',
        danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/20',
        ghost: 'hover:bg-gray-100 dark:hover:bg-midnight-800 text-gray-700 dark:text-gray-300',
    };

    const sizes = {
        sm: 'px-3 py-1 text-[11px] sm:text-xs uppercase tracking-wider',
        md: 'px-4 py-2 text-xs sm:text-sm uppercase tracking-wider',
        lg: 'px-6 py-3 text-sm sm:text-base uppercase tracking-wider',
    };

    return html`
        <button
            className=${`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
            ...${props}
        >
            ${children}
        </button>
    `;
};
