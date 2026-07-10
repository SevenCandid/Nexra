import { html, useState } from '../../utils/htm.js';
import { Icon } from './Icon.js';

export const Input = ({ label, hint, type = 'text', className = '', ...props }) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

    return html`
        <div className="space-y-1.5 w-full">
            ${label && html`
                <div className="flex items-center justify-between ml-1 mb-0">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-midnight-400">${label}</label>
                    ${hint && html`<span className="text-[10px] font-semibold text-gray-400 dark:text-midnight-500">${hint}</span>`}
                </div>
            `}
            <div className="relative">
                <input
                    type=${inputType}
                    className=${`w-full px-4 py-2.5 bg-gray-50 dark:bg-midnight-900/50 text-gray-900 dark:text-white border border-gray-200 dark:border-midnight-800 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:focus:border-primary-500 transition-all outline-none text-sm ${className} ${isPassword ? 'pr-11' : ''}`}
                    ...${props}
                />
                ${isPassword && html`
                    <button 
                        type="button"
                        onClick=${() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-primary-500 transition-colors"
                    >
                        <${Icon} name=${showPassword ? 'eye-off' : 'eye'} size=${18} />
                    </button>
                `}
            </div>
        </div>
    `;
};
