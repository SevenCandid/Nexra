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
    
    // Character counting logic
    const charCount = formData.message.length;
    const smsCount = Math.ceil(charCount / 160) || 1;
    const isOverLimit = charCount > 160;

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.sender) {
            showToast('Please select an approved Sender ID', 'error');
            return;
        }
        
        setLoading(true);
        try {
            await apiClient.post('/sms/quick-send', formData);
            showToast('Message enqueued successfully!', 'success');
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
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white leading-none">Quick Send</h2>
                            <p className="text-[10px] font-bold text-gray-400 dark:text-midnight-500 uppercase tracking-widest mt-2">Instant SMS Transmission</p>
                        </div>
                        <button onClick=${onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-midnight-800 rounded-full transition-colors text-gray-400">
                            <${Icon} name="x" size=${24} />
                        </button>
                    </div>

                    <form onSubmit=${handleSubmit} className="space-y-6">
                        <div>
                            <div className="flex items-center justify-between mb-2 px-1">
                                <label className="text-[10px] font-black text-gray-400 dark:text-midnight-500 uppercase tracking-widest">Recipient Number</label>
                                ${formData.recipient && formData.recipient.length >= 9 && html`
                                    <span className="text-[9px] font-bold text-emerald-500 flex items-center gap-1 uppercase tracking-wider">
                                        <${Icon} name="check-circle" size=${10} />
                                        Validated
                                    </span>
                                `}
                            </div>
                            <div className="relative group">
                                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors">
                                    <${Icon} name="phone" size=${18} />
                                </div>
                                <input
                                    type="tel"
                                    value=${formData.recipient}
                                    onChange=${(e) => setFormData({ ...formData, recipient: e.target.value })}
                                    placeholder="e.g. 024XXXXXXX"
                                    className="w-full pl-12 pr-5 py-4 bg-gray-50 dark:bg-midnight-950 rounded-2xl border border-gray-100 dark:border-midnight-800 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all text-gray-900 dark:text-white font-medium"
                                    required
                                />
                            </div>
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
                            <div className="relative">
                                <textarea
                                    value=${formData.message}
                                    onChange=${(e) => setFormData({ ...formData, message: e.target.value })}
                                    placeholder="Type your message here..."
                                    rows=${4}
                                    className="w-full px-5 py-4 bg-gray-50 dark:bg-midnight-950 rounded-2xl border border-gray-100 dark:border-midnight-800 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all text-gray-900 dark:text-white resize-none font-medium leading-relaxed"
                                    required
                                />
                                <div className="absolute bottom-3 right-4 flex items-center gap-3">
                                    <div className=${`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${isOverLimit ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-500'}`}>
                                        ${charCount} / 160
                                    </div>
                                    <div className="px-2 py-0.5 rounded-md bg-primary-50 text-primary-600 text-[9px] font-black uppercase tracking-wider">
                                        ${smsCount} Unit${smsCount > 1 ? 's' : ''}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-primary-50/50 dark:bg-primary-900/5 p-4 rounded-2xl border border-primary-100/50 dark:border-primary-900/20">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-primary-700 dark:text-primary-300 uppercase tracking-widest">Estimated Cost</span>
                                <span className="text-sm font-black text-primary-600 dark:text-primary-400">${smsCount} Credit${smsCount > 1 ? 's' : ''}</span>
                            </div>
                        </div>

                        <${Button} 
                            type="submit" 
                            variant="primary" 
                            className="w-full py-4 rounded-2xl text-sm font-black uppercase tracking-[0.2em] shadow-glow h-14"
                            disabled=${loading || !formData.recipient || !formData.message}
                        >
                            ${loading ? html`<span className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full"></span>` : html`
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
