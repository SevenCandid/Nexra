import { html } from '../../utils/htm.js';

export const Skeleton = ({ className = '', variant = 'default' }) => {
    const baseClasses = 'animate-pulse bg-gray-200 dark:bg-midnight-800 rounded';
    
    let variantClasses = '';
    if (variant === 'circular') {
        variantClasses = 'rounded-full';
    } else if (variant === 'text') {
        variantClasses = 'h-4 w-full';
    }

    return html`
        <div className="${baseClasses} ${variantClasses} ${className}"></div>
    `;
};
