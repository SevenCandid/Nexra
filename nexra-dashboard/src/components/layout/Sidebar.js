import { html } from '../../utils/htm.js';
import { Icon } from '../ui/Icon.js';
import { useAuth } from '../../contexts/AuthContext.js';

export const Sidebar = ({ currentPage, onNavigate, onReportIssue }) => {
    const { user } = useAuth();
    const navItems = [
        { id: 'dashboard', label: 'Pulse', icon: 'home' },
        { id: 'campaigns', label: 'Campaigns', icon: 'send' },
        { id: 'contacts', label: 'Contacts', icon: 'users' },
        { id: 'messages', label: 'Messages', icon: 'message-square' },
        { id: 'pricing', label: 'Wallet & Credits', icon: 'credit-card' },
        { id: 'settings', label: 'Settings', icon: 'settings' }
    ];

    if (user?.role === 'superadmin' || user?.role === 'staff') {
        navItems.push({ id: 'admin-reports', label: 'Admin Reports', icon: 'bar-chart-2' });
    }

    return html`
        <aside className="hidden lg:flex lg:flex-col lg:w-72 bg-white dark:bg-midnight-950 border-r border-gray-200 dark:border-midnight-800 h-screen sticky top-0 transition-colors">
            <div className="p-6 border-b border-gray-200 dark:border-midnight-800 flex justify-center">
                <div className="dark:bg-white/5 dark:p-1 dark:rounded-xl dark:border dark:border-white/5 transition-all">
                    <img src="assets/NEXRA_IconBeside.png" alt="NEXRA Logo" className="h-14 lg:h-16 object-contain dark:contrast-125" />
                </div>
            </div>

            <nav className="flex-1 p-4 space-y-1 overflow-y-auto no-scrollbar">
                ${navItems.map((item) => html`
                    <button
                        key=${item.id}
                        onClick=${() => onNavigate(item.id)}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentPage === item.id
            ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 font-medium'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}"
                    >
                        <${Icon} name=${item.icon} size=${20} />
                        <span>${item.label}</span>
                    </button>
                `)}
            </nav>
            
            <div className="p-4 space-y-1 border-t border-gray-100 dark:border-midnight-800">
                <button
                    onClick=${() => onNavigate('sender-ids')}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${currentPage === 'sender-ids' ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400' : ''}"
                >
                    <${Icon} name="pen-tool" size=${20} />
                    <span>Sender IDs</span>
                </button>
                <button
                    onClick=${() => onNavigate('help')}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${currentPage === 'help' ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400' : ''}"
                >
                    <${Icon} name="help-circle" size=${20} />
                    <span>Help Center</span>
                </button>
                <button
                    onClick=${() => onNavigate('api-docs')}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${currentPage === 'api-docs' ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400' : ''}"
                >
                    <${Icon} name="code" size=${20} />
                    <span>API Docs</span>
                </button>
                <button
                    onClick=${onReportIssue}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors mt-2"
                >
                    <${Icon} name="alert-triangle" size=${20} />
                    <span>Report Issue</span>
                </button>
            </div>
        </aside>
    `;
};
