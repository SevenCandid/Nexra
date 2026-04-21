import { html } from '../utils/htm.js';
import { useAuth } from '../contexts/AuthContext.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Icon } from '../components/ui/Icon.js';

export const SettingsPage = () => {
    const { user, logout } = useAuth();
    return html`
        <div className="max-w-2xl mx-auto space-y-6 fade-in">
            <${Card} className="p-6 sm:p-8">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-20 h-20 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-3xl font-black text-primary-600 border-2 border-primary-200 dark:border-primary-800">
                        ${user?.full_name?.charAt(0) || 'U'}
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">${user?.full_name}</h2>
                        <p className="text-sm font-medium text-gray-500 uppercase tracking-widest mt-1">${user?.role}</p>
                    </div>
                </div>

                <div className="space-y-4 mb-8">
                    <div className="p-4 bg-gray-50 dark:bg-midnight-900/50 rounded-xl border border-gray-100 dark:border-midnight-800">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-semibold uppercase tracking-wider">Email Address</p>
                        <p className="text-gray-900 dark:text-white font-medium">${user?.email}</p>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-midnight-900/50 rounded-xl border border-gray-100 dark:border-midnight-800">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-semibold uppercase tracking-wider">Organization ID</p>
                        <p className="text-gray-900 dark:text-white font-medium">ORG-${(user?.organization_id || 0).toString().padStart(4, '0')}</p>
                    </div>
                </div>

                <${Button} 
                    onClick=${logout} 
                    className="w-full sm:w-auto py-3 px-8 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:text-red-400 transition-colors"
                >
                    <${Icon} name="log-out" size=${18} className="inline mr-2" />
                    Sign Out Securely
                </${Button}>
            </${Card}>
        </div>
    `;
};
