import { html, useState, useEffect, useRef, useMemo, useCallback } from '../../utils/htm.js';
import { Icon, Button, Badge, Card, Modal, Skeleton, Input, Dropdown } from '../ui/index.js';
import { useAuth } from '../../context/index.js';

export const MobileHeader = ({ title }) => {
    const { user } = useAuth();
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
        <header className="lg:hidden sticky top-0 z-50 bg-white/80 dark:bg-midnight-950/80 backdrop-blur-md border-b border-gray-100 dark:border-midnight-800 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <img src="assets/NEXRA_IconAbove.png" alt="NEXRA" className="h-8 w-auto" />
                <h1 className="text-lg font-bold text-gray-900 dark:text-white truncate max-w-[150px] sm:max-w-none">${title}</h1>
            </div>
            <div className="flex items-center gap-4">
                <button
                    onClick=${toggleTheme}
                    className="p-2 rounded-full bg-gray-50 dark:bg-midnight-900 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                    <${Icon} name=${isDark ? 'sun' : 'moon'} size=${16} />
                </button>
                <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-[10px] font-black text-primary-600">
                    ${user?.full_name?.charAt(0)}
                </div>
            </div>
        </header>
    `;
};
