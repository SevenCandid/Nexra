import { html, useState, useEffect } from '../utils/htm.js';
import { useAuth } from '../contexts/AuthContext.js';

// Layouts
import { DashboardLayout } from '../components/layout/DashboardLayout.js';

// Pages
import { LoginPage } from './LoginPage.js';
import { RegisterPage } from './RegisterPage.js';
import { DashboardPage } from './DashboardPage.js';
import { CampaignsPage } from './CampaignsPage.js';
import { CreateCampaignPage } from './CreateCampaignPage.js';
import { ContactsPage } from './ContactsPage.js';
import { MessagesPage } from './MessagesPage.js';
import { PricingPage } from './PricingPage.js';
import { SenderIDManagement } from './SenderIDManagement.js';
import { TemplatesPage } from './TemplatesPage.js';
import { SettingsPage } from './SettingsPage.js';
import { HelpPage } from './HelpPage.js';
import { APIDocsPage } from './APIDocsPage.js';
import { DocsPage } from './DocsPage.js';

export const App = () => {
    const { user, loading } = useAuth();
    const [currentPage, setCurrentPage] = useState('dashboard');
    const [currentHash, setCurrentHash] = useState(window.location.hash);

    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash.slice(1) || '/dashboard';
            const page = hash.split('/')[1] || 'dashboard';
            setCurrentHash(window.location.hash);
            setCurrentPage(page);
        };

        window.addEventListener('hashchange', handleHashChange);
        handleHashChange();

        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    if (loading) return null;

    // Public routes
    if (!user) {
        if (currentPage === 'register') {
            return html`<${RegisterPage} />`;
        }
        return html`<${LoginPage} />`;
    }

    // Protected routes
    const renderPage = () => {
        switch (currentPage) {
            case 'campaigns':
                return currentHash.includes('/create') ? html`<${CreateCampaignPage} />` : html`<${CampaignsPage} />`;
            case 'contacts':
                return html`<${ContactsPage} />`;
            case 'messages':
                return html`<${MessagesPage} />`;
            case 'pricing':
                return html`<${PricingPage} />`;
            case 'sender-ids':
                return html`<${SenderIDManagement} />`;
            case 'templates':
                return html`<${TemplatesPage} />`;
            case 'settings':
                return html`<${SettingsPage} />`;
            case 'help':
                return html`<${HelpPage} />`;
            case 'api-docs':
                return html`<${APIDocsPage} />`;
            case 'docs':
                return html`<${DocsPage} />`;
            default:
                return html`<${DashboardPage} />`;
        }
    };

    return html`
        <${DashboardLayout} currentPage=${currentPage} onNavigate=${(page) => window.location.href = `#/${page}`}>
            ${renderPage()}
        </${DashboardLayout}>
    `;
};
