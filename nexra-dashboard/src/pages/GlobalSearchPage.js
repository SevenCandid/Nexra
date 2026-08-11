import { html, useState, useEffect, useRef, useMemo, useCallback } from '../utils/htm.js';
import { Icon, Button, Badge, Card, Modal, Skeleton, TrendChart, ConfirmModal, Input, Dropdown, TemplateSelector } from '../components/ui/index.js';
import { useToast } from '../context/index.js';
import apiClient from '../api/client.js';

export const GlobalSearchPage = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);

    const handleSearch = async (e) => {
        if (e) e.preventDefault();
        if (query.length < 3) return;
        setLoading(true);
        try {
            const response = await apiClient.get('/admin/messages/search', { params: { q: query } });
            setResults(response.data);
        } catch (error) {
            console.error('Search failed', error);
        } finally {
            setLoading(false);
        }
    };

    return html`
        <div className="space-y-6 fade-in max-w-6xl mx-auto">
            <${Card} className="p-6">
                <form onSubmit=${handleSearch} className="flex gap-3">
                    <div className="flex-1">
                        <${Input} 
                            placeholder="Search by Recipient, Sender ID, or Message content..." 
                            value=${query}
                            onChange=${(e) => setQuery(e.target.value)}
                            className="text-lg"
                        />
                    </div>
                    <${Button} type="submit" disabled=${loading || query.length < 3} className="px-8">
                        <${Icon} name="search" size=${20} />
                        ${loading ? 'Searching...' : 'Search'}
                    </${Button}>
                </form>
            </${Card}>

            ${loading ? html`<div className="p-20 text-center animate-pulse text-gray-400">Searching global message logs...</div>` : results.length > 0 ? html`
                <${Card} className="overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-midnight-900 border-b border-gray-100 dark:border-midnight-800">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Organization</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">From/To</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Content</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-midnight-800">
                            ${results.map(msg => html`
                                <tr key=${msg.id} className="hover:bg-gray-50/50 dark:hover:bg-midnight-900/20 transition-colors">
                                    <td className="px-6 py-4">
                                        <p className="text-xs font-bold text-primary-600 uppercase">${msg.organization_name}</p>
                                        <p className="text-[10px] text-gray-400 mt-0.5">${new Date(msg.created_at).toLocaleString()}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase">From: ${msg.sender}</span>
                                            <span className="text-sm font-black text-gray-900 dark:text-white">${msg.recipient}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 max-w-xs">
                                        <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">${msg.content}</p>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <${Badge} variant=${msg.status === 'delivered' ? 'success' : msg.status === 'failed' ? 'error' : 'warning'}>${msg.status}</${Badge}>
                                    </td>
                                </tr>
                            `)}
                        </tbody>
                    </table>
                </${Card}>
            ` : query.length >= 3 && html`
                <div className="p-20 text-center text-gray-400">
                    <${Icon} name="info" size=${48} className="mx-auto mb-4 opacity-20" />
                    <p>No messages found matching "${query}"</p>
                </div>
            `}
        </div>
    `;
};
