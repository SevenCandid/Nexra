import { html, useState, useEffect } from '../utils/htm.js';
import { Icon } from '../components/ui/Icon.js';
import apiClient from '../api/client.js';
import { PhoneInput } from './RegisterPage.js';

/**
 * CompleteProfilePage
 * Shown to users who signed up via Google OAuth and don't yet have a phone number.
 * The backend redirects them to /#/complete-profile?token=...
 */
export const CompleteProfilePage = () => {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        // Consume the token from the URL and store it immediately
        const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
        const token = urlParams.get('token');
        if (token) {
            localStorage.setItem('access_token', token);
            // Clean up URL
            window.history.replaceState(null, '', window.location.pathname + '#/complete-profile');
        }
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!phoneNumber || phoneNumber.replace(/\D/g, '').length < 7) {
            setError('Please enter a valid phone number.');
            return;
        }
        setLoading(true);
        try {
            await apiClient.put('/auth/me', { phone_number: phoneNumber });
            window.location.hash = '#/dashboard';
        } catch (err) {
            const detail = err.response?.data?.detail;
            if (Array.isArray(detail)) {
                setError(detail[0].msg || 'Failed to save phone number.');
            } else {
                setError(detail || 'Failed to save phone number. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return html`
        <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
            <div class="w-full max-w-sm">
                <!-- Logo -->
                <div class="text-center mb-8">
                    <div class="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl shadow-lg shadow-primary-500/30 mb-4">
                        <svg class="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                    </div>
                    <h1 class="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">One last step</h1>
                    <p class="text-sm text-gray-500 dark:text-gray-400 mt-1.5 max-w-xs mx-auto">
                        Add your phone number to complete your account setup and receive important notifications.
                    </p>
                </div>

                <!-- Card -->
                <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-xl shadow-gray-100/50 dark:shadow-black/30">
                    ${error && html`
                        <div class="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-xs flex items-start gap-2">
                            <${Icon} name="alert-circle" size=${14} class="mt-0.5 shrink-0" />
                            <span>${error}</span>
                        </div>
                    `}

                    <form onSubmit=${handleSubmit} class="space-y-4">
                        <div class="space-y-1.5">
                            <label class="text-[11px] font-semibold tracking-wide uppercase text-gray-500 dark:text-gray-400 ml-1">Phone Number</label>
                            <${PhoneInput}
                                value=${phoneNumber}
                                onChange=${setPhoneNumber}
                                required=${true}
                            />
                            <p class="text-[10px] text-gray-400 ml-1 mt-1">
                                Select your country code and enter your number. Used for account security only.
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled=${loading}
                            class="w-full py-2.5 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 font-semibold rounded-full text-sm transition-all active:scale-[0.98] shadow-md disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center gap-2 mt-2"
                        >
                            ${loading
                                ? html`<${Icon} name="loader-2" size=${18} class="animate-spin" /> Saving...`
                                : html`<${Icon} name="check" size=${18} /> Complete Setup`
                            }
                        </button>
                    </form>
                </div>

                <!-- Footer note -->
                <p class="text-center text-[10px] text-gray-400 mt-4">
                    You signed in with Google. Your information is secure.
                </p>
            </div>
        </div>
    `;
};
