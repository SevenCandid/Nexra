import apiClient from '../api/client.js';
import { html, useState, useEffect, useRef, useMemo, useCallback } from '../utils/htm.js';
import { Icon, Button, Badge, Card, Modal, Skeleton, TrendChart, ConfirmModal } from '../components/ui/index.js';
import { useToast, useAuth } from '../context/index.js';
import { AdminStatCard, SystemHealthWidget, PlatformRow, DateFilterDropdown } from '../components/layout/index.js';

export const SystemHealthPage = () => {
    const { showToast } = useToast();
    const [health, setHealth] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchHealth = () => {
        apiClient.get('/admin/system/health')
            .then(res => { setHealth(res.data); setLoading(false); })
            .catch(() => setLoading(false));
    };

    useEffect(() => { fetchHealth(); }, []);

    const handleToggleGateway = async (gatewayId) => {
        try {
            await apiClient.post(`/admin/gateways/${gatewayId}/toggle`);
            showToast('Gateway status updated', 'success');
            fetchHealth();
        } catch (error) {
            showToast('Failed to toggle gateway', 'error');
        }
    };

    if (loading) return html`<div className="p-20 text-center animate-pulse text-gray-400">Running diagnostic health checks...</div>`;

    return html`
        <div className="space-y-6 fade-in max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold dark:text-white mb-6">System Health</h2>
            
            <${SystemHealthWidget} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <${Card} className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                            <${Icon} name="database" size=${24} className="text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">PostgreSQL DB</p>
                            <p className="text-lg font-black text-emerald-600">OPERATIONAL</p>
                        </div>
                    </div>
                    <${Icon} name="check-circle" className="text-emerald-500" />
                </${Card}>

                <${Card} className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-xl">
                            <${Icon} name="server" size=${24} className="text-primary-600" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">FastAPI Backend</p>
                            <p className="text-lg font-black text-primary-600">ONLINE</p>
                        </div>
                    </div>
                    <${Icon} name="check-circle" className="text-emerald-500" />
                </${Card}>
            </div>

            <div className="flex items-center justify-between mt-8 mb-4">
                <h3 className="text-xs font-black text-gray-400 dark:text-midnight-500 uppercase tracking-widest px-1">Gateway Connectivity</h3>
                <${Button} variant="ghost" size="sm" onClick=${fetchHealth} className="h-8">
                    <${Icon} name="refresh-cw" size=${14} className=${loading ? 'animate-spin' : ''} />
                </${Button}>
            </div>
            
            <div className="grid gap-3">
                ${health?.gateways.map(gw => html`
                    <${Card} key=${gw.id} className="p-4 flex items-center justify-between bg-white dark:bg-midnight-900/40">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-midnight-800 flex items-center justify-center">
                                <${Icon} name="zap" size=${18} className=${gw.is_active ? 'text-amber-500' : 'text-gray-300'} />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-900 dark:text-white">${gw.name}</p>
                                <p className="text-[10px] text-gray-500 font-mono">${gw.host}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <${Badge} variant=${gw.is_active ? 'success' : 'default'}>${gw.status}</${Badge}>
                            <${Button} 
                                size="sm" 
                                variant=${gw.is_active ? 'outline' : 'primary'}
                                className="h-8 text-[10px] font-black uppercase tracking-wider"
                                onClick=${() => handleToggleGateway(gw.id)}
                            >
                                ${gw.is_active ? 'Disable' : 'Enable'}
                            </${Button}>
                        </div>
                    </${Card}>
                `)}
            </div>
        </div>
    `;
};