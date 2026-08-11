import { html, useState, useEffect } from '../utils/htm.js';
import { Icon } from './ui/Icon.js';
import apiClient from '../api/client.js';
import { useAuth } from '../contexts/AuthContext.js';

export const SenderIDSelect = ({ value, onChange }) => {
    const { user } = useAuth();
    const [senderIds, setSenderIds] = useState([]);
    const [loading, setLoading] = useState(true);

    const isSuperAdmin = user?.role?.toUpperCase() === 'SUPERADMIN';

    const fetchSenderIds = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/sender-ids');
            setSenderIds(res.data);
        } catch (error) {
            console.error('Failed to fetch Sender IDs:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSenderIds();
    }, []);

    if (loading) return html`<div className="h-10 animate-pulse bg-gray-100 dark:bg-midnight-900 rounded-lg"></div>`;

    const approvedIds = senderIds.filter(s => s.status === 'approved');

    return html`
        <div className="space-y-2">
            <div className="flex gap-2">
                <select 
                    value=${value} 
                    onChange=${(e) => onChange(e.target.value)}
                    className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm text-gray-900 dark:text-white outline-none appearance-none transition-all"
                >
                    <option value="">Select an approved Sender ID</option>
                    ${senderIds.map(s => html`
                        <option 
                            key=${s.id} 
                            value=${s.sender_id} 
                            disabled=${s.status !== 'approved'}
                        >
                            ${s.sender_id} (${s.status.toUpperCase()})
                        </option>
                    `)}
                </select>
                <button 
                    type="button" 
                    onClick=${fetchSenderIds} 
                    className="p-2 text-gray-400 hover:text-primary-600 transition-colors"
                >
                    <${Icon} name="refresh-cw" size=${20} />
                </button>
            </div>
            ${approvedIds.length === 0 && html`
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded-xl">
                    <p className="text-[10px] text-red-600 dark:text-red-400 font-bold flex items-center gap-1.5 uppercase tracking-wider">
                        <${Icon} name="alert-circle" size=${12} />
                        No approved Sender IDs found.
                    </p>
                    <a href="#/sender-ids" className="text-[10px] text-primary-600 dark:text-primary-400 font-bold hover:underline block mt-1">
                        Request or check status in Sender IDs
                    </a>
                </div>
            `}
        </div>
    `;
};
