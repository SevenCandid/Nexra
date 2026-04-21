import { html, useState, useEffect } from '../utils/htm.js';
import apiClient from '../api/client.js';
import { useToast } from '../contexts/ToastContext.js';
import { Button } from '../components/ui/Button.js';
import { Card } from '../components/ui/Card.js';
import { Icon } from '../components/ui/Icon.js';
import { Modal } from '../components/ui/Modal.js';

export const TemplatesPage = () => {
    const { showToast } = useToast();
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [templateData, setTemplateData] = useState({ title: '', content: '' });

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        try {
            const res = await apiClient.get('/templates');
            setTemplates(res.data);
        } catch (error) {
            console.error('Failed to fetch templates:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await apiClient.post('/templates', templateData);
            showToast('Template created!', 'success');
            setShowCreateModal(false);
            setTemplateData({ title: '', content: '' });
            fetchTemplates();
        } catch (error) {
            showToast('Failed to create template', 'error');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure?')) return;
        try {
            await apiClient.delete(`/templates/${id}`);
            showToast('Template deleted', 'success');
            fetchTemplates();
        } catch (error) {
            showToast('Failed to delete template', 'error');
        }
    };

    return html`
        <div className="space-y-6 fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white">Template Library</h2>
                    <p className="text-xs font-bold text-gray-400 dark:text-midnight-500 uppercase tracking-widest mt-1">Manage your reusable messages</p>
                </div>
                <${Button} variant="primary" onClick=${() => setShowCreateModal(true)} className="rounded-full px-6 shadow-glow">
                    <${Icon} name="plus" size=${18} className="mr-2" />
                    New Template
                </${Button}>
            </div>

            ${loading ? html`
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    ${[1,2,3].map(i => html`<div key=${i} className="h-48 animate-pulse bg-gray-100 dark:bg-midnight-900 rounded-[2rem]"></div>`)}
                </div>
            ` : templates.length === 0 ? html`
                <${Card} className="p-12 text-center text-gray-500 dark:text-midnight-500">
                    <${Icon} name="layout" size=${48} className="mx-auto mb-4 opacity-20" />
                    <p className="text-lg font-bold">No templates found</p>
                    <p className="text-sm mt-1">Create your first template to speed up your messaging.</p>
                </${Card}>
            ` : html`
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    ${templates.map(t => html`
                        <${Card} key=${t.id} className="p-6 flex flex-col group relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick=${() => handleDelete(t.id)} className="p-2 bg-red-50 text-red-600 rounded-full hover:bg-red-100 transition-colors">
                                    <${Icon} name="trash-2" size=${16} />
                                </button>
                            </div>
                            <h3 className="text-lg font-black text-gray-900 dark:text-white mb-3 pr-8">${t.title}</h3>
                            <div className="flex-1 overflow-hidden">
                                <p className="text-sm text-gray-600 dark:text-midnight-400 line-clamp-4 italic">"${t.content}"</p>
                            </div>
                            <div className="mt-4 pt-4 border-t border-gray-50 dark:border-midnight-800 flex items-center justify-between">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">${new Date(t.created_at).toLocaleDateString()}</span>
                                <span className="text-[10px] font-bold text-primary-600 uppercase tracking-widest">${t.content.length} chars</span>
                            </div>
                        </${Card}>
                    `)}
                </div>
            `}

            <${Modal} isOpen=${showCreateModal} onClose=${() => setShowCreateModal(false)} title="New Template">
                <form onSubmit=${handleCreate} className="space-y-6 pt-4">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 dark:text-midnight-500 uppercase tracking-widest mb-2 px-1">Template Title</label>
                        <input
                            type="text"
                            value=${templateData.title}
                            onChange=${(e) => setTemplateData({ ...templateData, title: e.target.value })}
                            placeholder="e.g. Welcome Message"
                            className="w-full px-5 py-4 bg-gray-50 dark:bg-midnight-950 rounded-2xl border border-gray-100 dark:border-midnight-800 outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-gray-900 dark:text-white"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 dark:text-midnight-500 uppercase tracking-widest mb-2 px-1">Message Content</label>
                        <textarea
                            value=${templateData.content}
                            onChange=${(e) => setTemplateData({ ...templateData, content: e.target.value })}
                            placeholder="Type your template here..."
                            rows=${6}
                            className="w-full px-5 py-4 bg-gray-50 dark:bg-midnight-950 rounded-2xl border border-gray-100 dark:border-midnight-800 outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-gray-900 dark:text-white"
                            required
                        />
                    </div>
                    <div className="flex gap-4 pt-4">
                        <${Button} type="button" variant="outline" className="flex-1 py-4 rounded-2xl font-bold uppercase tracking-widest" onClick=${() => setShowCreateModal(false)}>Cancel</${Button}>
                        <${Button} type="submit" variant="primary" className="flex-1 py-4 rounded-2xl font-bold uppercase tracking-widest shadow-glow">Save Template</${Button}>
                    </div>
                </form>
            </${Modal}>
        </div>
    `;
};
