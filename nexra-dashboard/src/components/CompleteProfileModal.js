import { html, useState, useEffect } from '../utils/htm.js';
import { Icon } from './ui/Icon.js';
import { Button } from './ui/Button.js';
import { useToast } from '../contexts/ToastContext.js';
import apiClient from '../api/client.js';

export const CompleteProfileModal = ({ user, onComplete }) => {
    const { showToast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState('');

    useEffect(() => {
        // Show the modal if the user is loaded and their phone number is missing
        if (user && !user.phone_number) {
            setIsOpen(true);
        } else {
            setIsOpen(false);
        }
    }, [user]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!phoneNumber || phoneNumber.length < 9) {
            showToast('Please enter a valid phone number', 'error');
            return;
        }

        setLoading(true);
        try {
            await apiClient.put('/auth/me', { phone_number: phoneNumber });
            showToast('Profile updated successfully!', 'success');
            onComplete?.();
            setIsOpen(false);
        } catch (error) {
            showToast(error.response?.data?.detail || 'Failed to update profile', 'error');
        } finally {
            setLoading(false);
        }
    };

    return html`
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-midnight-950/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-midnight-900 w-full max-w-md rounded-[2.5rem] shadow-premium border border-gray-100 dark:border-midnight-800 overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-8">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white leading-none">Complete Profile</h2>
                            <p className="text-[10px] font-bold text-gray-400 dark:text-midnight-500 uppercase tracking-widest mt-2">Almost there!</p>
                        </div>
                        <!-- We don't provide a close button here to strongly encourage completion -->
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                        To secure your account and enable SMS sending features, please link a valid mobile number to your Nexra account.
                    </p>

                    <form onSubmit=${handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 dark:text-midnight-500 uppercase tracking-widest mb-2 px-1">Mobile Number</label>
                            <div className="relative group">
                                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors">
                                    <${Icon} name="phone" size=${18} />
                                </div>
                                <input
                                    type="tel"
                                    value=${phoneNumber}
                                    onChange=${(e) => setPhoneNumber(e.target.value)}
                                    placeholder="e.g. 024XXXXXXX"
                                    className="w-full pl-12 pr-5 py-4 bg-gray-50 dark:bg-midnight-950 rounded-2xl border border-gray-100 dark:border-midnight-800 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all text-gray-900 dark:text-white font-medium"
                                    required
                                />
                            </div>
                        </div>

                        <${Button} 
                            type="submit" 
                            variant="primary" 
                            className="w-full py-4 rounded-2xl text-sm font-black uppercase tracking-[0.2em] shadow-glow h-14"
                            disabled=${loading || !phoneNumber}
                        >
                            ${loading ? html`<span className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full"></span>` : html`
                                Complete Setup
                                <${Icon} name="arrow-right" size=${18} className="ml-2" />
                            `}
                        </${Button}>
                    </form>
                </div>
            </div>
        </div>
    `;
};
