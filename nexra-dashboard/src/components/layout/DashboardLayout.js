import { html, useState, useEffect } from '../../utils/htm.js';
import { useAuth } from '../../context/AuthContext.js';
import apiClient from '../../api/client.js';
import { Sidebar } from './Sidebar.js';
import { Header } from './Header.js';
import { MobileNav } from './MobileNav.js';
import { QuickSendModal } from '../QuickSendModal.js';
import { CompleteProfileModal } from '../CompleteProfileModal.js';
import { ReportBugModal } from '../ReportBugModal.js';
import { AnnouncementBanner } from './AnnouncementBanner.js';
import { CommandPalette } from '../ui/CommandPalette.js';

export const DashboardLayout = ({ children, currentPage, onNavigate }) => {
    const { logout } = useAuth();
    const [user, setUser] = useState(null);
    const [balance, setBalance] = useState({ wallet: 0, subscription: 0 });
    const [notifications, setNotifications] = useState([]);
    const [isQuickSendOpen, setIsQuickSendOpen] = useState(false);
    const [isBugReportOpen, setIsBugReportOpen] = useState(false);

    const fetchUserData = async () => {
        try {
            const res = await apiClient.get('/auth/me');
            setUser(res.data);
            fetchWallet();
            fetchNotifications();
        } catch (err) {
            console.error('Core data fetch failed');
        }
    };

    useEffect(() => {
        fetchUserData();
        const interval = setInterval(fetchUserData, 60000); // Slower fallback refresh (1m)
        
        // WebSocket Connection for Real-time Updates
        const token = localStorage.getItem('access_token');
        if (token) {
            const apiBase = window.__NEXRA_API_URL__ || 'https://nexra-api.onrender.com';
            const wsBase = apiBase.replace(/^https/, 'wss').replace(/^http/, 'ws');
            const socket = new WebSocket(`${wsBase}/ws/${token}`);

            socket.onopen = () => console.log('NEXRA Pulse Connected');
            socket.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    if (['message_updated', 'plan_updated', 'balance_updated'].includes(msg.type)) {
                        fetchUserData();
                        // Broadcast to child pages
                        window.dispatchEvent(new CustomEvent('nexra:update', { detail: msg }));
                    }
                } catch (e) {
                    console.error('WS Message Parse Error:', e);
                }
            };

            socket.onclose = (e) => console.log('NEXRA Pulse Disconnected', e.code, e.reason);
            socket.onerror = (e) => console.error('NEXRA Pulse Error:', e);
            return () => {
                clearInterval(interval);
                socket.close();
            };
        }

        return () => clearInterval(interval);
    }, []);

    const fetchWallet = async () => {
        try {
            const res = await apiClient.get('/billing/balance');
            setBalance({ 
                wallet: res.data.balance,
                subscription: res.data.subscription_credits 
            });
        } catch (error) {
            console.error('Wallet fetch failed');
        }
    };

    const fetchNotifications = async () => {
        try {
            const res = await apiClient.get('/notifications');
            setNotifications(res.data);
        } catch (error) {
            console.error('Notifications fetch failed');
        }
    };

    const handleMarkRead = async (id) => {
        try {
            await apiClient.post(`/notifications/${id}/read`);
            fetchNotifications();
        } catch (error) {
            console.error('Failed to mark as read');
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await apiClient.post('/notifications/read-all');
            fetchNotifications();
        } catch (error) {
            console.error('Failed to mark all as read');
        }
    };

    const pageInfo = {
        dashboard: { title: 'Pulse', subtitle: "Welcome back! Here's your overview." },
        campaigns: { title: 'Campaigns', subtitle: 'Manage your SMS campaigns' },
        'campaigns/create': { title: 'Create Campaign', subtitle: 'Set up your new SMS broadcast' },
        contacts: { title: 'Contacts', subtitle: 'Manage your audience' },
        messages: { title: 'Message History', subtitle: 'Track your sent and received SMS' },
        pricing: { title: 'Wallet & Credits', subtitle: 'Manage your balance and view transaction history' },
        settings: { title: 'Settings', subtitle: 'Manage your account and preferences' },
        'sender-ids': { title: 'Sender IDs', subtitle: 'Manage your verified sending names' },
        'sender-ids-verify': { title: 'Sender ID Verification', subtitle: 'Upload supporting documents for review' },
        templates: { title: 'Templates', subtitle: 'Manage your reusable message templates' },
        help: { title: 'Help Center', subtitle: 'Everything you need to know about NEXRA' },
        'api-docs': { title: 'Developer API', subtitle: 'Integrate NEXRA into your own applications' },
        'admin-reports': { title: 'Business Overview', subtitle: 'Platform-wide financial health and metrics' },
        'admin-transactions': { title: 'Transaction Ledger', subtitle: 'All Paystack payments and admin-credited transactions' },
    };

    const routeKey = currentPage === 'sender-ids' && window.location.hash.includes('/verify/')
        ? 'sender-ids-verify'
        : currentPage;
    const { title, subtitle } = pageInfo[routeKey] || { title: 'Pulse', subtitle: '' };

    return html`
        <div className="flex flex-col h-[100dvh] overflow-hidden bg-[#f8fafc] dark:bg-midnight-950 transition-colors">
            <${AnnouncementBanner} />
            <div className="flex-1 flex min-h-0 relative">
                <${Sidebar} currentPage=${currentPage} onNavigate=${onNavigate} onReportIssue=${() => setIsBugReportOpen(true)} />

                <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                    <${Header} 
                    user=${user} 
                    balance=${balance.wallet} 
                    onLogout=${logout} 
                    title=${title} 
                    subtitle=${subtitle} 
                    onQuickSend=${() => setIsQuickSendOpen(true)}
                    notifications=${notifications}
                    onMarkRead=${handleMarkRead}
                    onMarkAllRead=${handleMarkAllRead}
                    onReportIssue=${() => setIsBugReportOpen(true)}
                />
                
                <main className="flex-1 p-4 lg:p-6 pb-28 lg:pb-6 pt-20 lg:pt-4 overflow-y-auto custom-scrollbar">
                    <div className="mb-2 lg:hidden">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">${title}</h1>
                        ${subtitle && html`<p className="text-gray-600 dark:text-midnight-400 mt-0.5 text-sm">${subtitle}</p>`}
                    </div>

                    ${children}

                    <footer className="mt-8 pt-6 border-t border-gray-200 dark:border-midnight-800 flex justify-center pb-4">
                        <p className="text-sm text-gray-500 dark:text-midnight-400">
                            Powered by <a href="https://veroseven.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary-600 dark:text-primary-500 hover:text-orange-500 dark:hover:text-orange-400 transition-colors">VeroSeven</a>
                        </p>
                    </footer>
                </main>

                <${MobileNav} currentPage=${currentPage} onNavigate=${onNavigate} onReportIssue=${() => setIsBugReportOpen(true)} />

                <${QuickSendModal} 
                    isOpen=${isQuickSendOpen} 
                    onClose=${() => setIsQuickSendOpen(false)} 
                    user=${user}
                    onSent=${() => {
                        fetchWallet();
                        fetchNotifications();
                    }}
                />

                <${CompleteProfileModal}
                    user=${user}
                    onComplete=${() => {
                        fetchUserData();
                    }}
                />

                <${ReportBugModal}
                    isOpen=${isBugReportOpen}
                    onClose=${() => setIsBugReportOpen(false)}
                />

                <${CommandPalette} />
            </div>
        </div>
    </div>
    `;
};
