import { html, useState, useEffect } from '../utils/htm.js';
import { useAuth } from '../contexts/AuthContext.js';
import { Icon } from '../components/ui/Icon.js';
import { AuthLayout } from './AuthLayout.js';
import apiClient from '../api/client.js';

// Common country codes, Ghana (+233) is default
const COUNTRY_CODES = [
    { code: '+233', flag: '🇬🇭', name: 'Ghana' },
    { code: '+1',   flag: '🇺🇸', name: 'USA / Canada' },
    { code: '+44',  flag: '🇬🇧', name: 'UK' },
    { code: '+234', flag: '🇳🇬', name: 'Nigeria' },
    { code: '+225', flag: '🇨🇮', name: "Côte d'Ivoire" },
    { code: '+221', flag: '🇸🇳', name: 'Senegal' },
    { code: '+254', flag: '🇰🇪', name: 'Kenya' },
    { code: '+27',  flag: '🇿🇦', name: 'South Africa' },
    { code: '+251', flag: '🇪🇹', name: 'Ethiopia' },
    { code: '+255', flag: '🇹🇿', name: 'Tanzania' },
    { code: '+256', flag: '🇺🇬', name: 'Uganda' },
    { code: '+237', flag: '🇨🇲', name: 'Cameroon' },
    { code: '+31',  flag: '🇳🇱', name: 'Netherlands' },
    { code: '+33',  flag: '🇫🇷', name: 'France' },
    { code: '+49',  flag: '🇩🇪', name: 'Germany' },
    { code: '+91',  flag: '🇮🇳', name: 'India' },
    { code: '+86',  flag: '🇨🇳', name: 'China' },
    { code: '+971', flag: '🇦🇪', name: 'UAE' },
];

export const PhoneInput = ({ value, onChange, required = true }) => {
    const [countryCode, setCountryCode] = useState('+233');
    const [localNumber, setLocalNumber] = useState('');
    const [open, setOpen] = useState(false);

    useEffect(() => {
        onChange(countryCode + localNumber.replace(/^0/, ''));
    }, [countryCode, localNumber]);

    const selected = COUNTRY_CODES.find(c => c.code === countryCode) || COUNTRY_CODES[0];

    return html`
        <div class="relative flex items-stretch gap-0">
            <!-- Country Code Trigger -->
            <button
                type="button"
                onClick=${() => setOpen(!open)}
                class="flex items-center gap-1.5 px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-r-0 border-gray-200 dark:border-gray-700 rounded-l-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            >
                <span class="text-base leading-none">${selected.flag}</span>
                <span class="font-semibold text-xs text-gray-600 dark:text-gray-400">${selected.code}</span>
                <${Icon} name="chevron-down" size=${12} class="text-gray-400" />
            </button>

            <!-- Dropdown -->
            ${open && html`
                <div class="absolute top-full left-0 z-50 mt-1 w-60 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden max-h-56 overflow-y-auto">
                    ${COUNTRY_CODES.map(c => html`
                        <button
                            key=${c.code}
                            type="button"
                            onClick=${() => { setCountryCode(c.code); setOpen(false); }}
                            class="w-full flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${c.code === countryCode ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-semibold' : 'text-gray-700 dark:text-gray-300'}"
                        >
                            <span class="text-base">${c.flag}</span>
                            <span class="flex-1 truncate">${c.name}</span>
                            <span class="text-xs font-mono text-gray-400 dark:text-gray-500">${c.code}</span>
                        </button>
                    `)}
                </div>
            `}

            <!-- Number Input -->
            <input
                type="tel"
                value=${localNumber}
                onInput=${e => setLocalNumber(e.target.value)}
                placeholder="XX XXX XXXX"
                required=${required}
                class="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-r-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:focus:border-primary-500 text-sm text-gray-900 dark:text-white outline-none transition-all"
            />
        </div>
    `;
};

