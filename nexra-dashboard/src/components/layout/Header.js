import { html, useState } from '../../utils/htm.js';
import { Icon } from '../ui/Icon.js';
import { Dropdown } from '../ui/Dropdown.js';
import { Button } from '../ui/Button.js';
import { NotificationDropdown } from './NotificationDropdown.js';

export const Header = ({ user, balance, onLogout, title, subtitle, onQuickSend, notifications, onMarkRead, onMarkAllRead }) => {
    const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
    
    const toggleDarkMode = () => {
        const root = document.documentElement;
        if (root.classList.contains('dark')) {
            root.classList.remove('dark');
            setIsDark(false);
        } else {
            root.classList.add('dark');
            setIsDark(true);
        }
    };

    return html`
        <header className="fixed top-2 left-1/2 -translate-x-1/2 w-[94%] max-w-lg glass rounded-2xl lg:hidden z-30 shadow-xl transition-all">
            <div className="px-4 py-2 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <div className="dark:bg-white/10 dark:p-0 dark:px-1 dark:rounded-lg dark:border dark:border-white/10 transition-all">
                        <img src="assets/NEXRA_IconBeside.png" alt="NEXRA Logo" className="h-8 object-contain dark:contrast-125" />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick=${toggleDarkMode}
                        className="p-1.5 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-all focus:outline-none flex items-center justify-center active:scale-90"
                        title=${isDark ? 'Switch to Light' : 'Switch to Dark'}
                    >
                        <${Icon} name=${isDark ? 'sun' : 'moon'} size=${16} className=${`rotate-icon ${isDark ? 'rotate-0' : 'rotate-[360deg]'}`} />
                    </button>

                    <${Dropdown}
                        trigger=${html`
                            <button className="flex items-center gap-2 p-1 px-2 hover:bg-gray-100 dark:hover:bg-midnight-800 rounded-xl transition-all">
                                <div className="text-right mr-1">
                                    <p className="text-xs font-bold text-gray-900 dark:text-white tracking-wide">${user?.organization_name || 'Personal'}</p>
                                </div>
                                <div className="h-7 w-7 bg-primary-100 dark:bg-primary-900/50 rounded-full flex items-center justify-center text-primary-700 dark:text-primary-400 font-bold border border-primary-200 dark:border-primary-800/50 text-xs">
                                    ${user?.full_name?.charAt(0) || 'U'}
                                </div>
                                <${Icon} name="chevron-down" size=${14} className="text-gray-400" />
                            </button>
                        `}
                    >
                        <div className="px-4 py-3 border-b border-gray-100 dark:border-midnight-800">
                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">${user?.full_name}</p>
                            <p className="text-[10px] font-bold text-primary-600 dark:text-primary-400 uppercase tracking-widest mt-0.5">${user?.organization_name || 'Personal'}</p>
                            <p className="text-[10px] text-gray-500 dark:text-midnight-400 truncate mt-0.5">${user?.email}</p>
                        </div>

                        <div className="px-4 py-3 border-b border-gray-50 dark:border-midnight-800 bg-primary-50/30 dark:bg-primary-900/10">
                            <p className="text-[10px] font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider mb-1">Available Balance</p>
                            <div className="flex items-center gap-2">
                                <${Icon} name="wallet" size=${16} className="text-primary-600 dark:text-primary-400" />
                                <span className="text-lg font-bold text-gray-900 dark:text-white">
                                    ${balance?.toFixed(2) || '0.00'} <span className="text-xs font-semibold text-gray-500 dark:text-midnight-400 ml-0.5">GHS</span>
                                </span>
                            </div>
                        </div>

                        <a href="#/pricing" className="flex items-center gap-2 px-4 py-3 text-sm text-gray-700 dark:text-midnight-200 hover:bg-gray-50 dark:hover:bg-midnight-800 transition-colors">
                            <${Icon} name="credit-card" size=${16} className="text-gray-400 dark:text-midnight-500" />
                            Wallet & Credits
                        </a>
                        <a href="#/sender-ids" className="flex items-center gap-2 px-4 py-3 text-sm text-gray-700 dark:text-midnight-200 hover:bg-gray-50 dark:hover:bg-midnight-800 transition-colors">
                            <${Icon} name="pen-tool" size=${16} className="text-gray-400 dark:text-midnight-500" />
                            Sender IDs
                        </a>
                        <a href="#/help" className="flex items-center gap-2 px-4 py-3 text-sm text-gray-700 dark:text-midnight-200 hover:bg-gray-50 dark:hover:bg-midnight-800 transition-colors">
                            <${Icon} name="help-circle" size=${16} className="text-gray-400 dark:text-midnight-500" />
                            Help & Support
                        </a>
                        <button onClick=${onReportIssue} className="flex w-full items-center gap-2 px-4 py-3 text-sm text-gray-700 dark:text-midnight-200 hover:bg-gray-50 dark:hover:bg-midnight-800 text-left transition-colors">
                            <${Icon} name="bug" size=${16} className="text-rose-400 dark:text-rose-500" />
                            Report a Bug
                        </button>
                        <button onClick=${onLogout} className="flex w-full items-center gap-2 px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-left transition-colors border-t border-gray-50 dark:border-midnight-800">
                            <${Icon} name="log-out" size=${16} />
                            Sign out
                        </button>
                    </${Dropdown}>
                </div>
            </div>
        </header>

        <header className="hidden lg:block bg-white/80 dark:bg-midnight-950/80 backdrop-blur-lg border-b border-gray-200 dark:border-midnight-800 sticky top-0 z-30 transition-colors">
            <div className="px-8 py-4 flex items-center justify-between gap-4">
                <div className="min-w-0 flex flex-col">
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate line-clamp-1 leading-tight">
                        ${title}
                    </h1>
                    ${subtitle && html`
                        <p className="text-xs text-gray-500 dark:text-midnight-400 truncate line-clamp-1">
                            ${subtitle}
                        </p>
                    `}
                </div>

                <div className="flex items-center gap-4">
                    <button 
                        onClick=${toggleDarkMode}
                        className="p-2 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800 transition-all focus:outline-none flex items-center justify-center active:scale-90"
                        aria-label="Toggle Dark Mode"
                    >
                        <${Icon} name=${isDark ? 'sun' : 'moon'} size=${18} className=${`rotate-icon ${isDark ? 'rotate-0' : 'rotate-[360deg]'}`} />
                    </button>

                    <${Button} 
                        variant="primary" 
                        size="sm" 
                        className="hidden sm:flex rounded-full px-5 py-2 font-bold text-[10px] uppercase tracking-widest gap-2 bg-primary-600 hover:bg-primary-700 text-white shadow-premium"
                        onClick=${onQuickSend}
                    >
                        <${Icon} name="send" size=${12} />
                        Quick Send
                    </${Button}>

                    <${NotificationDropdown}
                        notifications=${notifications || []}
                        onMarkRead=${onMarkRead}
                        onMarkAllRead=${onMarkAllRead}
                    />

                    <${Dropdown}
                        trigger=${html`
                            <button className="flex items-center gap-2 p-1 px-2 hover:bg-gray-100 dark:hover:bg-midnight-800 rounded-xl transition-all">
                                <div className="text-right mr-1">
                                    <p className="text-sm font-bold text-gray-900 dark:text-white tracking-wide">${user?.organization_name || 'Personal'}</p>
                                </div>
                                <div className="h-8 w-8 bg-primary-100 dark:bg-primary-900/50 rounded-full flex items-center justify-center text-primary-700 dark:text-primary-400 font-bold border border-primary-200 dark:border-primary-800/50">
                                    ${user?.full_name?.charAt(0) || 'U'}
                                </div>
                                <${Icon} name="chevron-down" size=${16} className="text-gray-400 dark:text-midnight-500" />
                            </button>
                        `}
                    >
                        <div className="px-4 py-3 border-b border-gray-100 dark:border-midnight-800">
                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">${user?.full_name}</p>
                            <p className="text-[10px] text-gray-500 dark:text-midnight-400 truncate mt-0.5">${user?.email}</p>
                        </div>

                        <div className="px-4 py-3 border-b border-gray-50 dark:border-midnight-800 bg-primary-50/30 dark:bg-primary-900/10">
                            <p className="text-[10px] font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider mb-1">Available Balance</p>
                            <div className="flex items-center gap-2">
                                <${Icon} name="wallet" size=${16} className="text-primary-600 dark:text-primary-400" />
                                <span className="text-lg font-bold text-gray-900 dark:text-white">
                                    ${balance?.toFixed(2) || '0.00'} <span className="text-xs font-semibold text-gray-500 dark:text-midnight-400 ml-0.5">GHS</span>
                                </span>
                            </div>
                        </div>

                        <a
                            href="#/pricing"
                            className="flex items-center gap-2 px-4 py-3 text-sm text-gray-700 dark:text-midnight-200 hover:bg-gray-50 dark:hover:bg-midnight-800 transition-colors"
                            role="menuitem"
                        >
                            <${Icon} name="credit-card" size=${16} className="text-gray-400 dark:text-midnight-500" />
                            Wallet & Credits
                        </a>
                        <a
                            href="#/help"
                            className="flex items-center gap-2 px-4 py-3 text-sm text-gray-700 dark:text-midnight-200 hover:bg-gray-50 dark:hover:bg-midnight-800 transition-colors"
                            role="menuitem"
                        >
                            <${Icon} name="help-circle" size=${16} className="text-gray-400 dark:text-midnight-500" />
                            Help & Support
                        </a>
                        <button
                            onClick=${onReportIssue}
                            className="flex w-full items-center gap-2 px-4 py-3 text-sm text-gray-700 dark:text-midnight-200 hover:bg-gray-50 dark:hover:bg-midnight-800 text-left transition-colors"
                            role="menuitem"
                        >
                            <${Icon} name="bug" size=${16} className="text-rose-400 dark:text-rose-500" />
                            Report a Bug
                        </button>
                        <button
                            onClick=${onLogout}
                            className="flex w-full items-center gap-2 px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-left transition-colors border-t border-gray-50 dark:border-midnight-800"
                            role="menuitem"
                        >
                            <${Icon} name="log-out" size=${16} />
                            Sign out
                        </button>
                    </${Dropdown}>
                </div>
            </div>
        </header>
    `;
};
