import { html, useState } from '../utils/htm.js';
import { Icon } from './ui/Icon.js';
import { Button } from './ui/Button.js';
import { TemplateSelector } from './ui/TemplateSelector.js';
import { SenderIDSelect } from './SenderIDSelect.js';
import { useToast } from '../contexts/ToastContext.js';
import apiClient from '../api/client.js';

export const QuickSendModal = ({ isOpen, onClose, user, onSent }) => {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({ recipient: '', sender: '', message: '' });

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await apiClient.post('/sms/quick-send', formData);
            showToast('Message sent successfully!', 'success');
            onSent?.();
            onClose();
            setFormData({ recipient: '', sender: '', message: '' });
        } catch (error) {
            showToast(error.response?.data?.detail || 'Failed to send message', 'error');
        } finally {
            setLoading(false);
        }
    };

    return html`
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-midnight-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-midnight-900 w-full max-w-md rounded-[2.5rem] shadow-premium border border-gray-100 dark:border-midnight-800 overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-8">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white">Quick Send</h2>
                            <p className="text-xs font-bold text-gray-400 dark:text-midnight-500 uppercase tracking-widest mt-1">Instant SMS Transmission</p>
                        </div>
                        <button onClick=${onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-midnight-800 rounded-full transition-colors">
                            <${Icon} name="x" size=${24} className="text-gray-400" />
                        </button>
                    </div>

                    <form onSubmit=${handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 dark:text-midnight-500 uppercase tracking-widest mb-2 px-1">Recipient Number</label>
                            <input
                                type="text"
                                value=${formData.recipient}
                                onChange=${(e) => setFormData({ ...formData, recipient: e.target.value })}
                                placeholder="e.g. 23324XXXXXXX"
                                className="w-full px-5 py-4 bg-gray-50 dark:bg-midnight-950 rounded-2xl border border-gray-100 dark:border-midnight-800 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all text-gray-900 dark:text-white"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 dark:text-midnight-500 uppercase tracking-widest mb-2 px-1">Sender ID</label>
                            <${SenderIDSelect} 
                                value=${formData.sender} 
                                onChange=${(val) => setFormData({ ...formData, sender: val })} 
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 dark:text-midnight-500 uppercase tracking-widest mb-2 px-1 flex items-center justify-between">
                                <span>Message Body</span>
                                <${TemplateSelector} onSelect=${(content) => setFormData({ ...formData, message: content })} />
                            </label>
                            <textarea
                                value=${formData.message}
                                onChange=${(e) => setFormData({ ...formData, message: e.target.value })}
                                placeholder="Type your message here..."
                                rows=${4}
                                className="w-full px-5 py-4 bg-gray-50 dark:bg-midnight-950 rounded-2xl border border-gray-100 dark:border-midnight-800 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all text-gray-900 dark:text-white resize-none"
                                required
                            />
                        </div>

                        <${Button} 
                            type="submit" 
                            variant="primary" 
                            className="w-full py-4 rounded-2xl text-sm font-black uppercase tracking-[0.2em] shadow-glow"
                            disabled=${loading}
                        >
                            ${loading ? html`<span className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full flex-shrink-0"></span>` : html`
                                <${Icon} name="send" size=${18} className="mr-2" />
                                Transmit Now
                            `}
                        </${Button}>
                    </form>
                </div>
            </div>
        </div>
    `;
};