export const RegisterPage = () => {
    const { register } = useAuth();
    const [view, setView] = useState('showcase');
    const [formData, setFormData] = useState({
        full_name: '',
        organization_name: '',
        email: '',
        password: '',
        phone_number: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const handleResize = () => { if (window.innerWidth >= 1024) setView('form'); };
        handleResize();
        window.addEventListener('resize', handleResize);

        const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
        const token = urlParams.get('token');
        if (token) {
            localStorage.setItem('access_token', token);
            window.location.hash = '#/dashboard';
        }

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleGoogleLogin = async () => {
        try {
            const response = await apiClient.get('/auth/google/login');
            window.location.href = response.data.url;
        } catch (err) {
            setError('Google login is currently unavailable. Please ensure Client ID is configured.');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!formData.phone_number || formData.phone_number.replace(/\D/g, '').length < 7) {
            setError('Please enter a valid phone number.');
            return;
        }
        setLoading(true);
        try {
            await register(formData);
            window.location.hash = '#/dashboard';
        } catch (err) {
            const detail = err.response?.data?.detail;
            if (Array.isArray(detail)) {
                setError(detail[0].msg || 'Validation error in form data');
            } else {
                setError(detail || 'Registration failed');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    return html`
        <${AuthLayout} view=${view} setView=${setView} isLogin=${false}>
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Create an account</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Sign up to get started.</p>
            </div>

            <div>
                ${error && html`
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-xs flex items-start gap-2 animate-pop-in">
                        <${Icon} name="alert-circle" size=${14} className="mt-0.5 shrink-0" />
                        <span>${error}</span>
                    </div>
                `}

                <form onSubmit=${handleSubmit} className="space-y-3.5">
                    <div className="grid grid-cols-2 gap-3 pb-1">
                        <div className="space-y-1">
                            <label className="text-[11px] font-semibold tracking-wide uppercase text-gray-500 dark:text-gray-400 ml-1">Full Name</label>
                            <input
                                type="text" name="full_name" value=${formData.full_name} onChange=${handleChange}
                                placeholder="Najat Seven" required
                                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:focus:border-primary-500 text-sm text-gray-900 dark:text-white outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[11px] font-semibold tracking-wide uppercase text-gray-500 dark:text-gray-400 ml-1">Company</label>
                            <input
                                type="text" name="organization_name" value=${formData.organization_name} onChange=${handleChange}
                                placeholder="Success Inc" required
                                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:focus:border-primary-500 text-sm text-gray-900 dark:text-white outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[11px] font-semibold tracking-wide uppercase text-gray-500 dark:text-gray-400 ml-1">Email Address</label>
                        <div className="relative flex items-center group">
                            <${Icon} name="mail" size=${16} className="absolute left-3 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                            <input
                                type="email" name="email" value=${formData.email} onChange=${handleChange}
                                placeholder="najat@success.com" required
                                className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:focus:border-primary-500 text-sm text-gray-900 dark:text-white outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[11px] font-semibold tracking-wide uppercase text-gray-500 dark:text-gray-400 ml-1">Phone Number</label>
                        <${PhoneInput}
                            value=${formData.phone_number}
                            onChange=${(val) => setFormData({ ...formData, phone_number: val })}
                        />
                        <p className="text-[10px] text-gray-400 ml-1 mt-0.5">Used for account security and notifications.</p>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[11px] font-semibold tracking-wide uppercase text-gray-500 dark:text-gray-400 ml-1">Password</label>
                        <div className="relative flex items-center group">
                            <${Icon} name="lock" size=${16} className="absolute left-3 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                            <input
                                type=${showPassword ? 'text' : 'password'} name="password" value=${formData.password} onChange=${handleChange}
                                placeholder="Min 8 characters" required minLength="8"
                                className="w-full pl-9 pr-10 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:focus:border-primary-500 text-sm text-gray-900 dark:text-white outline-none transition-all"
                            />
                            <button
                                type="button"
                                onClick=${() => setShowPassword(!showPassword)}
                                className="absolute right-3 p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors focus:outline-none"
                            >
                                <${Icon} name=${showPassword ? 'eye-off' : 'eye'} size=${16} />
                            </button>
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled=${loading}
                        className="w-full py-2.5 mt-4 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 font-semibold rounded-full text-sm transition-all active:scale-[0.98] shadow-md shadow-gray-900/10 dark:shadow-white/10 disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center gap-2"
                    >
                        ${loading ? html`<${Icon} name="loader-2" size=${18} className="animate-spin" /> Creating account...` : 'Create Account'}
                    </button>
                    
                    <div className="relative py-1 mt-4">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100 dark:border-gray-800"></div></div>
                        <div className="relative flex justify-center"><span className="px-3 bg-white dark:bg-gray-900 text-[10px] font-bold uppercase tracking-widest text-gray-400">or</span></div>
                    </div>

                    <button 
                        type="button" 
                        onClick=${handleGoogleLogin}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-red-50 dark:hover:bg-red-900/10 hover:border-red-200 dark:hover:border-red-800 transition-all text-sm font-semibold text-gray-700 dark:text-gray-300 active:scale-[0.98] group"
                    >
                        <svg className="w-4 h-4 text-[#4285F4] group-hover:scale-110 transition-transform" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" /><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                        Continue with <span className="text-[#4285F4]">Google</span>
                    </button>

                    <p className="text-[10px] text-center text-gray-500 mt-3 max-w-xs mx-auto">
                        By signing up, you agree to our <a href="#" className="underline">Terms of Service</a> & <a href="#" className="underline">Privacy Policy</a>.
                    </p>
                </form>
            </div>

            <p className="text-center text-xs text-gray-600 dark:text-gray-400">
                Already have an account? <a href="#/login" className="font-bold text-gray-900 dark:text-white hover:underline underline-offset-2">Sign in</a>
            </p>
        </${AuthLayout}>
    `;
};
