import { html, useState, useEffect } from '../utils/htm.js';
import { useAuth } from '../contexts/AuthContext.js';
import { Icon } from '../components/ui/Icon.js';
import { AuthLayout } from './AuthLayout.js';
import apiClient from '../api/client.js';

export const LoginPage = () => {
    const { login, fetchUser } = useAuth();
    const [view, setView] = useState('showcase'); // Starts visual on mobile
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const handleResize = () => { if (window.innerWidth >= 1024) setView('form'); };
        handleResize();
        window.addEventListener('resize', handleResize);

        // Handle OAuth token in URL
        const getParam = (name) => {
            const searchParams = new URLSearchParams(window.location.search);
            if (searchParams.has(name)) return searchParams.get(name);
            const hashParams = new URLSearchParams(window.location.hash.split('?')[1]);
            return hashParams.get(name);
        };

        const processToken = async () => {
            const token = getParam('token');
            if (token) {
                localStorage.setItem('access_token', token);
                // Clean the URL without refreshing
                window.history.replaceState({}, document.title, window.location.pathname + window.location.hash.split('?')[0]);
                await fetchUser();
                window.location.hash = '#/dashboard';
            }
        };

        processToken();

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
        setLoading(true);
        try {
            await login(email, password);
            window.location.hash = '#/dashboard';
        } catch (err) {
            setError(err.response?.data?.detail || 'Invalid credentials');
        } finally {
            setLoading(false);
        }
    };

    return html`
        <${AuthLayout} view=${view} setView=${setView} isLogin=${true}>
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Welcome back</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Sign in to your account to continue</p>
            </div>

            <div>
                ${error && html`
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-xs flex items-start gap-2 animate-pop-in">
                        <${Icon} name="alert-circle" size=${14} className="mt-0.5 shrink-0" />
                        <span>${error}</span>
                    </div>
                `}

                <form onSubmit=${handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 ml-1">Email Address</label>
                        <div className="relative flex items-center group">
                            <${Icon} name="mail" size=${18} className="absolute left-3 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                            <input
                                type="email"
                                value=${email}
                                onChange=${(e) => setEmail(e.target.value)}
                                placeholder="candid@example.com"
                                className="w-full pl-10 pr-4 py-2 sm:py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:focus:border-primary-500 text-sm text-gray-900 dark:text-white outline-none transition-all"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <div className="flex justify-between items-center ml-1">
                            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Password</label>
                            <a href="#" className="text-[10px] font-medium text-primary-600 dark:text-primary-400 hover:underline">Forgot password?</a>
                        </div>
                        <div className="relative flex items-center group">
                            <${Icon} name="lock" size=${18} className="absolute left-3 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                            <input
                                type=${showPassword ? 'text' : 'password'}
                                value=${password}
                                onChange=${(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full pl-10 pr-10 py-2 sm:py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:focus:border-primary-500 text-sm text-gray-900 dark:text-white outline-none transition-all"
                                required
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
                        className="w-full py-2.5 mt-2 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 font-semibold rounded-full text-sm transition-all active:scale-[0.98] shadow-md shadow-gray-900/10 dark:shadow-white/10 disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center gap-2"
                    >
                        ${loading ? html`<${Icon} name="loader-2" size=${18} className="animate-spin" /> Signing in..."` : 'Sign In'}
                    </button>
                    
                    <div className="relative py-2 mt-4">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100 dark:border-gray-800"></div></div>
                        <div className="relative flex justify-center"><span className="px-3 bg-white dark:bg-gray-900 text-[10px] font-bold uppercase tracking-widest text-gray-400">or</span></div>
                    </div>

                    <button 
                        type="button" 
                        onClick=${handleGoogleLogin}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all text-sm font-semibold text-gray-700 dark:text-gray-300 active:scale-[0.98] group"
                    >
                        <svg className="w-4 h-4 group-hover:scale-110 transition-transform" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                        <span>Continue with <span style="color:#4285F4">G</span><span style="color:#EA4335">o</span><span style="color:#FBBC05">o</span><span style="color:#4285F4">g</span><span style="color:#34A853">l</span><span style="color:#EA4335">e</span></span>
                    </button>
                </form>
            </div>

            <p className="text-center text-xs text-gray-600 dark:text-gray-400">
                Don't have an account? <a href="#/register" className="font-bold text-gray-900 dark:text-white hover:underline underline-offset-2">Sign up</a>
            </p>
        </${AuthLayout}>
    `;
};
