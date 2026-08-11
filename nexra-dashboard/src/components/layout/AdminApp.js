import { html, useState, useEffect } from '../../utils/htm.js';
import { useAuth, useToast } from '../../context/index.js';
import { API_BASE_URL } from '../../api/client.js';
import { CommandPalette } from './CommandPalette.js';
import { AdminSidebar, MobileHeader, BottomNav } from './index.js';
import { Card, Icon, Button } from '../ui/index.js';
import { BusinessOverviewPage } from '../../pages/BusinessOverviewPage.js';
import { AdminBugsPage } from '../../pages/AdminBugsPage.js';
import { AdminUsersPage } from '../../pages/AdminUsersPage.js';
import { SystemHealthPage } from '../../pages/SystemHealthPage.js';
import { AuditLogPage } from '../../pages/AuditLogPage.js';
import { AnnouncementsPage } from '../../pages/AnnouncementsPage.js';
import { StaffManagementPage } from '../../pages/StaffManagementPage.js';
import { PlatformManagementPage } from '../../pages/PlatformManagementPage.js';
import { AdminApprovalPage } from '../../pages/AdminApprovalPage.js';
import { AdminLoginPage } from '../../pages/AdminLoginPage.js';
import { AdminRegisterPage } from '../../pages/AdminRegisterPage.js';
import { AdminTransactionsPage } from '../../pages/AdminTransactionsPage.js';
import { GlobalSearchPage } from '../../pages/GlobalSearchPage.js';

export const AdminApp = () => {
    const { user, loading, logout } = useAuth();
    const { showToast } = useToast();
    const [currentPage, setCurrentPage] = useState('approvals');

    // WebSockets Real-Time God Mode
    useEffect(() => {
        if (!user) return;
        
        const token = localStorage.getItem('access_token');
        if (!token) return;

        const wsUrl = API_BASE_URL.replace(/^http/, 'ws') + '/ws/' + token;
        const ws = new WebSocket(wsUrl);
        
        const pingAudio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'gateway_status') {
                    const variant = data.status === 'online' ? 'success' : 'error';
                    showToast(data.title + ': ' + data.message, variant);
                    if (variant === 'error') pingAudio.play().catch(() => {});
                } else if (data.type === 'new_bug') {
                    showToast(data.title + ': ' + data.message, 'warning');
                    pingAudio.play().catch(() => {});
                }
            } catch (e) {
                console.error("WebSocket message parse error", e);
            }
        };

        return () => ws.close();
    }, [user]);

    useEffect(() => {
        // Default to dark mode if not explicitly set to light
        const savedTheme = localStorage.getItem('admin_theme');
        if (savedTheme === 'light') {
            document.documentElement.classList.remove('dark');
        } else {
            document.documentElement.classList.add('dark');
            if (!savedTheme) {
                localStorage.setItem('admin_theme', 'dark');
            }
        }
    }, []);

    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash.slice(1) || '/approvals';
            const page = hash.split('/')[1] || 'approvals';
            setCurrentPage(page);
        };
        window.addEventListener('hashchange', handleHashChange);
        handleHashChange();
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    if (loading) return null;

    if (!user) {
        if (currentPage === 'register') return html`<${AdminRegisterPage} />`;
        return html`<${AdminLoginPage} />`;
    }



    const renderPage = () => {
        switch (currentPage) {
            case 'overview': return html`<${BusinessOverviewPage} />`;
            case 'admin-transactions': return html`<${AdminTransactionsPage} showToast=${showToast} />`;
            case 'approvals': return html`<${AdminApprovalPage} />`;
            case 'management': return html`<${PlatformManagementPage} />`;
            case 'staff': return html`<${StaffManagementPage} />`;
            case 'users': return html`<${AdminUsersPage} />`;
            case 'search': return html`<${GlobalSearchPage} />`;
            case 'audit': return html`<${AuditLogPage} />`;
            case 'announcements': return html`<${AnnouncementsPage} />`;
            case 'health': return html`<${SystemHealthPage} />`;
            case 'bugs': return html`<${AdminBugsPage} />`;
            case 'settings': return html`
                <div className="p-4 space-y-4">
                    <${Card} className="p-6">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-16 h-16 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-xl font-black text-primary-600">
                                ${user?.full_name?.charAt(0)}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold dark:text-white">${user.full_name}</h2>
                                <p className="text-sm text-gray-500 uppercase tracking-widest font-bold">${user.role}</p>
                            </div>
                        </div>
                        <${Button} variant="danger" className="w-full" onClick=${logout}>
                            <${Icon} name="log-out" size=${18} />
                            Sign Out
                        </${Button}>
                    </${Card}>
                </div>
            `;
            default: return html`<${AdminApprovalPage} />`;
        }
    };

    const getPageTitle = () => {
        switch (currentPage) {
            case 'overview': return 'Business Overview';
            case 'admin-transactions': return 'Transaction Ledger';
            case 'approvals': return 'Sender ID Approvals';
            case 'management': return 'Platform Management';
            case 'staff': return 'Staff Management';
            case 'users': return 'Users Directory';
            case 'search': return 'Global Search';
            case 'audit': return 'Audit Logs';
            case 'announcements': return 'Announcements';
            case 'health': return 'System Health';
            case 'bugs': return 'Bug Reports';
            case 'settings': return 'Admin Settings';
            default: return 'Admin Console';
        }
    }

    return html`
        <div className="flex h-screen bg-[#f8fafc] dark:bg-midnight-950 overflow-hidden">
            <${AdminSidebar} currentPage=${currentPage} onNavigate=${(page) => window.location.href = `admin.html#/${page}`} />
            
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                <${MobileHeader} title=${getPageTitle()} />
                
                <main className="flex-1 p-4 lg:p-8 overflow-y-auto pb-24 lg:pb-8 no-scrollbar">
                    <div className="max-w-6xl mx-auto">
                        ${renderPage()}
                    </div>
                </main>
                
                <${BottomNav} currentPage=${currentPage} onNavigate=${(page) => window.location.href = `admin.html#/${page}`} />
            </div>
        </div>
    `;
};