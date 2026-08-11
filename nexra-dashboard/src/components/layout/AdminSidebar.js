import { html, useState, useEffect, useRef, useMemo, useCallback } from '../../utils/htm.js';
import { Icon, Button, Badge, Card, Modal, Skeleton, Input, Dropdown } from '../ui/index.js';
import { useAuth } from '../../context/index.js';

export const AdminSidebar = ({ currentPage, onNavigate }) => {
    const { user, logout } = useAuth();
    const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
    
    useEffect(() => {
        const handleThemeChange = () => setIsDark(document.documentElement.classList.contains('dark'));
        window.addEventListener('themechange', handleThemeChange);
        return () => window.removeEventListener('themechange', handleThemeChange);
    }, []);

    const toggleTheme = () => {
        const root = document.documentElement;
        if (root.classList.contains('dark')) {
            root.classList.remove('dark');
            localStorage.setItem('admin_theme', 'light');
            setIsDark(false);
        } else {
            root.classList.add('dark');
            localStorage.setItem('admin_theme', 'dark');
            setIsDark(true);
        }
        window.dispatchEvent(new Event('themechange'));
    };
    
    return html`
        <aside className="hidden lg:flex lg:flex-col lg:w-72 bg-white dark:bg-midnight-950 border-r border-gray-200 dark:border-midnight-800 h-screen sticky top-0 transition-colors overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-midnight-800 flex justify-center flex-shrink-0">
                <img src="assets/NEXRA_IconBeside.png" alt="NEXRA Admin" className="h-14 lg:h-16 object-contain" />
            </div>

            <nav className="flex-1 p-4 space-y-4 overflow-y-auto no-scrollbar">
                <div>
                     <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Platform</p>
                     <button
                        onClick=${() => onNavigate('overview')}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentPage === 'overview'
                            ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 font-bold'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}"
                    >
                        <${Icon} name="trending-up" size=${20} />
                        <span>Business Overview</span>
                    </button>
                    <button
                        onClick=${() => onNavigate('admin-transactions')}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentPage === 'admin-transactions'
                            ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 font-bold'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}"
                    >
                        <${Icon} name="dollar-sign" size=${20} />
                        <span>Transaction Ledger</span>
                    </button>
                     <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 mt-4">Management</p>
                     <button
                        onClick=${() => onNavigate('approvals')}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentPage === 'approvals'
                            ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 font-bold'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}"
                    >
                        <${Icon} name="check-square" size=${20} />
                        <span>Sender ID Approvals</span>
                    </button>
                    ${(user?.role === 'superadmin' || user?.permissions?.manage_platform) && html`
                        <button
                            onClick=${() => onNavigate('management')}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentPage === 'management'
                                ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 font-bold'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}"
                        >
                            <${Icon} name="grid" size=${20} />
                            <span>Platform Management</span>
                        </button>
                        <button
                            onClick=${() => onNavigate('bugs')}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentPage === 'bugs'
                                ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 font-bold'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}"
                        >
                            <${Icon} name="alert-triangle" size=${20} />
                            <span>Bug Reports</span>
                        </button>
                    `}
                    ${user?.role === 'superadmin' && html`
                        <button
                            onClick=${() => onNavigate('staff')}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentPage === 'staff'
                                ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 font-bold'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}"
                        >
                            <${Icon} name="users" size=${20} />
                            <span>Staff Management</span>
                        </button>
                        <button
                            onClick=${() => onNavigate('users')}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentPage === 'users'
                                ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 font-bold'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}"
                        >
                            <${Icon} name="user-check" size=${20} />
                            <span>Users Directory</span>
                        </button>
                    `}
                     <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 mt-4">God Mode</p>
                     <button
                        onClick=${() => onNavigate('search')}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentPage === 'search'
                            ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 font-bold'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}"
                    >
                        <${Icon} name="search" size=${20} />
                        <span>Global Search</span>
                    </button>
                    <button
                        onClick=${() => onNavigate('audit')}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentPage === 'audit'
                            ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 font-bold'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}"
                    >
                        <${Icon} name="shield-check" size=${20} />
                        <span>Audit Logs</span>
                    </button>
                    <button
                        onClick=${() => onNavigate('announcements')}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentPage === 'announcements'
                            ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 font-bold'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}"
                    >
                        <${Icon} name="megaphone" size=${20} />
                        <span>Announcements</span>
                    </button>
                    <button
                        onClick=${() => onNavigate('health')}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentPage === 'health'
                            ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 font-bold'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}"
                    >
                        <${Icon} name="activity" size=${20} />
                        <span>System Health</span>
                    </button>
                </div>
            </nav>
            
            <div className="p-4 border-t border-gray-100 dark:border-midnight-800">
                <div className="mb-4 px-4 py-3 bg-gray-50 dark:bg-midnight-900 rounded-xl">
                    <p className="text-xs font-bold text-gray-900 dark:text-white truncate">${user?.full_name}</p>
                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-tighter mt-0.5">${user?.role === 'superadmin' ? 'PLATFORM SUPERADMIN' : 'OFFICIAL STAFF MEMBER'}</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick=${toggleTheme}
                        className="flex items-center justify-center p-3 rounded-lg text-gray-500 hover:bg-gray-50 dark:hover:bg-midnight-800 transition-colors"
                        title="Toggle theme"
                    >
                        <${Icon} name=${isDark ? 'sun' : 'moon'} size=${20} />
                    </button>
                    <button
                        onClick=${logout}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                        <${Icon} name="log-out" size=${20} />
                        <span className="font-bold">Sign Out</span>
                    </button>
                </div>
            </div>
        </aside>
    `;
};
