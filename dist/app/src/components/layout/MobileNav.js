import { html } from '../../utils/htm.js';
import { Icon } from '../ui/Icon.js';

export const MobileNav = ({ currentPage, onNavigate }) => {
    const navItems = [
        { id: 'dashboard', label: 'Pulse', icon: 'home' },
        { id: 'campaigns', label: 'Campaigns', icon: 'send' },
        { id: 'contacts', label: 'Contacts', icon: 'users' },
        { id: 'messages', label: 'Messages', icon: 'message-square' },
        { id: 'api-docs', label: 'API', icon: 'code' },
    ];

    return html`
        <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[90%] max-w-sm glass rounded-2xl lg:hidden z-40 shadow-2xl transition-all">
            <div className="flex justify-around p-1">
                ${navItems.map((item) => html`
                    <button
                        key=${item.id}
                        onClick=${() => onNavigate(item.id)}
                        className="flex-1 flex flex-col items-center py-1.5 rounded-xl transition-all ${currentPage === item.id ? 'text-primary-600 dark:text-primary-400 bg-primary-50/50 dark:bg-primary-900/20 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-midnight-900/30'}"
                    >
                        <${Icon} name=${item.icon} size=${18} />
                        <span className="text-[9px] mt-0.5 font-bold uppercase tracking-wider">${item.label}</span>
                    </button>
                `)}
            </div>
        </nav>
    `;
};
