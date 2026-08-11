import { html, useState, useEffect, useRef, useMemo, useCallback } from '../utils/htm.js';
import apiClient from '../api/client.js';
import { useToast, useAuth } from '../context/index.js';
import { Icon, Button, Badge, Card, Modal, Skeleton, TrendChart } from '../components/ui/index.js';

export const AnnouncementsPage = () => {
    const { showToast } = useToast();
    const [list, setList] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [usersLoading, setUsersLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [recipientMode, setRecipientMode] = useState('all');
    const [selectedUserIds, setSelectedUserIds] = useState([]);
    const [userSearch, setUserSearch] = useState('');
    const [form, setForm] = useState({ title: '', content: '', type: 'info', priority: 'normal' });

    useEffect(() => { fetchAnnouncements(); }, []);

    useEffect(() => {
        if (isCreating && users.length === 0 && !usersLoading) {
            fetchUsers();
        }
    }, [isCreating]);

    const fetchAnnouncements = async () => {
        try {
            const res = await apiClient.get('/admin/announcements');
            setList(res.data);
            setLoading(false);
        } catch (error) { setLoading(false); }
    };

    const fetchUsers = async () => {
        setUsersLoading(true);
        try {
            const res = await apiClient.get('/platform/users?limit=200');
            setUsers(res.data?.items || res.data || []);
        } catch (error) {
            showToast('Failed to load users', 'error');
        } finally {
            setUsersLoading(false);
        }
    };

    const toggleUserId = (id) => {
        setSelectedUserIds((prev) => (
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        ));
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (recipientMode === 'selected' && selectedUserIds.length === 0) {
            showToast('Pick at least one user or switch to All Users.', 'error');
            return;
        }
        try {
            await apiClient.post('/admin/announcements', null, {
                params: {
                    ...form,
                    target_user_ids: recipientMode === 'selected' ? selectedUserIds.join(',') : '',
                },
            });
            showToast('Announcement posted!', 'success');
            setIsCreating(false);
            setForm({ title: '', content: '', type: 'info', priority: 'normal' });
            setRecipientMode('all');
            setSelectedUserIds([]);
            setUserSearch('');
            fetchAnnouncements();
        } catch (error) { showToast('Failed to post', 'error'); }
    };

    const filteredUsers = users.filter((item) => {
        const query = userSearch.trim().toLowerCase();
        if (!query) return true;
        return [
            item.full_name,
            item.email,
            item.organization_name,
            item.role,
        ].some((value) => (value || '').toLowerCase().includes(query));
    });

    return html`
        <div className="space-y-6 fade-in max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold dark:text-white">Announcements</h2>
                <${Button} onClick=${() => setIsCreating(true)}>
                    <${Icon} name="plus" size=${18} /> New Announcement
                </${Button}>
            </div>

            <${Modal} isOpen=${isCreating} onClose=${() => setIsCreating(false)} title="Create Announcement">
                <form onSubmit=${handleCreate} className="space-y-4">
                    <${Input} label="Title" value=${form.title} onChange=${e => setForm({...form, title: e.target.value})} required />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold uppercase text-gray-500 ml-1">Priority</label>
                            <select
                                value=${form.priority}
                                onChange=${(e) => setForm({ ...form, priority: e.target.value })}
                                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-midnight-900 border border-gray-200 dark:border-midnight-800 rounded-xl outline-none text-sm"
                            >
                                <option value="low">Low</option>
                                <option value="normal">Normal</option>
                                <option value="high">High</option>
                                <option value="critical">Critical</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold uppercase text-gray-500 ml-1">Type</label>
                            <select
                                value=${form.type}
                                onChange=${(e) => setForm({ ...form, type: e.target.value })}
                                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-midnight-900 border border-gray-200 dark:border-midnight-800 rounded-xl outline-none text-sm"
                            >
                                <option value="info">Info</option>
                                <option value="warning">Warning</option>
                                <option value="success">Success</option>
                                <option value="emergency">Emergency</option>
                            </select>
                        </div>
                    </div>
                    <div className="space-y-2 rounded-2xl border border-gray-200 dark:border-midnight-800 bg-gray-50/70 dark:bg-midnight-900/40 p-4">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-midnight-400">Audience</p>
                                <p className="text-sm text-gray-500 dark:text-midnight-400">Choose all users or pick specific recipients.</p>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                ${recipientMode === 'selected' ? `${selectedUserIds.length} selected` : 'All users'}
                            </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick=${() => setRecipientMode('all')}
                                className=${`px-4 py-3 rounded-2xl border text-left transition-colors ${recipientMode === 'all' ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300' : 'border-gray-200 dark:border-midnight-800 text-gray-600 dark:text-midnight-300'}`}
                            >
                                <p className="font-bold">All users</p>
                                <p className="text-xs opacity-80">Send the announcement to everyone.</p>
                            </button>
                            <button
                                type="button"
                                onClick=${() => setRecipientMode('selected')}
                                className=${`px-4 py-3 rounded-2xl border text-left transition-colors ${recipientMode === 'selected' ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300' : 'border-gray-200 dark:border-midnight-800 text-gray-600 dark:text-midnight-300'}`}
                            >
                                <p className="font-bold">Selected users</p>
                                <p className="text-xs opacity-80">Choose specific users below.</p>
                            </button>
                        </div>
                        ${recipientMode === 'selected' && html`
                            <div className="space-y-3">
                                <input
                                    value=${userSearch}
                                    onChange=${(e) => setUserSearch(e.target.value)}
                                    placeholder="Search users by name, email, role, or organization"
                                    className="w-full px-4 py-2.5 bg-white dark:bg-midnight-950 border border-gray-200 dark:border-midnight-800 rounded-xl outline-none text-sm"
                                />
                                <div className="max-h-60 overflow-y-auto rounded-2xl border border-gray-200 dark:border-midnight-800 bg-white dark:bg-midnight-950 divide-y divide-gray-100 dark:divide-midnight-800">
                                    ${usersLoading ? html`
                                        <div className="p-4 text-sm text-gray-500">Loading users...</div>
                                    ` : filteredUsers.length === 0 ? html`
                                        <div className="p-4 text-sm text-gray-500">No users found.</div>
                                    ` : filteredUsers.map((user) => html`
                                        <label key=${user.id} className="flex items-start gap-3 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-midnight-900/60 transition-colors">
                                            <input
                                                type="checkbox"
                                                checked=${selectedUserIds.includes(user.id)}
                                                onChange=${() => toggleUserId(user.id)}
                                                className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                            />
                                            <div className="min-w-0 flex-1">
                                                <p className="font-semibold text-gray-900 dark:text-white truncate">${user.full_name || user.email}</p>
                                                <p className="text-xs text-gray-500 dark:text-midnight-400 truncate">${user.email}</p>
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">${user.role || 'user'}${user.organization_name ? ` · ${user.organization_name}` : ''}</p>
                                            </div>
                                        </label>
                                    `)}
                                </div>
                            </div>
                        `}
                    </div>
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold uppercase text-gray-500 ml-1">Content</label>
                        <textarea 
                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-midnight-900 border border-gray-200 dark:border-midnight-800 rounded-xl outline-none text-sm min-h-[100px]"
                            value=${form.content}
                            onChange=${e => setForm({...form, content: e.target.value})}
                            required
                        ></textarea>
                    </div>
                    <div className="flex gap-3 pt-4">
                        <${Button} type="button" variant="ghost" className="flex-1" onClick=${() => setIsCreating(false)}>Cancel</${Button}>
                        <${Button} type="submit" className="flex-1">Post Announcement</${Button}>
                    </div>
                </form>
            </${Modal}>

            <div className="space-y-4">
                ${list.map(item => html`
                    <${Card} key=${item.id} className="p-6 border-l-4 ${item.type === 'warning' ? 'border-amber-500' : item.type === 'emergency' ? 'border-rose-500' : 'border-primary-500'}">
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">${item.title}</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">${item.content}</p>
                                <div className="flex gap-3 mt-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                    <span>Posted: ${new Date(item.created_at).toLocaleDateString()}</span>
                                    <span>Type: ${item.type}</span>
                                    <span>Priority: ${(item.priority || 'normal').toUpperCase()}</span>
                                    <span>${item.target_user_ids && item.target_user_ids.length ? `${item.target_user_ids.length} selected users` : 'All users'}</span>
                                </div>
                            </div>
                        </div>
                    </${Card}>
                `)}
            </div>
        </div>
    `;
};