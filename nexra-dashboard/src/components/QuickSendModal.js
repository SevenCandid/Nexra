import { html, useState, useEffect } from '../utils/htm.js';
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
    
    // Check if Contact Picker API is available
    const [isContactPickerSupported, setIsContactPickerSupported] = useState(false);
    useEffect(() => {
        setIsContactPickerSupported('contacts' in navigator && 'ContactsManager' in window);
    }, []);

    const handleSelectPhoneContacts = async () => {
        if (!isContactPickerSupported) return;
        try {
            const props = ['name', 'tel'];
            const opts = { multiple: true };
            const selected = await navigator.contacts.select(props, opts);
            
            if (selected && selected.length > 0) {
                const phones = selected
                    .map(c => (c.tel && c.tel.length > 0) ? c.tel[0].replace(/[^0-9+]/g, '') : '')
                    .filter(p => p);
                
                if (phones.length > 0) {
                    const currentRecipients = formData.recipient ? formData.recipient.split(',').map(r => r.trim()).filter(r => r) : [];
                    const newRecipients = [...new Set([...currentRecipients, ...phones])].join(', ');
                    setFormData({ ...formData, recipient: newRecipients });
                    showToast(`Added ${phones.length} contact(s) from phonebook`, 'success');
                }
            }
        } catch (ex) {
            console.error('Contact selection failed or was cancelled', ex);
        }
    };

    // Character counting logic
    const charCount = formData.message.length;
    const smsCount = charCount === 0 ? 0 : (charCount <= 160 ? 1 : Math.ceil(charCount / 153));
    const isOverLimit = charCount > 612;

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.sender) {
            showToast('Please select an approved Sender ID', 'error');
            return;
        }
        
        setLoading(true);
        try {
            // Clean up recipients string to comma-separated
            const recipients = formData.recipient.split(',').map(r => r.trim()).filter(r => r).join(',');
            
            // Create a campaign for the quick send so it appears in history and dashboard
            const payload = {
                name: `Quick Send - ${new Date().toLocaleString()}`,
                template: formData.message,
                sender: formData.sender,
                scheduled_at: null,
                contact_ids: [],
                group_ids: [],
                raw_contacts: recipients,
                contact_persistence: 'none',
                group_name: ''
            };
            
            const response = await apiClient.post('/campaigns', payload);
            const campaignId = response.data.id;
            
            // Broadcast it immediately
            await apiClient.post(`/campaigns/${campaignId}/broadcast`);
            
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-midnight-950/60 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-midnight-900 w-full max-w-md max-h-[90dvh] flex flex-col rounded-3xl sm:rounded-[2.5rem] shadow-premium border border-gray-100 dark:border-midnight-800 overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-5 sm:p-8 overflow-y-auto custom-scrollbar">
                    <div className="flex items-center justify-between mb-6 sm:mb-8">
                        <div>
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white leading-none">Quick Send</h2>
                            <p className="text-[10px] font-bold text-gray-400 dark:text-midnight-500 uppercase tracking-widest mt-2">Instant SMS Transmission</p>
                        </div>
                        <button onClick=${onClose} type="button" className="p-2 hover:bg-gray-100 dark:hover:bg-midnight-800 rounded-full transition-colors text-gray-400">
                            <${Icon} name="x" size=${24} />
                        </button>
                    </div>

                    <form onSubmit=${handleSubmit} className="space-y-6">
                        <div>
                            <div className="flex items-center justify-between mb-2 px-1">
                                <label className="text-[10px] font-black text-gray-400 dark:text-midnight-500 uppercase tracking-widest">Recipient Number(s)</label>
                                ${formData.recipient && formData.recipient.length >= 9 && html`
                                    <span className="text-[9px] font-bold text-emerald-500 flex items-center gap-1 uppercase tracking-wider">
                                        <${Icon} name="check-circle" size=${10} />
                                        Validated
                                    </span>
                                `}
                            </div>
                            <div className="relative group">
                                <div className="absolute left-5 top-4 text-gray-400 group-focus-within:text-primary-500 transition-colors">
                                    <${Icon} name="phone" size=${18} />
                                </div>
                                <textarea
                                    value=${formData.recipient}
                                    onChange=${(e) => setFormData({ ...formData, recipient: e.target.value })}
                                    placeholder="e.g. 024XXXXXXX, 020XXXXXXX"
                                    className="w-full pl-12 pr-12 py-4 bg-gray-50 dark:bg-midnight-950 rounded-2xl border border-gray-100 dark:border-midnight-800 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all text-gray-900 dark:text-white font-medium resize-none custom-scrollbar"
                                    rows="2"
                                    required
                                ></textarea>
                                ${isContactPickerSupported && html`
                                    <button 
                                        type="button"
                                        onClick=${handleSelectPhoneContacts}
                                        className="absolute right-3 top-3.5 p-2 text-primary-600 hover:text-primary-700 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-900/30 rounded-xl transition-colors tooltip-trigger"
                                        title="Select from Phonebook"
                                    >
                                        <${Icon} name="users" size=${18} />
                                    </button>
                                `}
                            </div>
                            <p className="text-[10px] text-gray-500 mt-2 px-1">Separate multiple numbers with commas.</p>
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
                                    <div className=${`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${isOverLimit ? 'bg-red-100 text-red-600' : (smsCount > 1 ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-500')}`}>
                                        ${charCount} / 612
                                    </div>
                                    <div className="px-2 py-0.5 rounded-md bg-primary-50 text-primary-600 text-[9px] font-black uppercase tracking-wider">
                                        ${smsCount} Unit${smsCount !== 1 ? 's' : ''}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-primary-50/50 dark:bg-primary-900/5 p-4 rounded-2xl border border-primary-100/50 dark:border-primary-900/20">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-primary-700 dark:text-primary-300 uppercase tracking-widest">Estimated Cost</span>
                                <span className="text-sm font-black text-primary-600 dark:text-primary-400">${smsCount} Credit${smsCount !== 1 ? 's' : ''}</span>
                            </div>
                            ${smsCount > 1 ? html`
                                <p className="text-[10px] text-primary-600/70 dark:text-primary-400/70 mt-2 leading-relaxed">
                                    Multi-part message (${smsCount} parts). You will be billed ${smsCount}x your plan's standard SMS rate.
                                </p>
                            ` : ''}
                        </div>

                        <${Button} 
                            type="submit" 
                            variant="primary" 
                            className="w-full py-4 rounded-2xl text-sm font-black uppercase tracking-[0.2em] shadow-glow h-14"
                            disabled=${loading || !formData.recipient || !formData.message || charCount > 612}
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
