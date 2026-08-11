import { html, useState, useEffect, useRef, useMemo, useCallback } from '../../utils/htm.js';
import { Icon, Button, Badge, Card, Modal, Skeleton, Input, Dropdown } from '../ui/index.js';
import { useAuth } from '../../context/index.js';

export const BottomNav = ({ currentPage, onNavigate }) => {
    const { user } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    
    return html`
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[90] bg-white/90 dark:bg-midnight-950/90 backdrop-blur-xl border-t border-gray-100 dark:border-midnight-800 px-6 py-3 pb-safe">
            <div className="flex items-center justify-between max-w-md mx-auto">
                <button onClick=${() => onNavigate('overview')} className="flex flex-col items-center gap-1 transition-colors ${currentPage === 'overview' ? 'text-primary-600 font-bold' : 'text-gray-400'}">
                    <${Icon} name="trending-up" size=${20} />
                    <span className="text-[10px] uppercase tracking-wider">Overview</span>
                </button>
                
                <button onClick=${() => onNavigate('admin-transactions')} className="flex flex-col items-center gap-1 transition-colors ${currentPage === 'admin-transactions' ? 'text-primary-600 font-bold' : 'text-gray-400'}">
                    <${Icon} name="dollar-sign" size=${20} />
                    <span className="text-[10px] uppercase tracking-wider">Ledger</span>
                </button>
                
                <button onClick=${() => onNavigate('approvals')} className="flex flex-col items-center gap-1 transition-colors ${currentPage === 'approvals' ? 'text-primary-600 font-bold' : 'text-gray-400'}">
                    <${Icon} name="check-square" size=${20} />
                    <span className="text-[10px] uppercase tracking-wider">Approvals</span>
                </button>
                
                ${(user?.role === 'superadmin' || user?.permissions?.manage_platform) ? html`
                    <button onClick=${() => onNavigate('management')} className="flex flex-col items-center gap-1 transition-colors ${currentPage === 'management' ? 'text-primary-600 font-bold' : 'text-gray-400'}">
                        <${Icon} name="grid" size=${20} />
                        <span className="text-[10px] uppercase tracking-wider">Manage</span>
                    </button>
                ` : html`
                    <button onClick=${() => onNavigate('search')} className="flex flex-col items-center gap-1 transition-colors ${currentPage === 'search' ? 'text-primary-600 font-bold' : 'text-gray-400'}">
                        <${Icon} name="search" size=${20} />
                        <span className="text-[10px] uppercase tracking-wider">Search</span>
                    </button>
                `}
                
                <button onClick=${() => setIsMenuOpen(true)} className="flex flex-col items-center gap-1 transition-colors ${isMenuOpen ? 'text-primary-600 font-bold' : 'text-gray-400'}">
                    <${Icon} name="menu" size=${20} />
                    <span className="text-[10px] uppercase tracking-wider">More</span>
                </button>
            </div>
        </nav>
        
        <${AdminMobileMenuDrawer} 
            isOpen=${isMenuOpen} 
            onClose=${() => setIsMenuOpen(false)} 
            currentPage=${currentPage}
            onNavigate=${onNavigate}
            user=${user}
        />
    `;
};
