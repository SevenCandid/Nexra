import { html, useState, useEffect, useRef, useMemo, useCallback } from '../../utils/htm.js';
import { Icon, Button, Badge, Card, Modal, Skeleton, Input, Dropdown } from '../ui/index.js';
import { useAuth } from '../../context/index.js';

export const AdminMobileMenuDrawer = ({ isOpen, onClose, currentPage, onNavigate, user }) => {
    if (!isOpen) return null;

    const handleNavigate = (page) => {
        onNavigate(page);
        onClose();
    };

    return html`
        <div className="fixed inset-0 z-[100] lg:hidden flex flex-col justify-end">
            <style>
                @keyframes slideUp {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }
                .animate-slide-up {
                    animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-fade-in {
                    animation: fadeIn 0.2s ease-out forwards;
                }
            </style>
            <!-- Backdrop -->
            <div 
                className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-fade-in"
                onClick=${onClose}
            ></div>
            
            <!-- Drawer -->
            <div className="relative bg-white dark:bg-midnight-950 rounded-t-3xl shadow-2xl h-[85vh] flex flex-col animate-slide-up">
                <!-- Handle -->
                <div className="flex justify-center p-3 shrink-0">
                    <div className="w-12 h-1.5 bg-gray-300 dark:bg-midnight-700 rounded-full"></div>
                </div>
                
                <div className="flex-1 overflow-y-auto no-scrollbar px-6 pb-20">
                    <!-- Platform -->
                    <div className="mb-6">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Platform</p>
                        <div className="space-y-1">
                            <button onClick=${() => handleNavigate('overview')} className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${currentPage === 'overview' ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 font-bold' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-midnight-900'}">
                                <${Icon} name="trending-up" size=${20} />
                                <span>Business Overview</span>
                            </button>
                            <button onClick=${() => handleNavigate('admin-transactions')} className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${currentPage === 'admin-transactions' ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 font-bold' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-midnight-900'}">
                                <${Icon} name="dollar-sign" size=${20} />
                                <span>Transaction Ledger</span>
                            </button>
                        </div>
                    </div>

                    <!-- Management -->
                    <div className="mb-6">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Management</p>
                        <div className="space-y-1">
                            <button onClick=${() => handleNavigate('approvals')} className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${currentPage === 'approvals' ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 font-bold' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-midnight-900'}">
                                <${Icon} name="check-square" size=${20} />
                                <span>Sender ID Approvals</span>
                            </button>
                            ${(user?.role === 'superadmin' || user?.permissions?.manage_platform) && html`
                                <button onClick=${() => handleNavigate('management')} className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${currentPage === 'management' ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 font-bold' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-midnight-900'}">
                                    <${Icon} name="grid" size=${20} />
                                    <span>Platform Management</span>
                                </button>
                                <button onClick=${() => handleNavigate('bugs')} className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${currentPage === 'bugs' ? 'bg-red-50 dark:bg-red-900/30 text-red-700 font-bold' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-midnight-900'}">
                                    <${Icon} name="alert-triangle" size=${20} />
                                    <span>Bug Reports</span>
                                </button>
                            `}
                            ${user?.role === 'superadmin' && html`
                                <button onClick=${() => handleNavigate('staff')} className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${currentPage === 'staff' ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 font-bold' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-midnight-900'}">
                                    <${Icon} name="users" size=${20} />
                                    <span>Staff Management</span>
                                </button>
                                <button onClick=${() => handleNavigate('users')} className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${currentPage === 'users' ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 font-bold' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-midnight-900'}">
                                    <${Icon} name="user-check" size=${20} />
                                    <span>Users Directory</span>
                                </button>
                            `}
                        </div>
                    </div>

                    <!-- God Mode -->
                    <div className="mb-6">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">God Mode</p>
                        <div className="space-y-1">
                            <button onClick=${() => handleNavigate('search')} className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${currentPage === 'search' ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 font-bold' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-midnight-900'}">
                                <${Icon} name="search" size=${20} />
                                <span>Global Search</span>
                            </button>
                            <button onClick=${() => handleNavigate('audit')} className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${currentPage === 'audit' ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 font-bold' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-midnight-900'}">
                                <${Icon} name="shield-check" size=${20} />
                                <span>Audit Logs</span>
                            </button>
                            <button onClick=${() => handleNavigate('announcements')} className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${currentPage === 'announcements' ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 font-bold' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-midnight-900'}">
                                <${Icon} name="megaphone" size=${20} />
                                <span>Announcements</span>
                            </button>
                            <button onClick=${() => handleNavigate('health')} className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${currentPage === 'health' ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 font-bold' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-midnight-900'}">
                                <${Icon} name="activity" size=${20} />
                                <span>System Health</span>
                            </button>
                            <button onClick=${() => handleNavigate('settings')} className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${currentPage === 'settings' ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 font-bold' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-midnight-900'}">
                                <${Icon} name="user" size=${20} />
                                <span>My Account</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
};
