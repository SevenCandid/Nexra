import { html, useState, useEffect } from '../../utils/htm.js';
import { useAuth } from '../../contexts/AuthContext.js';
import apiClient from '../../api/client.js';
import { Sidebar } from './Sidebar.js';
import { Header } from './Header.js';
import { MobileNav } from './MobileNav.js';
import { QuickSendModal } from '../QuickSendModal.js';
import { CompleteProfileModal } from '../CompleteProfileModal.js';
import { ReportBugModal } from '../ReportBugModal.js';
import { AnnouncementBanner } from './AnnouncementBanner.js';
import { CommandPalette } from '../ui/CommandPalette.js';
import { Icon } from '../ui/Icon.js';

export const DashboardLayout = ({ children, currentPage, onNavigate }) => {
    const { logout } = useAuth();
    const [user, setUser] = useState(null);
    const [balance, setBalance] = useState({ wallet: 0, subscription: 0 });
    const [notifications, setNotifications] = useState([]);
    const [isQuickSendOpen, setIsQuickSendOpen] = useState(false);
    const [isBugReportOpen, setIsBugReportOpen] = useState(false);
    const [headerOverride, setHeaderOverride] = useState(null);
    const [isNavVisible, setIsNavVisible] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);

    const handleScroll = (e) => {
        const currentScrollY = e.target.scrollTop;
        if (currentScrollY > lastScrollY && currentScrollY > 50) {
            setIsNavVisible(false);
        } else if (currentScrollY < lastScrollY) {
            setIsNavVisible(true);
        }
        setLastScrollY(currentScrollY);
    };

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
        const handleOverride = (e) => setHeaderOverride(e.detail);
        window.addEventListener('nexra:header-override', handleOverride);
        return () => window.removeEventListener('nexra:header-override', handleOverride);
    }, []);

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
        dashboard: { title: 'Pulse', subtitle: `Welcome back, ${user?.full_name?.split(' ')[0] || user?.full_name || 'User'}. Here is your overview.` },
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
    const baseInfo = pageInfo[routeKey] || { title: 'Pulse', subtitle: '' };
    
    const title = headerOverride?.title || baseInfo.title;
    const subtitle = headerOverride?.subtitle !== undefined ? headerOverride.subtitle : baseInfo.subtitle;
    const onBack = headerOverride?.onBack;

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
                    onBack=${onBack}
                    onQuickSend=${() => setIsQuickSendOpen(true)}
                    notifications=${notifications}
                    onMarkRead=${handleMarkRead}
                    onMarkAllRead=${handleMarkAllRead}
                    onReportIssue=${() => setIsBugReportOpen(true)}
                    isVisible=${isNavVisible}
                />
                
                <main 
                    className="flex-1 p-4 lg:p-6 pb-28 lg:pb-6 pt-20 lg:pt-4 overflow-y-auto custom-scrollbar"
                    onScroll=${handleScroll}
                >
                    <div className="mb-4 lg:hidden">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                                ${onBack && html`
                                    <button onClick=${onBack} className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-midnight-800 rounded-xl transition-colors shrink-0">
                                        <${Icon} name="arrow-left" size=${24} />
                                    </button>
                                `}
                                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white truncate leading-tight tracking-tight">${title}</h1>
                            </div>
                            ${currentPage === 'dashboard' && html`
                                <button 
                                    onClick=${() => setIsQuickSendOpen(true)}
                                    className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 font-bold text-[11px] sm:text-xs shrink-0 hover:bg-primary-200 dark:hover:bg-primary-900/50 transition-colors shadow-sm"
                                >
                                    <${Icon} name="zap" size=${14} />
                                    Quick Send
                                </button>
                            `}
                        </div>
                        ${subtitle && html`
                            <p className="text-gray-500 dark:text-midnight-400 mt-1 sm:mt-1.5 text-xs sm:text-sm font-medium pr-2 w-full break-words truncate">${subtitle}</p>
                        `}
                    </div>

                    ${children}

                    <footer className="mt-8 pt-6 border-t border-gray-200 dark:border-midnight-800 flex justify-center pb-4">
                        <p className="text-sm text-gray-500 dark:text-midnight-400">
                            Powered by <a href="https://veroseven.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary-600 dark:text-primary-500 hover:text-orange-500 dark:hover:text-orange-400 transition-colors">VeroSeven</a>
                        </p>
                    </footer>
                </main>

                <${MobileNav} currentPage=${currentPage} onNavigate=${onNavigate} onReportIssue=${() => setIsBugReportOpen(true)} isVisible=${isNavVisible} />

                <${QuickSendModal} 
                    isOpen=${isQuickSendOpen} 
                    onClose=${() => setIsQuickSendOpen(false)} 
                    user=${user}
                    onSent=${() => {
                        window.dispatchEvent(new CustomEvent('nexra:update', { detail: { type: 'message_updated' } }));
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
