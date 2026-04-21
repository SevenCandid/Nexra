const { useState, useEffect, createContext, useContext, useRef, useMemo } = React;
const { createRoot } = ReactDOM;

// Setup HTM (JSX alternative that runs in browser without Babel)
const html = htm.bind(React.createElement);

// Hide splash screen when app is ready
const hideSplashScreen = () => {
    document.body.classList.add('app-ready');
};

// ============================================================================
// API CLIENT
// ============================================================================

const API_BASE_URL = 'http://localhost:8000/api/v1';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor
apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response interceptor
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('access_token');
            window.location.href = '#/login';
        }
        return Promise.reject(error);
    }
);

// ============================================================================
// AUTH CONTEXT
// ============================================================================

const AuthContext = createContext(null);

const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (token) {
            fetchUser();
        } else {
            setLoading(false);
        }
    }, []);

    const fetchUser = async () => {
        try {
            const response = await apiClient.get('/auth/me');
            setUser(response.data);
        } catch (error) {
            localStorage.removeItem('access_token');
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        const params = new URLSearchParams();
        params.append('username', email);
        params.append('password', password);

        const response = await apiClient.post('/auth/login', params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        localStorage.setItem('access_token', response.data.access_token);
        await fetchUser();
        return response.data;
    };

    const register = async (data) => {
        const response = await apiClient.post('/auth/register', data);
        localStorage.setItem('access_token', response.data.access_token);
        await fetchUser();
        return response.data;
    };

    const logout = () => {
        localStorage.removeItem('access_token');
        setUser(null);
        window.location.href = '#/login';
    };

    return html`
        <${AuthContext.Provider} value=${{ user, loading, login, register, logout }}>
            ${children}
        </${AuthContext.Provider}>
    `;
};

const useAuth = () => useContext(AuthContext);

// ============================================================================
// TOAST NOTIFICATION CONTEXT
// ============================================================================

const ToastContext = createContext(null);

const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const showToast = (message, variant = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, variant }]);

        // Auto-dismiss after 4 seconds
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
    };

    const removeToast = (id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    const contextValue = useMemo(() => ({ showToast }), [showToast]);
    
    console.log('ToastProvider initializing with:', contextValue);

    return html`
        <${ToastContext.Provider} value=${contextValue}>
            ${children}
            
            <div className="fixed top-4 right-4 z-[200] space-y-3 pointer-events-none">
                ${toasts.map(toast => html`
                    <${Toast} 
                        key=${toast.id} 
                        message=${toast.message} 
                        variant=${toast.variant}
                        onClose=${() => removeToast(toast.id)}
                    />
                `)}
            </div>
        </${ToastContext.Provider}>
    `;
};

const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        console.error('useToast must be used within a ToastProvider');
        return { showToast: () => console.warn('showToast called outside of provider') };
    }
    return context;
};

const Toast = ({ message, variant = 'info', onClose }) => {
    const variants = {
        success: {
            bg: 'bg-emerald-50',
            border: 'border-emerald-200',
            icon: 'check-circle',
            iconColor: 'text-emerald-600',
            textColor: 'text-emerald-900'
        },
        error: {
            bg: 'bg-rose-50',
            border: 'border-rose-200',
            icon: 'alert-circle',
            iconColor: 'text-rose-600',
            textColor: 'text-rose-900'
        },
        info: {
            bg: 'bg-blue-50',
            border: 'border-blue-200',
            icon: 'info',
            iconColor: 'text-blue-600',
            textColor: 'text-blue-900'
        }
    };

    const config = variants[variant] || variants.info;

    return html`
        <div className="pointer-events-auto animate-in slide-in-from-right-5 fade-in duration-300 max-w-sm">
            <div className="${config.bg} ${config.border} border rounded-xl shadow-lg p-4 pr-2 flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                    <${Icon} name=${config.icon} size=${20} className=${config.iconColor} />
                </div>
                <p className="${config.textColor} text-sm font-medium flex-1 pr-2">${message}</p>
                <button 
                    onClick=${onClose}
                    className="flex-shrink-0 p-1.5 rounded-lg hover:bg-black/5 transition-colors"
                >
                    <${Icon} name="x" size=${16} className="text-gray-500" />
                </button>
            </div>
        </div>
    `;
};

// ============================================================================
// UI COMPONENTS
// ============================================================================

const Button = ({ children, variant = 'primary', size = 'md', className = '', ...props }) => {
    const baseClasses = 'font-bold rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2';

    const variants = {
        primary: 'bg-primary-600 hover:bg-primary-700 text-white shadow-lg shadow-primary-600/20',
        secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-900 dark:bg-midnight-800 dark:hover:bg-midnight-700 dark:text-white',
        outline: 'border-2 border-primary-600 text-primary-600 hover:bg-primary-50 dark:hover:bg-midnight-900/50 dark:border-primary-500 dark:text-primary-400',
        danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/20',
        ghost: 'hover:bg-gray-100 dark:hover:bg-midnight-800 text-gray-700 dark:text-gray-300',
    };

    const sizes = {
        sm: 'px-3 py-1 text-[11px] sm:text-xs uppercase tracking-wider',
        md: 'px-4 py-2 text-xs sm:text-sm uppercase tracking-wider',
        lg: 'px-6 py-3 text-sm sm:text-base uppercase tracking-wider',
    };

    return html`
        <button
            className=${`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
            ...${props}
        >
            ${children}
        </button>
    `;
};

const Card = ({ children, className = '', ...props }) => {
    return html`
        <div className=${`premium-card rounded-2xl ${className}`} ...${props}>
            ${children}
        </div>
    `;
};

const Input = ({ label, type = 'text', className = '', ...props }) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

    return html`
        <div className="space-y-1.5 w-full">
            ${label && html`<label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-midnight-400 ml-1">${label}</label>`}
            <div className="relative">
                <input
                    type=${inputType}
                    className=${`w-full px-4 py-2.5 bg-gray-50 dark:bg-midnight-900/50 text-gray-900 dark:text-white border border-gray-200 dark:border-midnight-800 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:focus:border-primary-500 transition-all outline-none text-sm ${className} ${isPassword ? 'pr-11' : ''}`}
                    ...${props}
                />
                ${isPassword && html`
                    <button 
                        type="button"
                        onClick=${() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-primary-500 transition-colors"
                    >
                        <${Icon} name=${showPassword ? 'eye-off' : 'eye'} size=${18} />
                    </button>
                `}
            </div>
        </div>
    `;
};

const Badge = ({ children, variant = 'default', className = '' }) => {
    const variants = {
        default: 'bg-gray-100 text-gray-700 border-gray-200/50 dark:bg-midnight-800 dark:text-midnight-300 dark:border-midnight-700/50',
        success: 'bg-emerald-50 text-emerald-700 border-emerald-100/50 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50',
        warning: 'bg-amber-50 text-amber-700 border-amber-100/50 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/50',
        error: 'bg-rose-50 text-rose-700 border-rose-100/50 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800/50 font-semibold',
        info: 'bg-sky-50 text-sky-700 border-sky-100/50 dark:bg-sky-900/20 dark:text-sky-400 dark:border-sky-800/50',
        primary: 'bg-primary-50 text-primary-700 border-primary-100/50 dark:bg-primary-900/20 dark:text-primary-400 dark:border-primary-800/50',
    };

    return html`
        <span className=${`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold border ${variants[variant] || variants.default} ${className}`}>
            ${children}
        </span>
    `;
};

const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return html`
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-x-hidden overflow-y-auto outline-none focus:outline-none">
            <div 
                className="fixed inset-0 bg-midnight-950/40 dark:bg-black/80 backdrop-blur-md transition-opacity duration-300 animate-in fade-in"
                onClick=${onClose}
            ></div>

            <div className="relative w-full max-w-lg mx-auto bg-white dark:bg-midnight-950 rounded-3xl shadow-2xl transition-all transform animate-in zoom-in-95 fade-in duration-300 ease-out border border-gray-100 dark:border-midnight-800 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50 dark:border-midnight-800 bg-gray-50/50 dark:bg-midnight-900/50">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">${title}</h3>
                    <button 
                        onClick=${onClose} 
                        className="p-2 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-all active:scale-95"
                    >
                        <${Icon} name="x" size=${20} />
                    </button>
                </div>
                
                <div className="p-6">
                    ${children}
                </div>
            </div>
        </div>
    `;
};

// ============================================================================
// ICON COMPONENTS (using Lucide)
// ============================================================================

const Icon = ({ name, size = 24, className = '' }) => {
    const iconRef = useRef(null);

    useEffect(() => {
        if (window.lucide && iconRef.current) {
            // Create a temporary element for Lucide to transform
            iconRef.current.innerHTML = `<i data-lucide="${name}" style="width: ${size}px; height: ${size}px;"></i>`;
            window.lucide.createIcons({
                root: iconRef.current,
            });
        }
    }, [name, size]);

    // Use a span as a stable container that React manages
    // React doesn't know about or touch the children injected by Lucide
    return html`<span 
        ref=${iconRef} 
        className=${`inline-flex items-center justify-center ${className}`} 
        style=${{ width: `${size}px`, height: `${size}px` }}
    ></span>`;
};

const Dropdown = ({ trigger, children, align = 'right' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return html`
        <div className="relative" ref=${dropdownRef}>
            <div onClick=${() => setIsOpen(!isOpen)}>${trigger}</div>
            ${isOpen && html`
                <div className="absolute z-10 mt-2 w-48 rounded-2xl shadow-xl bg-white dark:bg-midnight-950 border border-gray-100 dark:border-midnight-800 ring-1 ring-black/5 backdrop-blur-xl ${align === 'right' ? 'right-0' : 'left-0'} animate-dropdown-pop">
                    <div className="py-1 overflow-hidden rounded-2xl" role="menu" aria-orientation="vertical">
                        ${children}
                    </div>
                </div>
            `}
        </div>
    `;
};

const MessagingAnimation = () => {
    const [messages, setMessages] = useState([]);
    const [receivedCount, setReceivedCount] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            const id = Date.now();
            setMessages(prev => [...prev, { id, target: Math.floor(Math.random() * 3) }]);

            // Remove message after animation completes and trigger "received" effect
            setTimeout(() => {
                setMessages(prev => prev.filter(m => m.id !== id));
                setReceivedCount(prev => (prev + 1) % 4);
            }, 2000);
        }, 1500);

        return () => clearInterval(interval);
    }, []);

    const receivers = [
        { x: 80, y: 20, icon: 'user' },
        { x: 85, y: 50, icon: 'users' },
        { x: 80, y: 80, icon: 'building' }
    ];

    return html`
        <div className="relative h-32 w-full mb-6 select-none">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1">
                <div className="relative">
                    <div className="absolute inset-0 bg-white/20 rounded-full animate-signal"></div>
                    <div className="bg-white p-3 rounded-xl shadow-xl relative z-10">
                        <${Icon} name="smartphone" size=${24} className="text-primary-600" />
                    </div>
                </div>
                <span className="text-[10px] font-medium text-blue-100 uppercase tracking-widest">You</span>
            </div>

            <svg className="absolute inset-0 w-full h-full pointer-events-none">
                ${receivers.map((r, i) => html`
                    <line
                        key=${i}
                        x1="15%" y1="50%"
                        x2="${r.x}%" y2="${r.y}%"
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth="1.5"
                    />
                `)}

                ${messages.map((m) => {
        const r = receivers[m.target];
        return html`
                        <circle
                            key=${m.id}
                            r="3"
                            fill="white"
                            style=${{
                animation: 'message-move 2s ease-in-out forwards',
                '--target-y': `${r.y}%`
            }}
                        />
                    `;
    })}
            </svg>

            ${receivers.map((r, i) => html`
                <div
                    key=${i}
                    className="absolute flex flex-col items-center gap-1 transition-all duration-300"
                    style=${{ left: `${r.x}%`, top: `${r.y}%`, transform: 'translate(-50%, -50%)' }}
                >
                    <div className="relative">
                        <div className="bg-white/10 p-2 rounded-lg backdrop-blur-sm border border-white/20 transition-all ${receivedCount === i + 1 ? 'scale-110 bg-white/30 border-white/50' : ''}">
                            <${Icon} name=${r.icon} size=${16} />
                        </div>
                        ${receivedCount === i + 1 && html`
                            <div className="absolute -top-1.5 -right-1.5 bg-green-400 p-0.5 rounded-full shadow-lg animate-pop-in">
                                <${Icon} name="check" size=${8} className="text-white" />
                            </div>
                        `}
                    </div>
                </div>
            `)}

            <style>${`
                @keyframes message-move {
                    0% { left: 15%; top: 50%; opacity: 0; transform: scale(0.5); }
                    20% { opacity: 1; transform: scale(1); }
                    80% { opacity: 1; transform: scale(1); }
                    100% { left: 80%; top: var(--target-y); opacity: 0; transform: scale(0.5); }
                }
            `}</style>
        </div>
    `;
};

// ============================================================================
// AUTHENTICATION PAGES (CLEAN, UNSCROLLABLE, MOBILE-FIRST)
// ============================================================================

const AuthLayout = ({ children, view, setView, isLogin }) => {
    // Shared layout that holds both the visual showcase and the form.
    // Guaranteed to be h-[100dvh] and unscrollable globally.
    
    return html`
        <div className="h-[100dvh] w-full bg-white dark:bg-midnight-950 overflow-hidden flex flex-col lg:flex-row relative selection:bg-primary-500/30">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-500/10 blur-[100px] rounded-full pointer-events-none hidden lg:block"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[100px] rounded-full pointer-events-none hidden lg:block"></div>

            <div className="${view === 'form' ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-[45%] h-full relative p-5 sm:p-8 shrink-0 border-r border-gray-100 dark:border-midnight-800 transition-all duration-500 bg-[#f8fafc] dark:bg-midnight-950/50 backdrop-blur-3xl overflow-hidden justify-between">
                
                <div className="absolute inset-0 z-0 opacity-[0.03] dark:opacity-[0.05]" style=${{ backgroundImage: 'radial-gradient(#2563eb 1px, transparent 1px)', backgroundSize: '16px 16px' }}></div>
                
                <div className="relative z-10 flex items-center justify-between">
                    <img src="assets/NEXRA_IconBeside.png" alt="NEXRA" className="h-16 object-contain dark:contrast-125 hover:opacity-80 transition-opacity" />
                    
                    <button onClick=${() => setView('form')} className="lg:hidden text-sm font-semibold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 px-4 py-2 rounded-full flex items-center gap-1 active:scale-95 transition-transform">
                        ${isLogin ? 'Sign In' : 'Sign Up'} <${Icon} name="arrow-right" size=${16} />
                    </button>
                </div>

                <div className="relative z-10 flex-1 flex flex-col justify-center max-w-lg mx-auto w-full group">
                    <div className="animate-slide-up space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-midnight-900 shadow-sm border border-gray-200 dark:border-midnight-800 text-xs font-semibold text-gray-700 dark:text-midnight-300">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
                            </span>
                            NEXRA SMS Gateway 2.0
                        </div>
                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 dark:text-white leading-tight tracking-tight">
                            Communicate with <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-blue-500">impact.</span>
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 text-sm lg:text-base max-w-sm">
                            Experience next-generation messaging infrastructure built for scale and reliability.
                        </p>
                    </div>

                    <div className="relative h-56 sm:h-64 mt-8 sm:mt-12 mb-4 w-full max-w-md mx-auto pointer-events-none">
                        <div className="absolute inset-0 bg-gradient-to-tr from-primary-500/20 to-transparent rounded-full blur-[80px]"></div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-white dark:bg-midnight-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-midnight-800 p-4 transition-transform duration-700 hover:scale-105 flex items-center justify-center z-20">
                            <img src="assets/NEXRA_IconAbove.png" className="w-24 h-24 object-contain drop-shadow-xl" />
                        </div>
                        
                        <div className="absolute top-[10%] left-[10%] w-12 h-12 bg-white dark:bg-midnight-800 rounded-full shadow-lg border border-gray-100 dark:border-midnight-700 flex items-center justify-center animate-float z-10" style=${{ animationDelay: '0s' }}>
                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                                <${Icon} name="user" size=${16} className="text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="absolute inset-0 rounded-full border-2 border-blue-400 opacity-0 animate-ping" style=${{ animationDelay: '1s', animationDuration: '3s' }}></div>
                        </div>

                        <div className="absolute bottom-[10%] right-[10%] w-14 h-14 bg-white dark:bg-midnight-800 rounded-full shadow-lg border border-gray-100 dark:border-midnight-700 flex items-center justify-center animate-float z-10" style=${{ animationDelay: '1.5s' }}>
                            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                                <${Icon} name="users" size=${18} className="text-green-600 dark:text-green-400" />
                            </div>
                            <div className="absolute inset-0 rounded-full border-2 border-green-400 opacity-0 animate-ping" style=${{ animationDelay: '2.5s', animationDuration: '3s' }}></div>
                        </div>

                        <div className="absolute top-[20%] right-[5%] w-10 h-10 bg-white dark:bg-midnight-800 rounded-full shadow-lg border border-gray-100 dark:border-midnight-700 flex items-center justify-center animate-float z-10" style=${{ animationDelay: '0.7s' }}>
                            <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
                                <${Icon} name="smartphone" size=${12} className="text-purple-600 dark:text-purple-400" />
                            </div>
                        </div>

                        <div className="absolute bottom-[20%] left-[5%] w-12 h-12 bg-white dark:bg-midnight-800 rounded-full shadow-lg border border-gray-100 dark:border-midnight-700 flex items-center justify-center animate-float z-10" style=${{ animationDelay: '2.2s' }}>
                            <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center">
                                <${Icon} name="laptop" size=${16} className="text-orange-600 dark:text-orange-400" />
                            </div>
                        </div>

                        <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-green-500 rounded-full blur-[1px] shadow-[0_0_10px_2px_rgba(34,197,94,0.6)] z-30" style=${{ animation: 'send-packet-1 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite' }}></div>
                        <div className="absolute top-[15%] left-[15%] w-2 h-2 bg-blue-500 rounded-full blur-[1px] shadow-[0_0_10px_2px_rgba(59,130,246,0.6)] z-30" style=${{ animation: 'receive-packet-1 3s cubic-bezier(0.4, 0, 0.2, 1) infinite 1s' }}></div>
                        <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-purple-500 rounded-full blur-[1px] shadow-[0_0_10px_2px_rgba(168,85,247,0.6)] z-30" style=${{ animation: 'send-packet-2 2.8s cubic-bezier(0.4, 0, 0.2, 1) infinite 0.5s' }}></div>
                        <div className="absolute bottom-[20%] left-[10%] w-2 h-2 bg-orange-500 rounded-full blur-[1px] shadow-[0_0_10px_2px_rgba(249,115,22,0.6)] z-30" style=${{ animation: 'receive-packet-2 3.2s cubic-bezier(0.4, 0, 0.2, 1) infinite 1.5s' }}></div>
                    </div>
                </div>

                <div className="relative z-10 flex items-center justify-between text-xs text-gray-500 dark:text-gray-500 font-medium">
                    <span>© 2026 NEXRA</span>
                    <div className="flex gap-4">
                        <a href="#" className="hover:text-gray-900 dark:hover:text-gray-300 transition-colors">Privacy</a>
                        <a href="#" className="hover:text-gray-900 dark:hover:text-gray-300 transition-colors">Terms</a>
                    </div>
                </div>
            </div>

            <div className="${view === 'showcase' ? 'hidden lg:flex' : 'flex'} flex-1 flex-col justify-center items-center px-4 py-8 sm:p-6 lg:p-12 h-full relative overflow-y-auto custom-scrollbar animate-slide-left bg-white dark:bg-midnight-950">
                <button 
                    onClick=${() => setView('showcase')}
                    className="lg:hidden absolute top-4 left-4 sm:top-6 sm:left-6 p-2 rounded-full bg-gray-100 dark:bg-midnight-800 text-gray-600 dark:text-midnight-400 hover:bg-gray-200 dark:hover:bg-midnight-700 transition-all active:scale-95 z-20"
                >
                    <${Icon} name="chevron-left" size=${20} />
                </button>

                <div className="w-full max-w-[360px] mx-auto space-y-6 lg:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="text-center">
                        <img src="assets/NEXRA_IconAbove.png" className="h-[72px] sm:h-20 mx-auto -mt-6 mb-4 lg:hidden object-contain" />
                        ${children[0] /* Header Text */}
                    </div>
                    
                    ${children[1] /* The Form */}
                    
                    ${children[2] /* Footer Links */}
                </div>
            </div>
        </div>
    `;
};


const LoginPage = () => {
    const { login } = useAuth();
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

        const token = getParam('token');
        if (token) {
            localStorage.setItem('access_token', token);
            // Clean the URL without refreshing
            window.history.replaceState({}, document.title, window.location.pathname + window.location.hash.split('?')[0]);
            window.location.href = '#/dashboard';
        }

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleGoogleLogin = async () => {
        try {
            const response = await apiClient.get('auth/google/login');
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
            window.location.href = '#/dashboard';
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
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-red-50 dark:hover:bg-red-900/10 hover:border-red-200 dark:hover:border-red-800 transition-all text-sm font-semibold text-gray-700 dark:text-gray-300 active:scale-[0.98] group"
                    >
                        <svg className="w-4 h-4 text-[#4285F4] group-hover:scale-110 transition-transform" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" /><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                        Continue with <span className="text-[#4285F4]">Google</span>
                    </button>
                </form>
            </div>

            <p className="text-center text-xs text-gray-600 dark:text-gray-400">
                Don't have an account? <a href="#/register" className="font-bold text-gray-900 dark:text-white hover:underline underline-offset-2">Sign up</a>
            </p>
        </${AuthLayout}>
    `;
};


const RegisterPage = () => {
    const { register } = useAuth();
    const [view, setView] = useState('showcase');
    const [formData, setFormData] = useState({
        full_name: '',
        organization_name: '',
        email: '',
        password: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const handleResize = () => { if (window.innerWidth >= 1024) setView('form'); };
        handleResize();
        window.addEventListener('resize', handleResize);

        // Handle OAuth token in URL (if redirected back to register for some reason)
        const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
        const token = urlParams.get('token');
        if (token) {
            localStorage.setItem('access_token', token);
            window.location.href = '#/dashboard';
        }

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleGoogleLogin = async () => {
        try {
            const response = await apiClient.get('auth/google/login');
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
            await register(formData);
            window.location.href = '#/dashboard';
        } catch (err) {
            setError(err.response?.data?.detail || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    return html`
        <${AuthLayout} view=${view} setView=${setView} isLogin=${false}>
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Create an account</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Start your 14-day free trial. No credit card required.</p>
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

// ============================================================================
// DASHBOARD LAYOUT
// ============================================================================

const MobileNav = ({ currentPage, onNavigate }) => {
    const navItems = [
        { id: 'dashboard', label: 'Pulse', icon: 'home' },
        { id: 'campaigns', label: 'Campaigns', icon: 'send' },
        { id: 'contacts', label: 'Contacts', icon: 'users' },
        { id: 'messages', label: 'Messages', icon: 'message-square' },
        { id: 'api-docs', label: 'API', icon: 'code' },
    ];

    return html`
        <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[90%] max-w-sm glass rounded-2xl lg:hidden z-40 shadow-2xl transition-all">
            <div className="flex justify-around p-1">
                ${navItems.map((item) => html`
                    <button
                        key=${item.id}
                        onClick=${() => onNavigate(item.id)}
                        className="flex-1 flex flex-col items-center py-1.5 rounded-xl transition-all ${currentPage === item.id ? 'text-primary-600 dark:text-primary-400 bg-primary-50/50 dark:bg-primary-900/20 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-midnight-900/30'}"
                    >
                        <${Icon} name=${item.icon} size=${18} />
                        <span className="text-[9px] mt-0.5 font-bold uppercase tracking-wider">${item.label}</span>
                    </button>
                `)}
            </div>
        </nav>
    `;
};

const Sidebar = ({ currentPage, onNavigate }) => {
    const { user } = useAuth();
    const navItems = [
        { id: 'dashboard', label: 'Pulse', icon: 'home' },
        { id: 'campaigns', label: 'Campaigns', icon: 'send' },
        { id: 'contacts', label: 'Contacts', icon: 'users' },
        { id: 'messages', label: 'Messages', icon: 'message-square' },
        { id: 'pricing', label: 'Wallet', icon: 'credit-card' },
        { id: 'settings', label: 'Settings', icon: 'settings' }
    ];

    return html`
        <aside className="hidden lg:flex lg:flex-col lg:w-72 bg-white dark:bg-midnight-950 border-r border-gray-200 dark:border-midnight-800 h-screen sticky top-0 transition-colors">
            <div className="p-6 border-b border-gray-200 dark:border-midnight-800 flex justify-center">
                <div className="dark:bg-white/5 dark:p-1 dark:rounded-xl dark:border dark:border-white/5 transition-all">
                    <img src="assets/NEXRA_IconBeside.png" alt="NEXRA Logo" className="h-14 lg:h-16 object-contain dark:contrast-125" />
                </div>
            </div>

            <nav className="flex-1 p-4 space-y-1 overflow-y-auto no-scrollbar">
                ${navItems.map((item) => html`
                    <button
                        key=${item.id}
                        onClick=${() => onNavigate(item.id)}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentPage === item.id
            ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 font-medium'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}"
                    >
                        <${Icon} name=${item.icon} size=${20} />
                        <span>${item.label}</span>
                    </button>
                `)}

            </nav>
            
            <div className="p-4 space-y-1 border-t border-gray-100 dark:border-midnight-800">
                <button
                    onClick=${() => onNavigate('sender-ids')}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${currentPage === 'sender-ids' ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400' : ''}"
                >
                    <${Icon} name="pen-tool" size=${20} />
                    <span>Sender IDs</span>
                </button>
                <button
                    onClick=${() => onNavigate('help')}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${currentPage === 'help' ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400' : ''}"
                >
                    <${Icon} name="help-circle" size=${20} />
                    <span>Help Center</span>
                </button>
                <button
                    onClick=${() => onNavigate('api-docs')}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${currentPage === 'api-docs' ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400' : ''}"
                >
                    <${Icon} name="code" size=${20} />
                    <span>API Docs</span>
                </button>
            </div>
        </aside>
    `;
};

const Header = ({ user, balance, onLogout, title, subtitle, onQuickSend, notifications, onMarkRead, onMarkAllRead }) => {
    const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
    
    const toggleDarkMode = () => {
        const root = document.documentElement;
        if (root.classList.contains('dark')) {
            root.classList.remove('dark');
            setIsDark(false);
        } else {
            root.classList.add('dark');
            setIsDark(true);
        }
    };

    return html`
        <header className="fixed top-2 left-1/2 -translate-x-1/2 w-[94%] max-w-lg glass rounded-2xl lg:hidden z-30 shadow-xl transition-all">
            <div className="px-4 py-2 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <div className="dark:bg-white/10 dark:p-0 dark:px-1 dark:rounded-lg dark:border dark:border-white/10 transition-all">
                        <img src="assets/NEXRA_IconBeside.png" alt="NEXRA Logo" className="h-8 object-contain dark:contrast-125" />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick=${toggleDarkMode}
                        className="p-1.5 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-all focus:outline-none flex items-center justify-center active:scale-90"
                        title=${isDark ? 'Switch to Light' : 'Switch to Dark'}
                    >
                        <${Icon} name=${isDark ? 'sun' : 'moon'} size=${16} className=${`rotate-icon ${isDark ? 'rotate-0' : 'rotate-[360deg]'}`} />
                    </button>

                    <${Dropdown}
                        trigger=${html`
                            <button className="flex items-center gap-1.5 p-1 hover:bg-gray-100 dark:hover:bg-midnight-800 rounded-xl transition-all">
                                <div className="h-7 w-7 bg-primary-100 dark:bg-primary-900/50 rounded-full flex items-center justify-center text-primary-700 dark:text-primary-400 font-bold border border-primary-200 dark:border-primary-800/50 text-xs">
                                    ${user?.full_name?.charAt(0) || 'U'}
                                </div>
                                <${Icon} name="chevron-down" size=${14} className="text-gray-400" />
                            </button>
                        `}
                    >
                        <div className="px-4 py-3 border-b border-gray-100 dark:border-midnight-800">
                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">${user?.full_name}</p>
                            <p className="text-[10px] font-bold text-primary-600 dark:text-primary-400 uppercase tracking-widest mt-0.5">${user?.organization_name || 'Personal'}</p>
                            <p className="text-[10px] text-gray-500 dark:text-midnight-400 truncate mt-0.5">${user?.email}</p>
                        </div>

                        <div className="px-4 py-3 border-b border-gray-50 dark:border-midnight-800 bg-primary-50/30 dark:bg-primary-900/10">
                            <p className="text-[10px] font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider mb-1">Available Balance</p>
                            <div className="flex items-center gap-2">
                                <${Icon} name="wallet" size=${16} className="text-primary-600 dark:text-primary-400" />
                                <span className="text-lg font-bold text-gray-900 dark:text-white">
                                    ${balance?.toFixed(2) || '0.00'} <span className="text-xs font-semibold text-gray-500 dark:text-midnight-400 ml-0.5">GHS</span>
                                </span>
                            </div>
                        </div>

                        <a href="#/pricing" className="flex items-center gap-2 px-4 py-3 text-sm text-gray-700 dark:text-midnight-200 hover:bg-gray-50 dark:hover:bg-midnight-800 transition-colors">
                            <${Icon} name="credit-card" size=${16} className="text-gray-400 dark:text-midnight-500" />
                            Pricing & Credits
                        </a>
                        <a href="#/sender-ids" className="flex items-center gap-2 px-4 py-3 text-sm text-gray-700 dark:text-midnight-200 hover:bg-gray-50 dark:hover:bg-midnight-800 transition-colors">
                            <${Icon} name="pen-tool" size=${16} className="text-gray-400 dark:text-midnight-500" />
                            Sender IDs
                        </a>
                        <a href="#/help" className="flex items-center gap-2 px-4 py-3 text-sm text-gray-700 dark:text-midnight-200 hover:bg-gray-50 dark:hover:bg-midnight-800 transition-colors">
                            <${Icon} name="help-circle" size=${16} className="text-gray-400 dark:text-midnight-500" />
                            Help & Support
                        </a>
                        <button onClick=${onLogout} className="flex w-full items-center gap-2 px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-left transition-colors border-t border-gray-50 dark:border-midnight-800">
                            <${Icon} name="log-out" size=${16} />
                            Sign out
                        </button>
                    </${Dropdown}>
                </div>
            </div>
        </header>

        <header className="hidden lg:block bg-white/80 dark:bg-midnight-950/80 backdrop-blur-lg border-b border-gray-200 dark:border-midnight-800 sticky top-0 z-30 transition-colors">
            <div className="px-8 py-4 flex items-center justify-between gap-4">
                <div className="min-w-0 flex flex-col">
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate line-clamp-1 leading-tight">
                        ${title}
                    </h1>
                    ${subtitle && html`
                        <p className="text-xs text-gray-500 dark:text-midnight-400 truncate line-clamp-1">
                            ${subtitle}
                        </p>
                    `}
                </div>

                <div className="flex items-center gap-4">
                    <button 
                        onClick=${toggleDarkMode}
                        className="p-2 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800 transition-all focus:outline-none flex items-center justify-center active:scale-90"
                        aria-label="Toggle Dark Mode"
                    >
                        <${Icon} name=${isDark ? 'sun' : 'moon'} size=${18} className=${`rotate-icon ${isDark ? 'rotate-0' : 'rotate-[360deg]'}`} />
                    </button>

                    <${Button} 
                        variant="primary" 
                        size="sm" 
                        className="hidden sm:flex rounded-full px-5 py-2 font-bold text-[10px] uppercase tracking-widest gap-2 bg-primary-600 hover:bg-primary-700 text-white shadow-premium"
                        onClick=${onQuickSend}
                    >
                        <${Icon} name="send" size=${12} />
                        Quick Send
                    </${Button}>

                    <${NotificationDropdown}
                        notifications=${notifications || []}
                        onMarkRead=${onMarkRead}
                        onMarkAllRead=${onMarkAllRead}
                    />

                    <${Dropdown}
                        trigger=${html`
                            <button className="flex items-center gap-2 p-1 px-2 hover:bg-gray-100 dark:hover:bg-midnight-800 rounded-xl transition-all">
                                <div className="text-right mr-1">
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">${user?.full_name}</p>
                                    <div className="flex items-center gap-1.5 justify-end">
                                        <p className="text-[10px] font-bold text-primary-600 dark:text-primary-400 uppercase tracking-widest">${user?.organization_name || 'Personal'}</p>
                                        <span className="h-1 w-1 rounded-full bg-gray-300 dark:bg-midnight-700"></span>
                                        <p className="text-gray-500 dark:text-midnight-400 text-xs">${user?.email}</p>
                                    </div>
                                </div>
                                <div className="h-8 w-8 bg-primary-100 dark:bg-primary-900/50 rounded-full flex items-center justify-center text-primary-700 dark:text-primary-400 font-bold border border-primary-200 dark:border-primary-800/50">
                                    ${user?.full_name?.charAt(0) || 'U'}
                                </div>
                                <${Icon} name="chevron-down" size=${16} className="text-gray-400 dark:text-midnight-500" />
                            </button>
                        `}
                    >
                        <div className="px-4 py-3 border-b border-gray-50 dark:border-midnight-800 bg-primary-50/30 dark:bg-primary-900/10">
                            <p className="text-[10px] font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider mb-1">Available Balance</p>
                            <div className="flex items-center gap-2">
                                <${Icon} name="wallet" size=${16} className="text-primary-600 dark:text-primary-400" />
                                <span className="text-lg font-bold text-gray-900 dark:text-white">
                                    ${balance?.toFixed(2) || '0.00'} <span className="text-xs font-semibold text-gray-500 dark:text-midnight-400 ml-0.5">GHS</span>
                                </span>
                            </div>
                        </div>

                        <a
                            href="#/pricing"
                            className="flex items-center gap-2 px-4 py-3 text-sm text-gray-700 dark:text-midnight-200 hover:bg-gray-50 dark:hover:bg-midnight-800 transition-colors"
                            role="menuitem"
                        >
                            <${Icon} name="credit-card" size=${16} className="text-gray-400 dark:text-midnight-500" />
                            Pricing & Credits
                        </a>
                        <a
                            href="#/help"
                            className="flex items-center gap-2 px-4 py-3 text-sm text-gray-700 dark:text-midnight-200 hover:bg-gray-50 dark:hover:bg-midnight-800 transition-colors"
                            role="menuitem"
                        >
                            <${Icon} name="help-circle" size=${16} className="text-gray-400 dark:text-midnight-500" />
                            Help & Support
                        </a>
                        <button
                            onClick=${onLogout}
                            className="flex w-full items-center gap-2 px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-left transition-colors border-t border-gray-50 dark:border-midnight-800"
                            role="menuitem"
                        >
                            <${Icon} name="log-out" size=${16} />
                            Sign out
                        </button>
                    </${Dropdown}>
                </div>
            </div>
        </header>
    `;
};

const NotificationDropdown = ({ notifications, onMarkRead, onMarkAllRead }) => {
    const [isOpen, setIsOpen] = useState(false);
    const unreadCount = notifications.filter(n => !n.is_read).length;

    return html`
        <div className="relative">
            <button 
                onClick=${() => setIsOpen(!isOpen)}
                className="relative p-2.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/10 rounded-2xl transition-all"
            >
                <${Icon} name="bell" size=${20} />
                ${unreadCount > 0 && html`
                    <span className="absolute top-2 right-2 w-4 h-4 bg-red-500 border-2 border-white dark:border-midnight-950 rounded-full text-[8px] font-black text-white flex items-center justify-center animate-pulse">
                        ${unreadCount}
                    </span>
                `}
            </button>

            ${isOpen && html`
                <div className="absolute top-full right-0 mt-3 w-80 bg-white dark:bg-midnight-900 border border-gray-100 dark:border-midnight-800 rounded-3xl shadow-premium z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                    <div className="p-4 border-b border-gray-50 dark:border-midnight-800 bg-gray-50/50 dark:bg-midnight-950/50 flex items-center justify-between">
                        <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest">Notifications</span>
                        <button onClick=${onMarkAllRead} className="text-[10px] font-bold text-primary-600 hover:underline">Mark all read</button>
                    </div>
                    
                    <div className="max-h-[360px] overflow-y-auto custom-scrollbar">
                        ${notifications.length === 0 ? html`
                            <div className="p-12 text-center text-gray-400 dark:text-midnight-500">
                                <${Icon} name="bell-off" size=${32} className="mx-auto mb-3 opacity-20" />
                                <p className="text-[10px] font-bold uppercase tracking-widest">All caught up!</p>
                            </div>
                        ` : notifications.map(n => html`
                            <div 
                                key=${n.id}
                                onClick=${() => {
                                    if (!n.is_read) onMarkRead(n.id);
                                    if (n.link) window.location.hash = n.link;
                                    setIsOpen(false);
                                }}
                                className="p-4 border-b border-gray-50 dark:border-midnight-800 hover:bg-gray-50 dark:hover:bg-midnight-950/50 cursor-pointer transition-colors relative group"
                            >
                                <div className="flex gap-4">
                                    <div className="mt-1">
                                        <div className="p-2 rounded-xl bg-primary-50 dark:bg-primary-900/10 text-primary-600">
                                            <${Icon} name=${
                                                n.type === 'success' ? 'check-circle' :
                                                n.type === 'error' ? 'alert-circle' :
                                                n.type === 'warning' ? 'alert-triangle' : 'info'
                                            } size=${16} />
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-0.5">
                                            <p className="text-xs font-black text-gray-900 dark:text-white">${n.title}</p>
                                            <span className="text-[9px] font-bold text-gray-400">${new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <p className="text-[11px] text-gray-600 dark:text-midnight-400 leading-relaxed">${n.message}</p>
                                    </div>
                                </div>
                                ${!n.is_read && html`<div className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary-600 rounded-full group-hover:h-full transition-all" />`}
                            </div>
                        `)}
                    </div>
                    
                    <div className="p-3 border-t border-gray-50 dark:border-midnight-800 text-center bg-gray-50/50 dark:bg-midnight-950/50">
                        <button className="text-[10px] font-black text-gray-400 dark:text-midnight-500 uppercase tracking-widest hover:text-primary-600">View All Updates</button>
                    </div>
                </div>
            `}
        </div>
    `;
};

const TemplateSelector = ({ onSelect }) => {
    const [templates, setTemplates] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const fetchTemplates = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/templates');
            setTemplates(res.data);
        } catch (error) {
            console.error('Failed to fetch templates:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) fetchTemplates();
    }, [isOpen]);

    return html`
        <div className="relative">
            <button 
                type="button"
                onClick=${() => setIsOpen(!isOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 dark:bg-primary-900/10 hover:bg-primary-100 dark:hover:bg-primary-900/20 border border-primary-100 dark:border-primary-900/30 rounded-lg text-[10px] font-black text-primary-600 dark:text-primary-400 uppercase tracking-widest transition-all shadow-sm"
            >
                <${Icon} name="layout" size=${12} />
                Load Template
            </button>

            ${isOpen && html`
                <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-midnight-900 border border-gray-100 dark:border-midnight-800 rounded-2xl shadow-premium z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-3 border-b border-gray-50 dark:border-midnight-800 bg-gray-50/50 dark:bg-midnight-950/50 flex items-center justify-between">
                        <span className="text-[10px] font-black text-gray-400 dark:text-midnight-500 uppercase tracking-widest">Saved Templates</span>
                        <button onClick=${() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
                            <${Icon} name="x" size=${14} />
                        </button>
                    </div>
                    <div className="max-h-64 overflow-y-auto p-2 space-y-1">
                        ${loading ? html`<div className="p-4 text-center animate-pulse"><div className="h-4 w-24 bg-gray-100 dark:bg-midnight-800 rounded mx-auto"></div></div>` : 
                          templates.length === 0 ? html`<div className="p-4 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">No templates found</div>` :
                          templates.map(t => html`
                            <button
                                key=${t.id}
                                type="button"
                                onClick=${() => {
                                    onSelect(t.content);
                                    setIsOpen(false);
                                }}
                                className="w-full p-3 text-left hover:bg-primary-50 dark:hover:bg-primary-900/10 rounded-xl transition-colors group"
                            >
                                <p className="text-xs font-black text-gray-900 dark:text-white mb-0.5 group-hover:text-primary-600">${t.title}</p>
                                <p className="text-[10px] text-gray-500 dark:text-midnight-400 line-clamp-1 italic">"${t.content}"</p>
                            </button>
                          `)}
                    </div>
                    <div className="p-3 border-t border-gray-50 dark:border-midnight-800 bg-gray-50/50 dark:bg-midnight-950/50">
                        <a href="#/templates" className="text-[9px] font-black text-primary-600 dark:text-primary-400 uppercase tracking-widest hover:underline flex items-center justify-center gap-1.5">
                            <${Icon} name="settings" size=${10} />
                            Manage Templates
                        </a>
                    </div>
                </div>
            `}
        </div>
    `;
};

const QuickSendModal = ({ isOpen, onClose, user, onSent }) => {
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
                                className="w-full px-5 py-4 bg-gray-50 dark:bg-midnight-950 rounded-2xl border border-gray-100 dark:border-midnight-800 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all text-gray-900 dark:text-white"
                                required
                            />
                        </div>

                        <${Button} 
                            type="submit" 
                            variant="primary" 
                            className="w-full py-4 rounded-2xl text-sm font-black uppercase tracking-[0.2em] shadow-glow"
                            disabled=${loading}
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

const DashboardLayout = ({ children, currentPage, onNavigate }) => {
    const { logout } = useAuth();
    const [user, setUser] = useState(null);
    const [balance, setBalance] = useState({ wallet: 0, subscription: 0 });
    const [notifications, setNotifications] = useState([]);
    const [isQuickSendOpen, setIsQuickSendOpen] = useState(false);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const res = await apiClient.get('/auth/me');
                setUser(res.data);
                fetchWallet(res.data.id);
                fetchNotifications();
            } catch (err) {
                console.error('Core data fetch failed');
            }
        };

        fetchUserData();
        const interval = setInterval(fetchUserData, 30000); // 30s refresh
        return () => clearInterval(interval);
    }, []);

    const fetchWallet = async (id) => {
        try {
            const res = await apiClient.get('/billing/balance');
            setBalance({ 
                wallet: res.data.balance,
                subscription: res.data.subscription_credits 
            });
        } catch (error) {
            console.error('Wallet fetch failed');
        }
    };

    const fetchNotifications = async () => {
        try {
            const res = await apiClient.get('/notifications');
            setNotifications(res.data);
        } catch (error) {
            console.error('Notifications fetch failed');
        }
    };

    const handleMarkRead = async (id) => {
        try {
            await apiClient.post(`/notifications/${id}/read`);
            fetchNotifications();
        } catch (error) {
            console.error('Failed to mark as read');
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await apiClient.post('/notifications/read-all');
            fetchNotifications();
        } catch (error) {
            console.error('Failed to mark all as read');
        }
    };

    const pageInfo = {
        dashboard: { title: 'Pulse', subtitle: "Welcome back! Here's your overview." },
        campaigns: { title: 'Campaigns', subtitle: 'Manage your SMS campaigns' },
        'campaigns/create': { title: 'Create Campaign', subtitle: 'Set up your new SMS broadcast' },
        contacts: { title: 'Contacts', subtitle: 'Manage your audience' },
        messages: { title: 'Message History', subtitle: 'Track your sent and received SMS' },
        pricing: { title: 'Pricing & Wallet', subtitle: 'Manage credits and view rates' },
        settings: { title: 'Settings', subtitle: 'Manage your account and preferences' },
        'sender-ids': { title: 'Sender IDs', subtitle: 'Manage your verified sending names' },
        templates: { title: 'Templates', subtitle: 'Manage your reusable message templates' },
        help: { title: 'Help Center', subtitle: 'Everything you need to know about NEXRA' },
        'api-docs': { title: 'Developer API', subtitle: 'Integrate NEXRA into your own applications' },
    };

    const { title, subtitle } = pageInfo[currentPage] || { title: 'Pulse', subtitle: '' };

    return html`
        <div className="flex h-[100dvh] overflow-hidden bg-[#f8fafc] dark:bg-midnight-950 transition-colors">
            <${Sidebar} currentPage=${currentPage} onNavigate=${onNavigate} />

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                <${Header} 
                    user=${user} 
                    balance=${balance.wallet} 
                    onLogout=${logout} 
                    title=${title} 
                    subtitle=${subtitle} 
                    onQuickSend=${() => setIsQuickSendOpen(true)}
                    notifications=${notifications}
                    onMarkRead=${handleMarkRead}
                    onMarkAllRead=${handleMarkAllRead}
                />
                
                <main className="flex-1 p-4 lg:p-6 pb-28 lg:pb-6 pt-28 lg:pt-6 overflow-y-auto no-scrollbar">
                    <div className="mb-4 lg:hidden">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">${title}</h1>
                        ${subtitle && html`<p className="text-gray-600 dark:text-midnight-400 mt-0.5 text-sm">${subtitle}</p>`}
                    </div>

                    ${children}
                </main>

                <${MobileNav} currentPage=${currentPage} onNavigate=${onNavigate} />

                <${QuickSendModal} 
                    isOpen=${isQuickSendOpen} 
                    onClose=${() => setIsQuickSendOpen(false)} 
                    user=${user}
                    onSent=${() => {
                        fetchWallet();
                        fetchNotifications();
                    }}
                />
            </div>
        </div>
    `;
};

const SenderIDSelect = ({ value, onChange }) => {
    const [senderIds, setSenderIds] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchSenderIds = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/sender-ids');
            setSenderIds(res.data);
        } catch (error) {
            console.error('Failed to fetch Sender IDs:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSenderIds();
    }, []);

    if (loading) return html`<div className="h-10 animate-pulse bg-gray-100 dark:bg-midnight-900 rounded-lg"></div>`;

    const approvedIds = senderIds.filter(s => s.status === 'approved');

    return html`
        <div className="space-y-2">
            <div className="flex gap-2">
                <select 
                    value=${value} 
                    onChange=${(e) => onChange(e.target.value)}
                    className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm text-gray-900 dark:text-white outline-none appearance-none transition-all"
                >
                    <option value="">Select an approved Sender ID</option>
                    ${senderIds.map(s => html`
                        <option 
                            key=${s.id} 
                            value=${s.sender_id} 
                            disabled=${s.status !== 'approved'}
                        >
                            ${s.sender_id} (${s.status.toUpperCase()})
                        </option>
                    `)}
                </select>
                <button 
                    type="button" 
                    onClick=${fetchSenderIds} 
                    className="p-2 text-gray-400 hover:text-primary-600 transition-colors"
                >
                    <${Icon} name="refresh-cw" size=${20} />
                </button>
            </div>
            ${approvedIds.length === 0 && html`
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded-xl">
                    <p className="text-[10px] text-red-600 dark:text-red-400 font-bold flex items-center gap-1.5 uppercase tracking-wider">
                        <${Icon} name="alert-circle" size=${12} />
                        No approved Sender IDs found.
                    </p>
                    <a href="#/sender-ids" className="text-[10px] text-primary-600 dark:text-primary-400 font-bold hover:underline block mt-1">
                        Request or check status in Sender IDs
                    </a>
                </div>
            `}
        </div>
    `;
};

// ============================================================================
// SENDER ID MANAGEMENT
// ============================================================================

const SenderIDManagement = () => {
    const { showToast } = useToast();
    const [senderIds, setSenderIds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newId, setNewId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchSenderIds();
    }, []);

    const fetchSenderIds = async () => {
        setLoading(true);
        try {
            const response = await apiClient.get('/sender-ids');
            setSenderIds(response.data);
        } catch (error) {
            console.error('Failed to fetch Sender IDs:', error);
            showToast('Failed to load Sender IDs', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleRequest = async (e) => {
        e.preventDefault();
        const cleanId = newId.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (!cleanId || cleanId.length < 3) {
            showToast('Sender ID must be at least 3 alphanumeric characters', 'error');
            return;
        }
        setIsSubmitting(true);
        try {
            await apiClient.post('/sender-ids', { sender_id: cleanId });
            showToast('Sender ID requested successfully!', 'success');
            setNewId('');
            fetchSenderIds();
        } catch (error) {
            showToast(error.response?.data?.detail || 'Request failed', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return html`
        <div className="space-y-6 fade-in max-w-4xl mx-auto">
            <${Card} className="p-6 overflow-hidden relative transition-all">
                <div className="absolute top-0 left-0 w-full h-1 bg-primary-600"></div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Request New Sender ID</h2>
                        <p className="text-sm text-gray-500 dark:text-midnight-400 mt-1">
                            Submit a new alphanumeric identity for approval
                        </p>
                    </div>
                </div>
                
                <form onSubmit=${handleRequest} className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1">
                        <${Input} 
                            placeholder="e.g. MY_BRAND" 
                            value=${newId} 
                            onChange=${(e) => setNewId(e.target.value.toUpperCase())}
                            maxLength=${11}
                            className="text-lg font-black tracking-widest text-primary-700 dark:text-primary-400"
                        />
                    </div>
                    <${Button} type="submit" disabled=${isSubmitting || newId.trim().length < 3} className="sm:px-8">
                        ${isSubmitting ? 'Requesting...' : 'Request Approval'}
                    </${Button}>
                </form>
            </${Card}>

            <div className="flex items-center justify-between px-2">
                <h3 className="font-bold text-gray-900 dark:text-white uppercase tracking-wider text-sm flex items-center gap-2">
                    <${Icon} name="history" size=${16} className="text-primary-600" />
                    Request History
                </h3>
                <button onClick=${fetchSenderIds} className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1 transition-colors">
                    <${Icon} name="refresh-cw" size=${12} />
                    Refresh
                </button>
            </div>

            <${Card} className="overflow-hidden bg-white/50 dark:bg-midnight-950/50 backdrop-blur-sm border-gray-100 dark:border-midnight-800 transition-all">
                ${loading ? html`
                    <div className="p-12 text-center">
                        <div className="animate-spin inline-block text-primary-600"><${Icon} name="loader-2" size=${32} /></div>
                        <p className="text-sm text-gray-500 mt-4">Loading history...</p>
                    </div>
                ` : senderIds.length === 0 ? html`
                    <div className="p-16 text-center text-gray-500">
                        <div className="w-20 h-20 bg-gray-50 dark:bg-midnight-900 rounded-full flex items-center justify-center mx-auto mb-4">
                            <${Icon} name="pen-tool" size=${32} className="text-gray-300 dark:text-midnight-700" />
                        </div>
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">No Sender IDs yet</h4>
                        <p className="text-sm">Requests you make will appear here.</p>
                    </div>
                ` : html`
                    <div className="divide-y divide-gray-100 dark:divide-midnight-800">
                        ${senderIds.map((item) => html`
                            <div key=${item.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white dark:hover:bg-midnight-900 transition-colors">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-3">
                                        <p className="font-black text-xl text-gray-900 dark:text-white tracking-widest uppercase">${item.sender_id}</p>
                                        <${Badge} variant=${item.status === 'approved' ? 'success' : item.status === 'rejected' ? 'error' : 'warning'}>
                                            ${item.status}
                                        </${Badge}>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] sm:text-xs text-gray-500 dark:text-midnight-500 font-bold uppercase tracking-wider">
                                        <span>Requested ${new Date(item.created_at).toLocaleDateString()}</span>
                                        <span className="opacity-30">•</span>
                                        <span>ID: #${item.id}</span>
                                    </div>
                                </div>
                                
                                ${item.admin_comment && html`
                                    <div className="flex-1 max-w-sm sm:mx-6 p-3 bg-gray-50 dark:bg-midnight-800 rounded-xl text-xs text-gray-600 dark:text-midnight-300 border border-gray-100 dark:border-midnight-800 flex gap-2 animate-in fade-in slide-in-from-left-2 transition-all">
                                        <${Icon} name="message-square" size=${14} className="mt-0.5 shrink-0 text-primary-500" />
                                        <div>
                                            <span className="font-bold text-gray-400 uppercase text-[10px] block mb-0.5">Admin Comment</span>
                                            ${item.admin_comment}
                                        </div>
                                    </div>
                                `}

                                ${item.status === 'rejected' && html`
                                    <${Button} variant="outline" size="sm" onClick=${() => { setNewId(item.sender_id); window.scrollTo({top: 0, behavior: 'smooth'}); }} className="text-[10px] font-bold uppercase py-1">
                                        Retry
                                    </${Button}>
                                `}
                            </div>
                        `)}
                    </div>
                `}
            </${Card}>
        </div>
    `;
};

const HelpPage = () => {
    const faqs = [
        {
            q: "How do I request a Sender ID?",
            a: "Go to the 'Sender IDs' section in the menu, enter your desired name (3-11 characters), and click 'Request Approval'. Most requests are approved within 2-4 hours."
        },
        {
            q: "What is the 'Pending' status?",
            a: "Messages in 'Pending' status are either drafted but not yet sent, or are currently in the process of being delivered by our gateway."
        },
        {
            q: "How do I top up my balance?",
            a: "Visit the 'Wallet' section to see pricing and contact support to purchase credits. Automated online payments are coming soon."
        },
        {
            q: "Why did my campaign fail?",
            a: "Campaigns usually fail if the SMS gateway is temporarily offline or if your account balance is insufficient. You can retry failed campaigns from the Campaigns list."
        }
    ];

    return html`
        <div className="space-y-6 fade-in max-w-4xl mx-auto">
            <${Card} className="bg-gradient-to-br from-primary-600 to-blue-700 p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-3xl rounded-full -mr-20 -mt-20 pointer-events-none"></div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <h2 className="text-2xl font-black uppercase tracking-tight">Need Assistance?</h2>
                        <p className="text-blue-100/80 text-sm max-w-sm">Our support team is available 24/7 to help you with your messaging needs.</p>
                        <div className="flex gap-4 pt-4">
                            <a href="mailto:support@nexra.com" className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all border border-white/20 text-xs font-bold uppercase tracking-wider">
                                <${Icon} name="mail" size=${16} />
                                Email Support
                            </a>
                            <a href="tel:+23300000000" className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all border border-white/20 text-xs font-bold uppercase tracking-wider">
                                <${Icon} name="phone" size=${16} />
                                Call Us
                            </a>
                        </div>
                    </div>
                    <${Icon} name="help-circle" size=${80} className="opacity-20 hidden md:block" />
                </div>
            </${Card}>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <${Icon} name="message-circle" size=${20} className="text-primary-600" />
                        Frequently Asked Questions
                    </h3>
                    
                    <div className="space-y-4">
                        ${faqs.map(faq => html`
                            <${Card} key=${faq.q} className="p-5 border-gray-100 bg-white hover:border-primary-200 transition-all">
                                <h4 className="font-bold text-gray-900 mb-2">${faq.q}</h4>
                                <p className="text-sm text-gray-600 leading-relaxed">${faq.a}</p>
                            </${Card}>
                        `)}
                    </div>
                </div>

                <div className="space-y-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <${Icon} name="book-open" size=${20} className="text-primary-600" />
                        Resources
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                        <${Card} className="p-4 border-gray-100 flex items-center gap-4 hover:border-primary-200 cursor-pointer transition-all">
                            <div className="p-3 rounded-xl bg-orange-50 text-orange-600"><${Icon} name="file-text" size=${24} /></div>
                            <div>
                                <h4 className="font-bold text-sm">Documentation</h4>
                                <p className="text-[10px] text-gray-500">Full platform guides</p>
                            </div>
                        </${Card}>
                        <${Card} className="p-4 border-gray-100 flex items-center gap-4 hover:border-primary-200 cursor-pointer transition-all" onClick=${() => window.location.hash = '#/api-docs'}>
                            <div className="p-3 rounded-xl bg-purple-50 text-purple-600"><${Icon} name="code" size=${24} /></div>
                            <div>
                                <h4 className="font-bold text-sm">API Reference</h4>
                                <p className="text-[10px] text-gray-500">Developer integrations</p>
                            </div>
                        </${Card}>
                    </div>
                </div>

                <div className="space-y-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <${Icon} name="zap" size=${20} className="text-amber-500" />
                        Quick Start
                    </h3>
                    
                    <${Card} className="p-5 bg-amber-50/50 border-amber-100 dark:bg-amber-900/10 dark:border-amber-900/20">
                        <ul className="space-y-4">
                            <li className="flex gap-3">
                                <div className="h-6 w-6 shrink-0 bg-white rounded-full flex items-center justify-center text-[10px] font-black text-amber-600 shadow-sm border border-amber-100">1</div>
                                <div className="text-sm">
                                    <p className="font-bold text-gray-900">Request ID</p>
                                    <p className="text-xs text-gray-600 mt-0.5">Start by getting a verified Sender ID approved.</p>
                                </div>
                            </li>
                            <li className="flex gap-3">
                                <div className="h-6 w-6 shrink-0 bg-white rounded-full flex items-center justify-center text-[10px] font-black text-amber-600 shadow-sm border border-amber-100">2</div>
                                <div className="text-sm">
                                    <p className="font-bold text-gray-900">Add Contacts</p>
                                    <p className="text-xs text-gray-600 mt-0.5">Upload your recipient list in the Contacts section.</p>
                                </div>
                            </li>
                            <li className="flex gap-3">
                                <div className="h-6 w-6 shrink-0 bg-white rounded-full flex items-center justify-center text-[10px] font-black text-amber-600 shadow-sm border border-amber-100">3</div>
                                <div className="text-sm">
                                    <p className="font-bold text-gray-900">Send News</p>
                                    <p className="text-xs text-gray-600 mt-0.5">Create and broadcast your first campaign.</p>
                                </div>
                            </li>
                        </ul>
                    </${Card}>

                    <${Card} className="p-5 border-emerald-100 bg-emerald-50/30">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-xs font-bold uppercase tracking-widest text-emerald-700">Platform Status</h4>
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                        </div>
                        <p className="font-bold text-emerald-900">System Healthy</p>
                        <p className="text-[10px] text-emerald-700/70 mt-1 uppercase tracking-wider font-bold">API latency: 42ms</p>
                    </${Card}>
                </div>
            </div>
        </div>
    `;
};

const APIDocsPage = () => {
    const { showToast } = useToast();
    const [apiKeys, setApiKeys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showNewKeyModal, setShowNewKeyModal] = useState(false);
    const [newKeyName, setNewKeyName] = useState('');
    const [createdKey, setCreatedKey] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [docTab, setDocTab] = useState('curl');

    const fetchApiKeys = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/developer/api-keys');
            setApiKeys(res.data);
        } catch (error) {
            showToast('Failed to fetch API keys', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchApiKeys(); }, []);

    const handleCreateKey = async (e) => {
        e.preventDefault();
        setIsGenerating(true);
        try {
            const res = await apiClient.post('/developer/api-keys', { name: newKeyName });
            setCreatedKey(res.data.api_key);
            setNewKeyName('');
            fetchApiKeys();
        } catch (error) {
            showToast('Failed to generate key', 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleRevokeKey = async (id) => {
        if (!confirm('Are you sure? This will immediately disable all integrations using this key.')) return;
        try {
            await apiClient.delete(`/developer/api-keys/${id}`);
            showToast('API key revoked', 'success');
            fetchApiKeys();
        } catch (error) {
            showToast('Failed to revoke key', 'error');
        }
    };

    const codeExamples = {
        curl: `curl -X POST "http://localhost:8000/api/v1/sms/send" \\
     -H "X-API-Key: YOUR_API_KEY" \\
     -H "Content-Type: application/json" \\
     -d '{"recipient":"23324XXXXXXX","sender":"NEXRA","message":"Hello!"}'`,
        python: `import requests\n\nheaders = {"X-API-Key": "YOUR_API_KEY"}\ndata = {"recipient": "23324XXXXXXX", "sender": "NEXRA", "message": "Hello!"}\nresponse = requests.post(\n    "http://localhost:8000/api/v1/sms/send",\n    json=data, headers=headers\n)\nprint(response.json())`,
        javascript: `fetch('http://localhost:8000/api/v1/sms/send', {\n  method: 'POST',\n  headers: {'X-API-Key': 'YOUR_API_KEY', 'Content-Type': 'application/json'},\n  body: JSON.stringify({recipient: '23324XXXXXXX', sender: 'NEXRA', message: 'Hello!'})\n}).then(r => r.json()).then(console.log);`
    };

    return html`
        <div className="space-y-6 fade-in max-w-5xl mx-auto pb-12">
            <${Card} className="relative overflow-hidden p-6 sm:p-8 border-gray-100 dark:border-midnight-800 bg-white dark:bg-midnight-950 shadow-sm">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary-600/10 dark:bg-primary-600/5 blur-[100px] rounded-full -mr-20 -mt-20 pointer-events-none"></div>
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-500/10 rounded-full border border-primary-500/20">
                            <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
                            <span className="text-[10px] font-black text-primary-600 dark:text-primary-400 uppercase tracking-widest">Developer Beta</span>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white leading-tight">Build with NEXRA</h2>
                        <p className="text-gray-500 dark:text-midnight-400 text-sm max-w-md">Programmatically send SMS, manage contacts, and track delivery with our REST API.</p>
                        <${Button} variant="primary" onClick=${() => setShowNewKeyModal(true)} className="rounded-2xl px-6 shadow-glow mt-2">
                            <${Icon} name="plus" size=${18} className="mr-2" />
                            Create API Key
                        </${Button} mt-2>
                    </div>
                    <${Icon} name="terminal" size=${64} className="text-primary-500/20 hidden md:block" />
                </div>
            </${Card}>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-4">
                    <h3 className="text-xs font-black text-gray-500 dark:text-white uppercase tracking-widest flex items-center gap-2 px-1">
                        <${Icon} name="key" size=${14} className="text-primary-600" />
                        Your API Keys
                    </h3>
                    <${Card} className="divide-y divide-gray-50 dark:divide-midnight-800 bg-white dark:bg-midnight-950 shadow-sm overflow-hidden">
                        ${loading ? html`<div className="p-8 text-center"><${Icon} name="loader-2" size=${24} className="animate-spin text-primary-600 mx-auto" /></div>`
                        : apiKeys.length === 0 ? html`<div className="p-8 text-center text-gray-400 dark:text-midnight-600"><p className="text-[10px] font-bold uppercase tracking-widest">No keys yet</p></div>`
                        : apiKeys.map(key => html`
                            <div key=${key.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-midnight-900/40 transition-colors">
                                <div>
                                    <p className="text-xs font-black text-gray-900 dark:text-white">${key.name}</p>
                                    <p className="text-[9px] font-mono text-gray-400 dark:text-midnight-500 mt-1">${key.key_prefix}••••••••••••</p>
                                </div>
                                <button onClick=${() => handleRevokeKey(key.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                                    <${Icon} name="trash-2" size=${14} />
                                </button>
                            </div>
                        `)}
                    </${Card}>
                </div>

                <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-xs font-black text-gray-500 dark:text-white uppercase tracking-widest flex items-center gap-2 px-1">
                        <${Icon} name="book-open" size=${14} className="text-primary-600" />
                        Quick Start
                    </h3>
                    <${Card} className="overflow-hidden bg-white dark:bg-midnight-950 border-gray-100 dark:border-midnight-800 shadow-sm">
                        <div className="flex border-b border-gray-100 dark:border-midnight-800 bg-gray-100/50 dark:bg-midnight-900/50">
                            ${['curl', 'python', 'javascript'].map(tab => html`
                                <button onClick=${() => setDocTab(tab)} className=${`px-5 py-3.5 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 ${docTab === tab ? 'border-primary-600 text-primary-600 bg-white dark:bg-midnight-800' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-midnight-500 dark:hover:text-midnight-300'}`}>
                                    ${tab === 'curl' ? 'cURL' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                                </button>
                            `)}
                        </div>
                        <div className="p-4 sm:p-6 bg-[#0f172a] relative border-x-0">
                            <button onClick=${() => { navigator.clipboard.writeText(codeExamples[docTab]); showToast('Copied!', 'success'); }}
                                className="absolute top-4 right-4 p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white/50 hover:text-white transition-all backdrop-blur-sm">
                                <${Icon} name="copy" size=${16} />
                            </button>
                            <pre className="text-[11px] sm:text-xs font-mono text-white selection:bg-primary-500/50 overflow-x-auto leading-relaxed whitespace-pre font-medium" style=${{ color: 'white' }}>${codeExamples[docTab]}</pre>
                        </div>
                        <div className="p-4 border-t border-gray-100 dark:border-midnight-800 flex gap-3 bg-white dark:bg-midnight-900">
                            <${Icon} name="info" size=${18} className="text-primary-600 shrink-0 mt-0.5" />
                            <p className="text-[12px] text-gray-900 dark:text-white font-bold leading-relaxed">
                                Include <code className="bg-primary-100 dark:bg-primary-600/30 px-2 py-0.5 rounded text-primary-700 dark:text-primary-400 font-black">X-API-Key: YOUR_KEY</code> in every request header.
                            </p>
                        </div>
                    </${Card}>
                </div>
            </div>

            <${Modal} isOpen=${showNewKeyModal} onClose=${() => { setShowNewKeyModal(false); setCreatedKey(null); }} title="Generate API Key">
                ${createdKey ? html`
                    <div className="space-y-6 text-center py-2">
                        <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto text-green-600">
                            <${Icon} name="check" size=${28} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold dark:text-white">Key Generated!</h3>
                            <p className="text-sm text-gray-500 mt-1">Copy now — it won't be shown again.</p>
                        </div>
                        <div className="relative">
                            <div className="p-4 bg-gray-50 dark:bg-midnight-950 rounded-2xl border-2 border-dashed border-primary-300 dark:border-primary-900 font-mono text-xs text-primary-600 break-all select-all text-left">
                                ${createdKey}
                            </div>
                            <button onClick=${() => { navigator.clipboard.writeText(createdKey); showToast('Copied!', 'success'); }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-primary-600 text-white rounded-xl shadow-glow">
                                <${Icon} name="copy" size=${14} />
                            </button>
                        </div>
                        <${Button} variant="primary" onClick=${() => { setShowNewKeyModal(false); setCreatedKey(null); }} className="w-full py-3 rounded-2xl font-black uppercase tracking-widest">
                            I've stored it safely ✓
                        </${Button}>
                    </div>
                ` : html`
                    <form onSubmit=${handleCreateKey} className="space-y-5">
                        <p className="text-sm text-gray-500">Give your key a name to identify it later (e.g. "Production App").</p>
                        <${Input} label="Key Name" placeholder='e.g. My Integration' required value=${newKeyName} onChange=${(e) => setNewKeyName(e.target.value)} />
                        <div className="flex gap-3 pt-1">
                            <${Button} type="button" variant="outline" onClick=${() => setShowNewKeyModal(false)} className="flex-1 rounded-2xl">Cancel</${Button}>
                            <${Button} type="submit" className="flex-1 rounded-2xl py-3 shadow-glow" disabled=${isGenerating || !newKeyName.trim()}>
                                ${isGenerating ? 'Generating...' : 'Generate Key'}
                            </${Button}>
                        </div>
                    </form>
                `}
            </${Modal}>
        </div>
    `;
};

const DashboardPage = () => {
    const [stats, setStats] = useState({ pending: 0, delivered: 0, failed: 0 });
    const [campaigns, setCampaigns] = useState([]);
    const [analytics, setAnalytics] = useState({ activity: [], success_rate: {}, networks: {} });
    const [loading, setLoading] = useState(true);

    const activityChartRef = useRef(null);
    const successChartRef = useRef(null);
    const chartsInitialized = useRef({ activity: null, success: null });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [statsRes, campaignsRes, analyticsRes] = await Promise.all([
                apiClient.get('/messages/stats'),
                apiClient.get('/campaigns?limit=5'),
                apiClient.get('/analytics/stats')
            ]);
            setStats({
                pending: statsRes.data.pending || 0,
                delivered: statsRes.data.delivered || 0,
                failed: statsRes.data.failed || 0
            });
            setCampaigns(campaignsRes.data.items || []);
            setAnalytics(analyticsRes.data);
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!loading && analytics.activity.length >= 0) {
            initCharts();
        }
        return () => {
            if (chartsInitialized.current.activity) chartsInitialized.current.activity.destroy();
            if (chartsInitialized.current.success) chartsInitialized.current.success.destroy();
        };
    }, [loading, analytics]);

    const initCharts = () => {
        if (!activityChartRef.current || !successChartRef.current) return;

        // Cleanup existing
        if (chartsInitialized.current.activity) chartsInitialized.current.activity.destroy();
        if (chartsInitialized.current.success) chartsInitialized.current.success.destroy();

        // Activity Chart (Line)
        const activityCtx = activityChartRef.current.getContext('2d');
        chartsInitialized.current.activity = new Chart(activityCtx, {
            type: 'line',
            data: {
                labels: analytics.activity.map(a => new Date(a.day).toLocaleDateString(undefined, { weekday: 'short' })),
                datasets: [{
                    label: 'Messages',
                    data: analytics.activity.map(a => a.count),
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { display: true, grid: { display: false }, ticks: { font: { size: 10 } } },
                    y: { display: true, grid: { color: 'rgba(0,0,0,0.05)' }, border: { display: false }, ticks: { font: { size: 10 } } }
                }
            }
        });

        // Success Rate Chart (Doughnut)
        const successCtx = successChartRef.current.getContext('2d');
        const s = analytics.success_rate;
        chartsInitialized.current.success = new Chart(successCtx, {
            type: 'doughnut',
            data: {
                labels: ['Delivered', 'Failed', 'Pending'],
                datasets: [{
                    data: [s.delivered || 0, s.failed || 0, s.pending || 0],
                    backgroundColor: ['#10b981', '#ef4444', '#f59e0b'],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: { legend: { display: false } }
            }
        });
    };

    if (loading) {
        return html`
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        `;
    }

    return html`
        <div className="space-y-6 fade-in">


            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <${Card} className="lg:col-span-2 p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-[10px] font-black text-gray-400 dark:text-midnight-500 uppercase tracking-widest px-1">Weekly Activity</h2>
                        <span className="text-[10px] font-bold text-primary-600 bg-primary-50 dark:bg-primary-900/20 px-2 py-0.5 rounded-full">Pulse</span>
                    </div>
                    <div className="h-[180px] sm:h-[200px] relative">
                        <canvas ref=${activityChartRef}></canvas>
                    </div>
                </${Card}>

                <${Card} className="p-4">
                    <h2 className="text-[10px] font-black text-gray-400 dark:text-midnight-500 uppercase tracking-widest px-1 mb-3">Delivery Performance</h2>
                    
                    <div className="flex lg:block items-center gap-4">
                        <div className="h-[120px] w-[120px] lg:h-[150px] lg:w-full relative flex-shrink-0 flex items-center justify-center">
                            <canvas ref=${successChartRef}></canvas>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <p className="text-2xl font-black text-gray-900 dark:text-white leading-none">
                                    ${((analytics.success_rate.delivered / (analytics.success_rate.delivered + analytics.success_rate.failed + analytics.success_rate.pending || 1)) * 100).toFixed(0)}%
                                </p>
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">delivered</p>
                            </div>
                        </div>
                        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-2 lg:mt-4 lg:pt-4 lg:border-t border-gray-50 dark:border-midnight-800">
                            <div className="flex lg:flex-col items-center lg:items-center justify-between lg:justify-center gap-2">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0"></span>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Delivered</p>
                                </div>
                                <p className="text-sm font-black text-emerald-500">${analytics.success_rate.delivered}</p>
                            </div>
                            <div className="flex lg:flex-col items-center lg:items-center justify-between lg:justify-center gap-2">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0"></span>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Failed</p>
                                </div>
                                <p className="text-sm font-black text-rose-500">${analytics.success_rate.failed}</p>
                            </div>
                            <div className="flex lg:flex-col items-center lg:items-center justify-between lg:justify-center gap-2">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0"></span>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Pending</p>
                                </div>
                                <p className="text-sm font-black text-amber-500">${analytics.success_rate.pending}</p>
                            </div>
                        </div>
                    </div>
                </${Card}>
            </div>

            <${Card} className="p-4 lg:p-6 overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Recent Campaigns</h2>
                    <a href="#/campaigns" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                        View all
                    </a>
                </div>

                ${campaigns.length === 0 ? html`
                    <div className="text-center py-8 text-gray-500">
                        <${Icon} name="inbox" size=${48} className="mx-auto mb-2 text-gray-400" />
                        <p>No campaigns yet</p>
                    </div>
                ` : html`
                    <div className="space-y-3">
                        ${campaigns.map((campaign) => html`
                            <div key=${campaign.id} className="flex items-center justify-between p-3.5 bg-gray-50/50 dark:bg-midnight-900/50 rounded-xl border border-gray-100/50 dark:border-midnight-800 shadow-sm transition-all hover:border-primary-100 dark:hover:border-primary-900/50 group">
                                <div className="flex-1">
                                    <p className="font-bold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">${campaign.name}</p>
                                    <p className="text-[10px] font-bold text-gray-400 dark:text-midnight-500 uppercase tracking-widest mt-0.5">
                                        ${new Date(campaign.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                                <${Badge} variant=${
                                    campaign.status === 'completed' ? 'success' : 
                                    campaign.status === 'failed' ? 'danger' :
                                    campaign.status === 'sending' ? 'info' :
                                    campaign.status === 'scheduled' ? 'warning' : 'info'
                                }>
                                    ${campaign.status}
                                </${Badge}>
                            </div>
                        `)}
                    </div>
                `}
            </${Card}>

            <div className="grid grid-cols-2 gap-3 mb-4">
                <${Button} variant="primary" size="sm" className="w-full" onClick=${() => window.location.href = '#/campaigns/create'}>
                    <${Icon} name="plus" size=${16} />
                    New Campaign
                </${Button}>
                <${Button} variant="outline" size="sm" className="w-full" onClick=${() => window.location.href = '#/contacts'}>
                    <${Icon} name="users" size=${16} />
                    Contacts
                </${Button}>
            </div>
        </div>
    `;
};

const CampaignsPage = () => {
    const { showToast } = useToast();
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCampaigns();
    }, []);

    const fetchCampaigns = async () => {
        try {
            const response = await apiClient.get('/campaigns');
            setCampaigns(response.data.items || []);
        } catch (error) {
            console.error('Failed to fetch campaigns:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleBatchRetry = async (campaignId) => {
        try {
            await apiClient.post(`/campaigns/${campaignId}/retry`);
            showToast('All failed messages have been re-enqueued', 'success');
            fetchCampaigns();
        } catch (error) {
            showToast('Retry failed: ' + (error.response?.data?.detail || 'Unknown error'), 'error');
        }
    };

    const handleBroadcast = async (campaignId) => {
        try {
            await apiClient.post(`/campaigns/${campaignId}/broadcast`);
            showToast('Broadcast started successfully!', 'success');
            fetchCampaigns();
        } catch (error) {
            showToast('Broadcast failed: ' + (error.response?.data?.detail || 'Unknown error'), 'error');
        }
    };

    const handleDeleteCampaign = async (campaignId) => {
        if (!confirm('Are you sure you want to delete this campaign?')) return;
        try {
            await apiClient.delete(`/campaigns/${campaignId}`);
            showToast('Campaign deleted', 'success');
            fetchCampaigns();
        } catch (error) {
            showToast('Delete failed: ' + (error.response?.data?.detail || 'Unknown error'), 'error');
        }
    };

    if (loading) {
        return html`<div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>`;
    }

    return html`
        <div className="space-y-6 fade-in">
            <div className="flex items-center justify-end">
                <${Button} onClick=${() => window.location.href = '#/campaigns/create'}>
                    <${Icon} name="plus" size=${20} className="inline mr-2" />
                    <span className="hidden sm:inline">New Campaign</span>
                </${Button}>
            </div>

            ${campaigns.length === 0 ? html`
                <${Card} className="p-12 text-center">
                    <${Icon} name="inbox" size=${64} className="mx-auto mb-4 text-gray-400 dark:text-midnight-600" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No campaigns yet</h3>
                    <p className="text-gray-600 dark:text-midnight-400 mb-6">Create your first campaign to get started</p>
                    <${Button} onClick=${() => window.location.href = '#/campaigns/create'}>
                        Create Campaign
                    </${Button}>
                </${Card}>
            ` : html`
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    ${campaigns.map((campaign) => html`
                        <${Card} key=${campaign.id} className="p-5 hover:shadow-lg transition-all group">
                            <div className="flex items-start justify-between mb-4">
                                <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">${campaign.name}</h3>
                                <${Badge} variant=${
                                    campaign.status === 'completed' ? 'success' : 
                                    campaign.status === 'failed' ? 'danger' :
                                    campaign.status === 'sending' ? 'info' :
                                    campaign.status === 'scheduled' ? 'warning' : 'info'
                                }>
                                    ${campaign.status}
                                </${Badge}>
                            </div>
                            <p className="text-sm text-gray-600 mb-4 line-clamp-2">${campaign.template}</p>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500">${new Date(campaign.created_at).toLocaleDateString()}</span>
                                <div className="flex gap-3 items-center">
                                    ${['draft', 'scheduled'].includes(campaign.status) && html`
                                        <${Button} 
                                            size="sm"
                                            onClick=${() => handleBroadcast(campaign.id)} 
                                            className="px-3"
                                            disabled=${campaign.status === 'scheduled'}
                                            title=${campaign.status === 'scheduled' ? 'This campaign is scheduled for automatic broadcast' : 'Broadcast Now'}
                                        >
                                            Broadcast
                                        </${Button}>
                                    `}
                                    ${campaign.status !== 'completed' && html`
                                        <button 
                                            onClick=${() => window.location.hash = `#/campaigns/create?edit=${campaign.id}`} 
                                            className="text-primary-600 hover:text-primary-700 font-medium"
                                            title="Edit"
                                        >
                                            <${Icon} name="edit-2" size=${14} />
                                        </button>
                                    `}
                                    ${['failed', 'draft'].includes(campaign.status) && html`
                                        <button 
                                            onClick=${() => handleBatchRetry(campaign.id)} 
                                            className="text-primary-600 hover:text-primary-700 font-medium"
                                            title="Retry"
                                        >
                                            <${Icon} name="refresh-cw" size=${14} />
                                        </button>
                                    `}
                                    <button 
                                        onClick=${() => handleDeleteCampaign(campaign.id)} 
                                        className="text-red-600 hover:text-red-700" 
                                        title="Delete"
                                    >
                                        <${Icon} name="trash-2" size=${14} />
                                    </button>
                                </div>
                            </div>
                        </${Card}>
                    `)}
                </div>
            `}
        </div>
    `;
};

const CreateCampaignPage = () => {
    const { showToast } = useToast();
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        name: '',
        sender: '',
        template: '',
        scheduled_at: '',
    });
    const [contacts, setContacts] = useState([]);
    const [selectedContacts, setSelectedContacts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [recipientMode, setRecipientMode] = useState('none'); // 'none', 'select', or 'manual'
    const [searchQuery, setSearchQuery] = useState('');
    const [newContact, setNewContact] = useState({ first_name: '', last_name: '', phone_number: '' });
    const [isSavingContact, setIsSavingContact] = useState(false);
    const [showContactModal, setShowContactModal] = useState(false);
    const [showGroupModal, setShowGroupModal] = useState(false);
    const [groups, setGroups] = useState([]);
    const [selectedGroups, setSelectedGroups] = useState([]);
    const [previewContact, setPreviewContact] = useState({ first_name: 'John', last_name: 'Doe', phone_number: '233241234567' });

    // Update preview contact based on selection
    useEffect(() => {
        const updatePreview = async () => {
            // Priority 1: Specifically selected individual contacts
            if (selectedContacts.length > 0) {
                const contact = contacts.find(c => c.id === selectedContacts[0]);
                if (contact) {
                    setPreviewContact(contact);
                    return;
                }
            }
            
            // Priority 2: Contacts from selected segments
            if (selectedGroups.length > 0) {
                try {
                    const response = await apiClient.get(`/groups/${selectedGroups[0]}/contacts`);
                    const groupContacts = response.data || [];
                    if (groupContacts.length > 0) {
                        setPreviewContact(groupContacts[0]);
                        return;
                    }
                } catch (error) {
                    console.error('Failed to fetch group contact for preview:', error);
                }
            }

            // Fallback: Default placeholder if nothing else is available
            if (selectedContacts.length === 0 && selectedGroups.length === 0) {
                setPreviewContact({ first_name: 'John', last_name: 'Doe', phone_number: '233241234567' });
            }
        };
        updatePreview();
    }, [selectedContacts, selectedGroups, contacts]);

    // Edit Mode Support
    const editId = new URLSearchParams(window.location.hash.split('?')[1]).get('edit');
    const isEditMode = !!editId;

    useEffect(() => {
        if (isEditMode) {
            fetchCampaignToEdit();
        }
    }, [editId]);

    const fetchCampaignToEdit = async () => {
        try {
            const response = await apiClient.get(`/campaigns/${editId}`);
            const camp = response.data;
            setFormData({
                name: camp.name,
                sender: camp.sender,
                template: camp.template,
                scheduled_at: camp.scheduled_at ? camp.scheduled_at.split('Z')[0] : '',
            });
            // Note: Recipient selection editing is more complex, 
            // for now we focus on name/template/schedule.
        } catch (error) {
            showToast('Failed to load campaign for editing', 'error');
        }
    };

    useEffect(() => {
        if (step === 2 || showContactModal || showGroupModal) {
            fetchContacts();
            fetchGroups();
        }
    }, [step, showContactModal, showGroupModal]);

    const fetchGroups = async () => {
        try {
            const response = await apiClient.get('/groups');
            setGroups(response.data || []);
        } catch (error) {
            console.error('Failed to fetch groups:', error);
        }
    };

    const fetchContacts = async () => {
        try {
            const response = await apiClient.get('/contacts');
            setContacts(response.data.items || []);
        } catch (error) {
            console.error('Failed to fetch contacts:', error);
        }
    };

    const handleAddManualContact = async () => {
        if (!newContact.phone_number) return;
        setIsSavingContact(true);
        try {
            const response = await apiClient.post('/contacts', newContact);
            const savedContact = response.data;
            setContacts([...contacts, savedContact]);
            setSelectedContacts([...selectedContacts, savedContact.id]);
            setNewContact({ first_name: '', last_name: '', phone_number: '' });
            // Stay on manual mode so user can add more
        } catch (error) {
            showToast('Failed to save contact: ' + (error.response?.data?.detail || 'Unknown error'), 'error');
        } finally {
            setIsSavingContact(false);
        }
    };

    const handleSelectAll = (checked) => {
        if (checked) {
            setSelectedContacts(filteredContacts.map(c => c.id));
        } else {
            setSelectedContacts([]);
        }
    };

    const filteredContacts = contacts.filter(c =>
        (c.first_name + ' ' + c.last_name).toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone_number.includes(searchQuery)
    );

    const selectedContactObjects = contacts.filter(c => selectedContacts.includes(c.id));

    const handleSubmit = async (shouldBroadcast = false) => {
        setLoading(true);
        try {
            const payload = {
                ...formData,
                scheduled_at: formData.scheduled_at || null,
                contact_ids: selectedContacts,
                group_ids: selectedGroups,
            };
            
            let campaignId = editId;
            if (isEditMode) {
                await apiClient.put(`/campaigns/${editId}`, payload);
                showToast('Campaign details updated', 'success');
            } else {
                const response = await apiClient.post('/campaigns', payload);
                campaignId = response.data.id;
                showToast('Campaign record saved', 'success');
            }

            if (shouldBroadcast) {
                showToast('Starting broadcast...', 'info');
                await apiClient.post(`/campaigns/${campaignId}/broadcast`);
                showToast('Broadcast initiated successfully!', 'success');
            }

            window.location.href = '#/campaigns';
        } catch (error) {
            let errorMsg = 'Unknown error';
            if (error.response?.data?.detail) {
                if (Array.isArray(error.response.data.detail)) {
                    errorMsg = error.response.data.detail[0].msg;
                } else {
                    errorMsg = error.response.data.detail;
                }
            }
            showToast(`Action failed: ` + errorMsg, 'error');
        } finally {
            setLoading(false);
        }
    };

    return html`
        <div className="max-w-3xl mx-auto space-y-6 fade-in">

            <div className="flex gap-2">
                ${[1, 2, 3, 4].map((s) => html`
                    <div
                        key=${s}
                        className="flex-1 h-2 rounded-full ${s <= step ? 'bg-primary-600' : 'bg-gray-200'}"
                    />
                `)}
            </div>

            <${Card} className="p-6">
                ${step === 1 && html`
                    <div className="space-y-4">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold">Campaign Details</h2>
                            <a href="#/sender-ids" className="text-xs font-bold text-primary-600 hover:underline">Request New ID</a>
                        </div>
                        <${Input}
                            label="Campaign Name"
                            value=${formData.name}
                            onChange=${(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Summer Sale 2024"
                            required
                        />
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700 dark:text-midnight-300">Sender ID</label>
                            <${SenderIDSelect} 
                                value=${formData.sender} 
                                onChange=${(val) => setFormData({ ...formData, sender: val })} 
                            />
                        </div>
                        <${Button} size="md" onClick=${() => setStep(2)} className="w-full py-3" disabled=${!formData.sender}>
                            Next
                        </${Button}>
                    </div>
                `}

                ${step === 2 && html`
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold">Step 2: Add Recipients</h2>
                            <div className="flex gap-2">
                                <${Button} variant=${selectedGroups.length > 0 ? 'primary' : 'outline'} size="sm" onClick=${() => setShowGroupModal(true)}>
                                    <${Icon} name="tag" size=${14} />
                                    <span className="hidden sm:inline ml-1.5">Segments</span>
                                </${Button}>
                                <${Button} variant=${selectedContacts.length > 0 ? 'primary' : 'outline'} size="sm" onClick=${() => setShowContactModal(true)}>
                                    <${Icon} name="users" size=${14} />
                                    <span className="hidden sm:inline ml-1.5">Contacts</span>
                                </${Button}>
                                <${Button} 
                                    variant=${recipientMode === 'manual' ? 'primary' : 'outline'} 
                                    size="sm" 
                                    onClick=${() => setRecipientMode(recipientMode === 'manual' ? 'none' : 'manual')}
                                >
                                    <${Icon} name="plus" size=${14} />
                                    <span className="hidden sm:inline ml-1.5">Manual</span>
                                </${Button}>
                            </div>
                        </div>

                        ${recipientMode === 'manual' && html`
                            <div className="p-5 bg-primary-50/50 dark:bg-midnight-900/50 rounded-2xl border border-primary-100 dark:border-midnight-800 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="grid grid-cols-2 gap-3">
                                    <${Input}
                                        label="First Name"
                                        value=${newContact.first_name}
                                        onChange=${(e) => setNewContact({ ...newContact, first_name: e.target.value })}
                                        placeholder="John"
                                    />
                                    <${Input}
                                        label="Last Name"
                                        value=${newContact.last_name}
                                        onChange=${(e) => setNewContact({ ...newContact, last_name: e.target.value })}
                                        placeholder="Doe"
                                    />
                                </div>
                                <${Input}
                                    label="Phone Number"
                                    value=${newContact.phone_number}
                                    onChange=${(e) => setNewContact({ ...newContact, phone_number: e.target.value })}
                                    placeholder="233241234567"
                                    required
                                />
                                <${Button}
                                    onClick=${handleAddManualContact}
                                    className="w-full"
                                    disabled=${!newContact.phone_number || isSavingContact}
                                >
                                    ${isSavingContact ? 'Saving...' : 'Add & Select Contact'}
                                </${Button}>
                            </div>
                        `}

                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black text-gray-400 dark:text-midnight-500 uppercase tracking-widest px-1">Selected Segments (${selectedGroups.length})</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                ${selectedGroups.length > 0 ? groups.filter(g => selectedGroups.includes(g.id)).map(group => html`
                                    <div key=${group.id} className="flex items-center justify-between p-3 bg-primary-500/5 border border-primary-500/10 rounded-2xl group transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-primary-500/10 text-primary-600 flex items-center justify-center">
                                                <${Icon} name="tag" size=${14} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-900 dark:text-white">${group.name}</p>
                                                <p className="text-[10px] text-primary-600 font-bold">${group.contact_count} contacts</p>
                                            </div>
                                        </div>
                                        <button onClick=${() => setSelectedGroups(selectedGroups.filter(id => id !== group.id))} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                                            <${Icon} name="x" size=${16} />
                                        </button>
                                    </div>
                                `) : html`
                                    <div className="col-span-full py-6 text-center border-2 border-dashed border-gray-100 dark:border-midnight-800 rounded-2xl">
                                        <p className="text-xs text-gray-400 italic">No segments selected yet</p>
                                    </div>
                                `}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black text-gray-400 dark:text-midnight-500 uppercase tracking-widest px-1">
                                Individual Recipients (${selectedContacts.length})
                            </h3>
                            
                            <div className="max-h-64 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                ${selectedContactObjects.length > 0 ? selectedContactObjects.map((contact) => html`
                                    <div key=${contact.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-midnight-900/50 border border-gray-100 dark:border-midnight-800 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 flex items-center justify-center font-bold text-xs uppercase">
                                                ${(contact.first_name?.[0] || contact.phone_number?.[0] || '?').toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-semibold text-gray-900 dark:text-white text-sm">
                                                        ${contact.first_name || ''} ${contact.last_name || ''}
                                                    </p>
                                                </div>
                                                <p className="text-xs text-gray-500 dark:text-midnight-400 font-medium">${contact.phone_number}</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick=${() => setSelectedContacts(selectedContacts.filter(id => id !== contact.id))}
                                            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                                        >
                                            <${Icon} name="x" size=${16} />
                                        </button>
                                    </div>
                                `) : html`
                                    <div className="text-center py-6 border-2 border-dashed border-gray-50 dark:border-midnight-900 rounded-2xl">
                                        <p className="text-xs text-gray-400 italic font-medium">No individual contacts selected</p>
                                    </div>
                                `}
                            </div>
                        </div>

                        <div className="pt-4 flex gap-3 border-t border-gray-100 dark:border-midnight-800">
                            <${Button} variant="secondary" size="md" onClick=${() => setStep(1)} className="flex-1 py-3 px-4">
                                Back
                            </${Button}>
                            <${Button} size="md" onClick=${() => setStep(3)} className="flex-1 py-3 px-4" disabled=${selectedContacts.length === 0 && selectedGroups.length === 0}>
                                Next
                            </${Button}>
                        </div>
                    </div>
                `}

                ${step === 3 && html`
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold mb-4">Message Content</h2>
                        <label className="block text-sm font-medium text-gray-700 dark:text-midnight-300 mb-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span>Message Content</span>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Supports {name}, {first_name}</span>
                            </div>
                            <${TemplateSelector} onSelect=${(content) => setFormData({ ...formData, template: content })} />
                        </label>
                            
                        <div className="flex flex-wrap gap-2 mb-3">
                            ${['name', 'first_name', 'last_name'].map(tag => html`
                                <button
                                    key=${tag}
                                    type="button"
                                    onClick=${() => {
                                        const textarea = document.getElementById('template-editor');
                                        const start = textarea.selectionStart;
                                        const end = textarea.selectionEnd;
                                        const text = formData.template;
                                        const newText = text.substring(0, start) + `{${tag}}` + text.substring(end);
                                        setFormData({ ...formData, template: newText });
                                        setTimeout(() => {
                                            textarea.focus();
                                            textarea.setSelectionRange(start + tag.length + 2, start + tag.length + 2);
                                        }, 0);
                                    }}
                                    className="px-3 py-1.5 bg-gray-100 dark:bg-midnight-900 hover:bg-primary-50 dark:hover:bg-primary-900/20 border border-gray-200 dark:border-midnight-800 rounded-full text-[10px] font-black text-gray-600 dark:text-midnight-400 hover:text-primary-600 dark:hover:text-primary-400 uppercase tracking-wider transition-all flex items-center gap-1.5"
                                >
                                    <${Icon} name="plus" size=${10} />
                                    ${tag.replace('_', ' ')}
                                </button>
                            `)}
                        </div>

                        <textarea
                            id="template-editor"
                            value=${formData.template}
                            onChange=${(e) => setFormData({ ...formData, template: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-midnight-900/50 border border-gray-200 dark:border-midnight-800 rounded-2xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all text-sm lg:text-base text-gray-900 dark:text-white"
                            rows=${6}
                            placeholder="Hi {name}, welcome to NEXRA!"
                            required
                        />
                        <p className="text-sm text-gray-500 mt-1">
                            ${formData.template.length} / 160 characters
                        </p>
                        
                        <div className="flex gap-3 pt-4">
                            <${Button} variant="secondary" size="md" onClick=${() => setStep(2)} className="flex-1 py-3">
                                Back
                            </${Button}>
                            <${Button} size="md" onClick=${() => setStep(4)} className="flex-1 py-3" disabled=${!formData.template}>
                                Next
                            </${Button}>
                        </div>
                    </div>
                `}

                ${step === 4 && html`
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold mb-4">Schedule</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="flex items-center gap-2 mb-4">
                                        <input
                                            type="radio"
                                            name="schedule"
                                            checked=${!formData.scheduled_at}
                                            onChange=${() => setFormData({ ...formData, scheduled_at: '' })}
                                        />
                                        <span>Send Now</span>
                                    </label>
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            name="schedule"
                                            checked=${!!formData.scheduled_at}
                                            onChange=${() => setFormData({ ...formData, scheduled_at: new Date().toISOString().slice(0, 16) })}
                                        />
                                        <span>Schedule for Later</span>
                                    </label>
                                </div>

                                ${formData.scheduled_at && html`
                                    <${Input}
                                        type="datetime-local"
                                        value=${formData.scheduled_at}
                                        onChange=${(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                                    />
                                `}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-[10px] font-black text-gray-400 dark:text-midnight-500 uppercase tracking-[0.2em] px-1">Message Preview</h3>
                            <div className="relative p-6 bg-gray-100 dark:bg-midnight-950 rounded-[2.5rem] border border-gray-200 dark:border-midnight-800 shadow-inner">
                                <div className="max-w-[280px] mx-auto space-y-4">
                                    <div className="flex items-center gap-3 px-2">
                                        <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-midnight-800 animate-pulse"></div>
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-900 dark:text-white">${formData.sender || 'Sender ID'}</p>
                                            <p className="text-[8px] text-gray-500 tracking-widest uppercase">Text Message</p>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-white dark:bg-midnight-900 p-4 rounded-2xl rounded-tl-none border border-gray-200 dark:border-midnight-800 shadow-sm relative mr-6">
                                        <p className="text-sm text-gray-800 dark:text-midnight-200 leading-relaxed whitespace-pre-wrap">
                                            ${(() => {
                                                if (!formData.template) return html`<span className="italic text-gray-400">Enter message content to see preview...</span>`;
                                                
                                                const fName = (previewContact.first_name || "").trim();
                                                const lName = (previewContact.last_name || "").trim();
                                                const fullName = `${fName} ${lName}`.trim();
                                                const displayName = fullName || (fName || previewContact.phone_number);

                                                return formData.template
                                                    .replace(/{name}/g, displayName)
                                                    .replace(/{first_name}/g, fName)
                                                    .replace(/{last_name}/g, lName)
                                                    .replace(/{phone_number}/g, previewContact.phone_number);
                                            })()}
                                        </p>
                                        <div className="flex justify-end mt-2">
                                            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-primary-50/30 dark:bg-primary-900/10 p-4 rounded-2xl border border-primary-100/50 dark:border-primary-800/20">
                            <div className="flex items-center justify-between mb-3 pb-2 border-b border-primary-100/50 dark:border-primary-800/20">
                                <h3 className="font-bold text-gray-900 dark:text-white uppercase text-[10px] tracking-widest">Broadcast Summary</h3>
                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                    </span>
                                    <span className="text-[10px] font-bold">Smart-Routed Enabled</span>
                                </div>
                            </div>
                            <ul className="text-sm text-gray-600 dark:text-midnight-400 space-y-2">
                                <li className="flex justify-between">
                                    <span>Campaign:</span>
                                    <span className="font-semibold text-gray-900 dark:text-midnight-200">${formData.name}</span>
                                </li>
                                <li className="flex justify-between text-xs lg:text-sm">
                                    <span>Recipients:</span>
                                    <div className="flex items-center gap-1">
                                        <span className="font-semibold text-gray-900 dark:text-midnight-200">
                                            ${selectedContacts.length + (groups.filter(g => selectedGroups.includes(g.id)).reduce((acc, g) => acc + g.contact_count, 0))}
                                        </span>
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-midnight-800 border border-gray-200 dark:border-midnight-700 font-bold">Deduplicated</span>
                                    </div>
                                </li>
                                <li className="flex justify-between">
                                    <span>Segments:</span>
                                    <span className="font-semibold text-gray-900 dark:text-midnight-200">${selectedGroups.length}</span>
                                </li>
                                <li className="flex justify-between">
                                    <span>Sender ID:</span>
                                    <span className="font-semibold text-gray-900 dark:text-midnight-200">${formData.sender}</span>
                                </li>
                            </ul>
                        </div>

                        <div className="flex gap-3">
                            <${Button} variant="secondary" size="md" onClick=${() => setStep(3)} className="flex-1">
                                Back
                            </${Button}>
                            <${Button} 
                                size="md"
                                onClick=${() => handleSubmit(false)} 
                                className="flex-1 shadow-lg shadow-primary-200 py-3" 
                                disabled=${loading}
                            >
                                ${loading ? 'Saving...' : 'Save Campaign'}
                            </${Button}>
                        </div>
                    </div>
                `}
            </${Card}>

            <${Modal} isOpen=${showContactModal} onClose=${() => setShowContactModal(false)} title="Select Contacts">
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <${Icon} name="search" size=${18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search contacts..."
                                value=${searchQuery}
                                onChange=${(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                            />
                        </div>
                        <button onClick=${fetchContacts} className="p-2 text-gray-400 hover:text-primary-600 transition-colors">
                            <${Icon} name="refresh-cw" size=${20} />
                        </button>
                    </div>

                    <div className="flex items-center justify-between px-2 text-sm text-gray-500">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked=${filteredContacts.length > 0 && selectedContacts.length === filteredContacts.length}
                                onChange=${(e) => handleSelectAll(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            Select All
                        </label>
                        <span>${selectedContacts.length} selected</span>
                    </div>

                    <div className="max-h-96 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        ${filteredContacts.length > 0 ? filteredContacts.map((contact) => html`
                            <label key=${contact.id} className="flex items-center gap-3 p-3 bg-gray-50 border border-transparent rounded-xl cursor-pointer hover:bg-white hover:border-primary-100 hover:shadow-sm transition-all group">
                                <input
                                    type="checkbox"
                                    checked=${selectedContacts.includes(contact.id)}
                                    onChange=${(e) => {
            if (e.target.checked) {
                setSelectedContacts([...selectedContacts, contact.id]);
            } else {
                setSelectedContacts(selectedContacts.filter(id => id !== contact.id));
            }
        }}
                                    className="w-5 h-5 rounded-md border-gray-300 text-primary-600 focus:ring-primary-500"
                                />
                                <div className="flex-1">
                                    <p className="font-semibold text-gray-900 group-hover:text-primary-700 transition-colors text-sm">
                                        ${contact.first_name || ''} ${contact.last_name || ''}
                                    </p>
                                    <p className="text-xs text-gray-500 font-medium">${contact.phone_number}</p>
                                </div>
                            </label>
                        `) : html`
                            <div className="text-center py-12">
                                <${Icon} name="users" size=${48} className="mx-auto text-gray-200 mb-3" />
                                <p className="text-gray-400">No contacts found</p>
                            </div>
                        `}
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-gray-100">
                        <${Button} className="w-full" onClick=${() => setShowContactModal(false)}>
                            Done (${selectedContacts.length} selected)
                        </${Button}>
                    </div>
                </div>
            </${Modal}>

            <${Modal} isOpen=${showGroupModal} onClose=${() => setShowGroupModal(false)} title="Select Segments">
                <div className="space-y-4">
                    <div className="max-h-96 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        ${groups.length > 0 ? groups.map((group) => html`
                            <label key=${group.id} className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-midnight-900/50 border border-transparent dark:border-midnight-800 rounded-2xl cursor-pointer hover:bg-white dark:hover:bg-midnight-800 hover:border-primary-100 dark:hover:border-primary-900/40 hover:shadow-lg hover:shadow-primary-600/5 transition-all group">
                                <div className="relative flex items-center justify-center">
                                    <input
                                        type="checkbox"
                                        checked=${selectedGroups.includes(group.id)}
                                        onChange=${(e) => {
                                            if (e.target.checked) {
                                                setSelectedGroups([...selectedGroups, group.id]);
                                            } else {
                                                setSelectedGroups(selectedGroups.filter(id => id !== group.id));
                                            }
                                        }}
                                        className="w-5 h-5 rounded-md border-gray-300 dark:border-midnight-700 text-primary-600 focus:ring-primary-500 bg-white dark:bg-midnight-900"
                                    />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                        <p className="font-bold text-gray-900 dark:text-white group-hover:text-primary-600 transition-colors text-sm">${group.name}</p>
                                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
                                            ${group.contact_count} contacts
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-midnight-400 mt-0.5 line-clamp-1">${group.description || 'No description'}</p>
                                </div>
                            </label>
                        `) : html`
                            <div className="text-center py-12">
                                <${Icon} name="tag" size=${48} className="mx-auto text-gray-200 dark:text-midnight-800 mb-3" />
                                <p className="text-gray-400 dark:text-midnight-600 font-medium">No segments found</p>
                            </div>
                        `}
                    </div>
                    <${Button} variant="primary" className="w-full rounded-2xl py-3.5 shadow-glow font-bold" onClick=${() => setShowGroupModal(false)}>
                        Confirm Selection (${selectedGroups.length})
                    </${Button}>
                </div>
            </${Modal}>
        </div>
    `;
};

const GroupsSidebar = ({ selectedGroupId, onOpenSegment, onRefresh }) => {
    const { showToast } = useToast();
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newGroup, setNewGroup] = useState({ name: '', description: '' });

    useEffect(() => {
        fetchGroups();
    }, []);

    const fetchGroups = async () => {
        try {
            const res = await apiClient.get('/groups');
            setGroups(res.data);
        } catch (error) {
            console.error('Failed to fetch groups:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateGroup = async (e) => {
        e.preventDefault();
        try {
            const res = await apiClient.post('/groups', newGroup);
            showToast('Segment created!', 'success');
            setShowCreateModal(false);
            setNewGroup({ name: '', description: '' });
            fetchGroups();
            if (onRefresh) onRefresh();
            onOpenSegment(res.data);
        } catch (error) {
            showToast('Failed to create segment', 'error');
        }
    };

    const handleDeleteGroup = async (e, id) => {
        e.stopPropagation();
        if (!confirm('Are you sure? Contacts will not be deleted.')) return;
        try {
            await apiClient.delete(`/groups/${id}`);
            showToast('Segment deleted', 'success');
            if (selectedGroupId === id) onOpenSegment(null);
            fetchGroups();
            if (onRefresh) onRefresh();
        } catch (error) {
            showToast('Failed to delete segment', 'error');
        }
    };

    return html`
        <div className="w-full lg:w-64 flex-shrink-0 space-y-4">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-[10px] font-black text-gray-400 dark:text-midnight-500 uppercase tracking-widest px-2">Segments</h3>
                <button onClick=${() => setShowCreateModal(true)} className="p-1.5 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/10 rounded-lg transition-colors">
                    <${Icon} name="plus" size=${14} />
                </button>
            </div>

            <div className="space-y-1">
                <button
                    onClick=${() => onOpenSegment(null)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${!selectedGroupId ? 'bg-primary-600 text-white shadow-glow' : 'text-gray-600 dark:text-midnight-400 hover:bg-gray-100 dark:hover:bg-midnight-900'}"
                >
                    <div className="flex items-center gap-3">
                        <${Icon} name="users" size=${16} />
                        <span className="text-sm font-bold">All Contacts</span>
                    </div>
                </button>

                ${loading ? html`
                    <div className="space-y-2 mt-4 px-2">
                        ${[1, 2, 3].map(i => html`<div key=${i} className="h-8 bg-gray-50 dark:bg-midnight-900 rounded-lg animate-pulse" />`)}
                    </div>
                ` : groups.map(group => html`
                    <button
                        key=${group.id}
                        onClick=${() => onOpenSegment(group)}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all group ${selectedGroupId === group.id ? 'bg-primary-600 text-white shadow-glow' : 'text-gray-600 dark:text-midnight-400 hover:bg-gray-100 dark:hover:bg-midnight-900'}"
                    >
                        <div className="flex items-center gap-3 overflow-hidden">
                            <${Icon} name="tag" size=${14} className="${selectedGroupId === group.id ? 'text-primary-200' : 'text-gray-400'}" />
                            <span className="text-sm font-bold truncate">${group.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black opacity-60">${group.contact_count}</span>
                            <span onClick=${(e) => handleDeleteGroup(e, group.id)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all">
                                <${Icon} name="x" size=${12} />
                            </span>
                        </div>
                    </button>
                `)}
            </div>

            <${Modal} isOpen=${showCreateModal} onClose=${() => setShowCreateModal(false)} title="New Segment">
                <form onSubmit=${handleCreateGroup} className="space-y-4 pt-4">
                    <${Input}
                        label="Segment Name"
                        placeholder="e.g. VIP Customers"
                        value=${newGroup.name}
                        onChange=${(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                        required
                    />
                    <${Input}
                        label="Description (Optional)"
                        placeholder="Purpose of this group..."
                        value=${newGroup.description}
                        onChange=${(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                    />
                    <div className="flex gap-3 pt-4">
                        <${Button} type="button" variant="outline" className="flex-1 rounded-2xl" onClick=${() => setShowCreateModal(false)}>Cancel</${Button}>
                        <${Button} type="submit" variant="primary" className="flex-1 rounded-2xl shadow-glow">Create</${Button}>
                    </div>
                </form>
            </${Modal}>
        </div>
    `;
};

const SegmentDetailView = ({ segment, onBack, onSegmentUpdated }) => {
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState('members');
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Add Manually State
    const [newContact, setNewContact] = useState({ first_name: '', last_name: '', phone_number: '' });
    const [isSavingManual, setIsSavingManual] = useState(false);

    // Upload CSV State
    const [uploadFile, setUploadFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    // From Existing State
    const [allContacts, setAllContacts] = useState([]);
    const [allSegments, setAllSegments] = useState([]);
    const [searchExisting, setSearchExisting] = useState('');
    const [selectedExisting, setSelectedExisting] = useState(new Set());
    const [isBulkAdding, setIsBulkAdding] = useState(false);

    useEffect(() => {
        if (segment) {
            fetchMembers();
            if (activeTab === 'existing') {
                fetchAllContactsAndSegments();
            }
        }
    }, [segment, activeTab]);

    const fetchMembers = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get(`/groups/${segment.id}/contacts`);
            setMembers(res.data);
        } catch (err) {
            showToast('Failed to load members', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchAllContactsAndSegments = async () => {
        try {
            const [contactsRes, groupsRes] = await Promise.all([
                apiClient.get('/contacts'),
                apiClient.get('/groups')
            ]);
            setAllContacts(contactsRes.data.items || []);
            setAllSegments(groupsRes.data.filter(g => g.id !== segment.id));
        } catch (err) {
            console.error(err);
        }
    };

    const handleRemoveMember = async (contactId) => {
        try {
            await apiClient.delete(`/groups/${segment.id}/contacts/${contactId}`);
            showToast('Member removed', 'success');
            fetchMembers();
            onSegmentUpdated();
        } catch (err) {
            showToast('Failed to remove member', 'error');
        }
    };

    const handleManualAdd = async (e) => {
        e.preventDefault();
        setIsSavingManual(true);
        try {
            // Create contact
            const res = await apiClient.post('/contacts', newContact);
            const createdContact = res.data;
            // Add to group
            await apiClient.post(`/groups/${segment.id}/contacts/${createdContact.id}`);
            showToast('Contact created and added to segment!', 'success');
            setNewContact({ first_name: '', last_name: '', phone_number: '' });
            fetchMembers();
            onSegmentUpdated();
            setActiveTab('members');
        } catch (err) {
            showToast('Failed to add contact', 'error');
        } finally {
            setIsSavingManual(false);
        }
    };

    const handleDeleteSegment = async () => {
        if (!confirm('Are you sure you want to delete this segment? Contacts inside will not be deleted.')) return;
        try {
            await apiClient.delete(`/groups/${segment.id}`);
            showToast('Segment deleted', 'success');
            onSegmentUpdated();
            onBack();
        } catch (err) {
            showToast('Failed to delete segment', 'error');
        }
    };

    const handleUpload = async () => {
        if (!uploadFile) return;
        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', uploadFile);
        formData.append('group_id', segment.id);
        try {
            const response = await apiClient.post('/contacts/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const { created, group_added, skipped } = response.data;
            showToast(`Upload complete! ${group_added} added to segment (${created} new, ${skipped} skipped).`, 'success');
            setUploadFile(null);
            fetchMembers();
            onSegmentUpdated();
            setActiveTab('members');
        } catch (error) {
            showToast('Upload failed', 'error');
        } finally {
            setIsUploading(false);
        }
    };

    const handleBulkAddExisting = async () => {
        if (selectedExisting.size === 0) return;
        setIsBulkAdding(true);
        try {
            await apiClient.post(`/groups/${segment.id}/contacts/bulk`, {
                contact_ids: Array.from(selectedExisting)
            });
            showToast(`Added ${selectedExisting.size} contacts to segment`, 'success');
            setSelectedExisting(new Set());
            fetchMembers();
            onSegmentUpdated();
            setActiveTab('members');
        } catch (err) {
            showToast('Failed to bulk add contacts', 'error');
        } finally {
            setIsBulkAdding(false);
        }
    };

    const handleSelectSegmentContacts = async (sourceSegment) => {
        if (!confirm(`Add all ${sourceSegment.contact_count} contacts from "${sourceSegment.name}"?`)) return;
        try {
            // Fetch contacts of the selected segment to get their IDs
            const res = await apiClient.get(`/groups/${sourceSegment.id}/contacts`);
            const ids = res.data.map(c => c.id);
            if (ids.length === 0) return showToast('That segment is empty.', 'info');
            
            await apiClient.post(`/groups/${segment.id}/contacts/bulk`, {
                contact_ids: ids
            });
            showToast(`Added contacts from ${sourceSegment.name}`, 'success');
            fetchMembers();
            onSegmentUpdated();
            setActiveTab('members');
        } catch (err) {
            showToast('Failed to add from segment', 'error');
        }
    };

    const toggleExistingContact = (id) => {
        setSelectedExisting(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const existingMembersIds = new Set(members.map(m => m.id));
    const availableContacts = allContacts.filter(c => !existingMembersIds.has(c.id));
    const filteredAvailable = availableContacts.filter(c => 
        (c.first_name + ' ' + c.last_name).toLowerCase().includes(searchExisting.toLowerCase()) || 
        c.phone_number.includes(searchExisting)
    );

    return html`
        <div className="space-y-6 fade-in h-full flex flex-col">
            <div className="flex items-center gap-4 border-b border-gray-100 dark:border-midnight-800 pb-6">
                <button onClick=${onBack} className="p-2.5 bg-gray-50 dark:bg-midnight-900 hover:bg-gray-100 dark:hover:bg-midnight-800 rounded-xl transition-colors self-start lg:self-center">
                    <${Icon} name="arrow-left" size=${18} className="text-gray-600 dark:text-gray-300" />
                </button>
                <div className="flex-1">
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                        <${Icon} name="tag" size=${20} className="text-primary-500" />
                        ${segment.name}
                    </h1>
                    <p className="text-xs font-bold text-gray-400 dark:text-midnight-500 uppercase tracking-widest mt-1">
                        ${members.length} member${members.length !== 1 ? 's' : ''} ${segment.description ? '· ' + segment.description : ''}
                    </p>
                </div>
                <button 
                    onClick=${handleDeleteSegment}
                    className="p-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors self-start lg:self-center"
                    title="Delete Segment"
                >
                    <${Icon} name="trash-2" size=${20} />
                </button>
            </div>


            <div className="flex bg-gray-100 dark:bg-midnight-900 p-1 rounded-2xl w-full max-w-2xl mx-auto shadow-inner overflow-x-auto">
                <button 
                    onClick=${() => setActiveTab('members')}
                    className="flex-1 min-w-[100px] py-2.5 px-4 rounded-xl text-sm font-bold transition-all ${activeTab === 'members' ? 'bg-white dark:bg-midnight-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}"
                >
                    Members
                </button>
                <div className="w-px bg-gray-300 dark:bg-midnight-800 my-2 mx-1 hidden sm:block"></div>
                ${['existing', 'manual', 'upload'].map(tab => html`
                    <button 
                        key=${tab}
                        onClick=${() => setActiveTab(tab)}
                        className="flex-1 min-w-[100px] py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab === tab ? 'bg-primary-600 text-white shadow-glow' : 'text-gray-500 hover:bg-gray-200/50 dark:hover:bg-midnight-800/50 hover:text-gray-700 dark:hover:text-gray-300'}"
                    >
                        <${Icon} name="plus" size=${12} className=${activeTab === tab ? 'text-white' : ''} />
                        ${tab === 'existing' ? 'Existing' : tab === 'manual' ? 'Manual' : 'Upload'}
                    </button>
                `)}
            </div>


            <div className="flex-1 min-h-[400px]">
                ${activeTab === 'members' && html`

                    <div className="flex flex-wrap gap-2 mb-5">
                        <button 
                            onClick=${() => setActiveTab('upload')} 
                            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-bold shadow-glow hover:bg-primary-500 transition-colors"
                        >
                            <${Icon} name="upload-cloud" size=${15} /> Upload CSV
                        </button>
                        <button 
                            onClick=${() => setActiveTab('manual')} 
                            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-midnight-800 text-gray-900 dark:text-white border border-gray-200 dark:border-midnight-700 rounded-xl text-sm font-bold hover:bg-gray-50 dark:hover:bg-midnight-700 transition-colors"
                        >
                            <${Icon} name="user-plus" size=${15} /> Add Manually
                        </button>
                        <button 
                            onClick=${() => setActiveTab('existing')} 
                            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-midnight-800 text-gray-900 dark:text-white border border-gray-200 dark:border-midnight-700 rounded-xl text-sm font-bold hover:bg-gray-50 dark:hover:bg-midnight-700 transition-colors"
                        >
                            <${Icon} name="users" size=${15} /> From Existing
                        </button>
                    </div>

                    ${loading ? html`
                        <div className="flex justify-center py-12"><${Icon} name="loader-2" size=${32} className="animate-spin text-primary-500" /></div>
                    ` : members.length === 0 ? html`
                        <div className="text-center py-16 bg-gray-50 dark:bg-midnight-900/50 rounded-3xl border border-dashed border-gray-200 dark:border-midnight-800">
                            <${Icon} name="users" size=${48} className="mx-auto mb-4 text-gray-300 dark:text-midnight-600" />
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Segment is empty</h3>
                            <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">Use the buttons above to start adding contacts to this segment.</p>
                        </div>
                    ` : html`
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            ${members.map(member => html`
                                <${Card} key=${member.id} className="p-4 flex items-center justify-between group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-midnight-900 flex items-center justify-center font-black text-gray-600 dark:text-gray-300">
                                            ${member.first_name?.[0] || member.phone_number?.[0]}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900 dark:text-white leading-tight">
                                                ${member.first_name} ${member.last_name}
                                            </p>
                                            <p className="text-xs text-gray-500">${member.phone_number}</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick=${() => handleRemoveMember(member.id)}
                                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                                        title="Remove from segment"
                                    >
                                        <${Icon} name="user-minus" size=${16} />
                                    </button>
                                </${Card}>
                            `)}
                        </div>
                    `}
                `}

                ${activeTab === 'manual' && html`
                    <div className="max-w-md mx-auto fade-in">
                        <${Card} className="p-6">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                <${Icon} name="user-plus" size=${20} className="text-primary-500" />
                                Add Contact via Form
                            </h3>
                            <form onSubmit=${handleManualAdd} className="space-y-4">
                                <${Input} label="First Name" placeholder="John" value=${newContact.first_name} onChange=${(e) => setNewContact({ ...newContact, first_name: e.target.value })} />
                                <${Input} label="Last Name" placeholder="Doe" value=${newContact.last_name} onChange=${(e) => setNewContact({ ...newContact, last_name: e.target.value })} />
                                <${Input} label="Phone Number" placeholder="233241234567" required value=${newContact.phone_number} onChange=${(e) => setNewContact({ ...newContact, phone_number: e.target.value })} />
                                <${Button} type="submit" variant="primary" className="w-full rounded-2xl shadow-glow py-3" disabled=${isSavingManual}>
                                    ${isSavingManual ? 'Saving & Adding...' : 'Save and Add to Segment'}
                                </${Button}>
                            </form>
                        </${Card}>
                    </div>
                `}

                ${activeTab === 'upload' && html`
                    <div className="max-w-md mx-auto fade-in">
                        <${Card} className="p-6 text-center">
                            <div className="w-16 h-16 rounded-full bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center mx-auto mb-4">
                                <${Icon} name="upload-cloud" size=${28} className="text-primary-600" />
                            </div>
                            <h3 className="font-bold text-lg mb-2">Upload CSV</h3>
                            <p className="text-sm text-gray-500 mb-6">File must contain headers: <code className="bg-gray-100 dark:bg-midnight-900 px-1 py-0.5 rounded">first_name, last_name, phone_number</code></p>
                            
                            <input
                                type="file"
                                accept=".csv"
                                onChange=${(e) => setUploadFile(e.target.files[0])}
                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 mb-6 mx-auto cursor-pointer"
                            />
                            
                            <${Button} onClick=${handleUpload} disabled=${!uploadFile || isUploading} variant="primary" className="w-full rounded-2xl shadow-glow py-3">
                                ${isUploading ? 'Uploading & Processing...' : 'Upload and Add to Segment'}
                            </${Button}>
                        </${Card}>
                    </div>
                `}

                ${activeTab === 'existing' && html`
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 fade-in h-auto lg:h-[600px]">
                        <div className="flex flex-col border border-gray-200 dark:border-midnight-800 rounded-3xl overflow-hidden bg-white dark:bg-midnight-950">
                            <div className="p-4 border-b border-gray-100 dark:border-midnight-800 bg-gray-50/50 dark:bg-midnight-900/20">
                                <h3 className="font-bold mb-3 flex items-center justify-between">
                                    <span>Pick Contacts</span>
                                    <span className="text-xs font-black bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 px-2 py-1 rounded-md">
                                        ${selectedExisting.size} selected
                                    </span>
                                </h3>
                                <div className="relative">
                                    <${Icon} name="search" size=${16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search ${availableContacts.length} contacts..."
                                        value=${searchExisting}
                                        onChange=${e => setSearchExisting(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 bg-white dark:bg-midnight-900 border border-gray-200 dark:border-midnight-800 rounded-xl focus:ring-2 focus:ring-primary-500/20 outline-none text-sm transition-all"
                                    />
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 space-y-1 relative" style=${{ minHeight: '300px' }}>
                                ${filteredAvailable.length === 0 ? html`
                                    <p className="text-center text-sm text-gray-500 py-10">No available contacts found.</p>
                                ` : filteredAvailable.map(c => html`
                                    <button 
                                        key=${c.id}
                                        onClick=${() => toggleExistingContact(c.id)}
                                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-midnight-900 transition-colors text-left"
                                    >
                                        <div className="w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${selectedExisting.has(c.id) ? 'bg-primary-600 border-primary-600' : 'border-gray-300 dark:border-midnight-700'}">
                                            ${selectedExisting.has(c.id) && html`<${Icon} name="check" size=${10} className="text-white" />`}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">${c.first_name} ${c.last_name}</p>
                                            <p className="text-xs text-gray-500">${c.phone_number}</p>
                                        </div>
                                    </button>
                                `)}
                            </div>
                            <div className="p-4 border-t border-gray-100 dark:border-midnight-800 bg-white dark:bg-midnight-950">
                                <${Button} 
                                    onClick=${handleBulkAddExisting} 
                                    disabled=${selectedExisting.size === 0 || isBulkAdding}
                                    variant="primary" 
                                    className="w-full rounded-2xl shadow-glow py-3"
                                >
                                    ${isBulkAdding ? 'Adding...' : 'Add Selected Contacts'}
                                </${Button}>
                            </div>
                        </div>

                        <div className="flex flex-col border border-gray-200 dark:border-midnight-800 rounded-3xl overflow-hidden bg-white dark:bg-midnight-950">
                            <div className="p-4 border-b border-gray-100 dark:border-midnight-800 bg-gray-50/50 dark:bg-midnight-900/20">
                                <h3 className="font-bold flex items-center gap-2">
                                    <${Icon} name="copy" size=${16} className="text-primary-500" />
                                    Import from another Segment
                                </h3>
                                <p className="text-xs text-gray-500 mt-1">Click a segment to merge its contacts into this one.</p>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-3" style=${{ minHeight: '300px' }}>
                                ${allSegments.length === 0 ? html`
                                    <p className="text-center text-sm text-gray-500 py-10">No other segments available.</p>
                                ` : allSegments.map(s => html`
                                    <button
                                        key=${s.id}
                                        onClick=${() => handleSelectSegmentContacts(s)}
                                        className="w-full flex items-center justify-between p-4 rounded-2xl border border-gray-200 dark:border-midnight-800 hover:border-primary-500 hover:bg-primary-50/20 dark:hover:bg-primary-900/10 transition-all text-left"
                                    >
                                        <div>
                                            <p className="font-bold text-gray-900 dark:text-white">${s.name}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">${s.contact_count} contacts</p>
                                        </div>
                                        <${Icon} name="download" size=${16} className="text-primary-500" />
                                    </button>
                                `)}
                            </div>
                        </div>
                    </div>
                `}
            </div>
        </div>
    `;
};

const ContactsPage = () => {
    const { showToast } = useToast();
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [openSegment, setOpenSegment] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newGroup, setNewGroup] = useState({ name: '', description: '' });

    useEffect(() => {
        fetchGroups();
    }, []);

    const fetchGroups = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/groups');
            setGroups(res.data);
        } catch (error) {
            console.error('Failed to fetch groups:', error);
            showToast('Failed to load segments', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateGroup = async (e) => {
        e.preventDefault();
        try {
            const res = await apiClient.post('/groups', newGroup);
            showToast('Segment created!', 'success');
            setShowCreateModal(false);
            setNewGroup({ name: '', description: '' });
            fetchGroups();
            setOpenSegment(res.data);
        } catch (error) {
            showToast('Failed to create segment', 'error');
        }
    };

    const filteredGroups = groups.filter(g =>
        g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (g.description && g.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (openSegment) {
        return html`
            <div className="fade-in">
                <${SegmentDetailView}
                    segment=${openSegment}
                    onBack=${() => setOpenSegment(null)}
                    onSegmentUpdated=${() => fetchGroups()}
                />
            </div>
        `;
    }

    return html`
        <div className="space-y-6 fade-in max-w-6xl mx-auto pb-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md group">
                    <${Icon} name="search" size=${20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search your segments..."
                        value=${searchQuery}
                        onChange=${(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-10 py-3.5 bg-white dark:bg-midnight-900 border border-gray-200 dark:border-midnight-800 rounded-2xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none text-sm font-medium transition-all shadow-sm"
                    />
                    ${searchQuery && html`
                        <button onClick=${() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                            <${Icon} name="x" size=${16} />
                        </button>
                    `}
                </div>
                
                <${Button} 
                    variant="primary" 
                    onClick=${() => setShowCreateModal(true)} 
                    className="rounded-2xl px-6 py-3.5 shadow-glow font-black uppercase tracking-widest text-xs"
                >
                    <${Icon} name="plus" size=${18} className="mr-2" />
                    New Segment
                </${Button}>
            </div>

            ${loading ? html`
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
                    ${[1, 2, 3, 4, 5, 6].map(i => html`
                        <div key=${i} className="h-48 bg-gray-50 dark:bg-midnight-900/50 border border-gray-100 dark:border-midnight-800 rounded-[2.5rem] animate-pulse" />
                    `)}
                </div>
            ` : filteredGroups.length === 0 ? html`
                <${Card} className="py-24 px-10 text-center bg-white dark:bg-midnight-950/50 border-gray-100 dark:border-midnight-800">
                    <div className="w-20 h-20 bg-primary-50 dark:bg-primary-900/10 rounded-full flex items-center justify-center mx-auto mb-6 text-primary-300 dark:text-primary-800">
                        <${Icon} name="layers" size=${40} />
                    </div>
                    <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">
                        ${searchQuery ? "No segments found matching your search" : "Your audience is empty"}
                    </h3>
                    <p className="text-gray-500 dark:text-midnight-500 text-sm max-w-sm mx-auto mb-8 font-medium italic">
                        ${searchQuery 
                            ? "Try checking your spelling or search for another keyword." 
                            : "Segments are groups of contacts. Create your first one to start messaging!"
                        }
                    </p>
                    ${!searchQuery && html`
                        <${Button} variant="outline" onClick=${() => setShowCreateModal(true)} className="rounded-2xl px-8">
                            Create First Segment
                        </${Button}>
                    `}
                </${Card}>
            ` : html`
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
                    ${filteredGroups.map(group => html`
                        <${Card} 
                            key=${group.id} 
                            onClick=${() => setOpenSegment(group)}
                            className="p-6 cursor-pointer group hover:border-primary-500/50 transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[180px]"
                        >
                            <div className="absolute -right-6 -bottom-6 text-primary-500/5 group-hover:text-primary-500/10 transition-colors pointer-events-none">
                                <${Icon} name="tag" size=${120} />
                            </div>

                            <div className="relative z-10">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-12 h-12 bg-primary-500/10 dark:bg-primary-500/5 rounded-2xl flex items-center justify-center text-primary-600 dark:text-primary-400">
                                        <${Icon} name="tag" size=${24} />
                                    </div>
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-midnight-900 rounded-full border border-gray-100 dark:border-midnight-800">
                                        <${Icon} name="users" size=${12} className="text-gray-400" />
                                        <span className="text-[11px] font-black text-gray-600 dark:text-midnight-400">${group.contact_count}</span>
                                    </div>
                                </div>
                                <h3 className="text-lg font-black text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors truncate">
                                    ${group.name}
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-midnight-500 font-medium line-clamp-2 mt-1 min-h-[2.5rem]">
                                    ${group.description || 'No description provided.'}
                                </p>
                            </div>

                            <div className="relative z-10 mt-6 pt-4 border-t border-gray-50 dark:border-midnight-900 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-400">
                                <span>Manage Members</span>
                                <${Icon} name="chevron-right" size=${14} className="group-hover:translate-x-1 transition-transform text-primary-500" />
                            </div>
                        </${Card}>
                    `)}
                </div>
            `}

            <${Modal} isOpen=${showCreateModal} onClose=${() => setShowCreateModal(false)} title="Create New Segment">
                <form onSubmit=${handleCreateGroup} className="space-y-5 pt-2">
                    <p className="text-sm text-gray-500 dark:text-midnight-500 font-medium mb-4">
                        Segments help you organize your contacts for targeted messaging.
                    </p>
                    <${Input}
                        label="Segment Name"
                        placeholder="e.g. VIP Customers, Marketing List"
                        value=${newGroup.name}
                        onChange=${(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                        required
                    />
                    <${Input}
                        label="Description (Optional)"
                        placeholder="e.g. Customers who joined via the summer sale"
                        value=${newGroup.description}
                        onChange=${(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                    />
                    <div className="flex gap-4 pt-4">
                        <${Button} type="button" variant="outline" className="flex-1 rounded-2xl py-3.5" onClick=${() => setShowCreateModal(false)}>
                            Cancel
                        </${Button}>
                        <${Button} type="submit" variant="primary" className="flex-1 rounded-2xl py-3.5 shadow-glow">
                            Create Segment
                        </${Button}>
                    </div>
                </form>
            </${Modal}>
        </div>
    `;
};


const MessagesPage = () => {
    const { showToast } = useToast();
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [expandedId, setExpandedId] = useState(null);
    const [campaignStats, setCampaignStats] = useState({});

    useEffect(() => {
        fetchCampaigns();
    }, [filter]);

    const fetchCampaigns = async () => {
        try {
            const statusMap = {
                'pending': 'pending',
                'delivered': 'delivered',
                'failed': 'failed'
            };
            const params = filter !== 'all' ? { status: statusMap[filter] } : {};
            const response = await apiClient.get('/campaigns', { params });
            setCampaigns(response.data.items || []);
        } catch (error) {
            console.error('Failed to fetch campaigns:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCampaignStats = async (campaignId) => {
        if (campaignStats[campaignId]) return;
        try {
            const response = await apiClient.get(`/campaigns/${campaignId}/stats`);
            setCampaignStats(prev => ({ ...prev, [campaignId]: response.data }));
        } catch (error) {
            console.error('Failed to fetch campaign stats:', error);
        }
    };

    const handleBatchRetry = async (campaignId) => {
        try {
            await apiClient.post(`/campaigns/${campaignId}/retry`);
            showToast('All failed messages have been re-enqueued', 'success');
            fetchMessages(); // Refresh stats for this campaign if expanded
            if (expandedId === campaignId) {
                // Force stats refresh
                const response = await apiClient.get(`/campaigns/${campaignId}/stats`);
                setCampaignStats(prev => ({ ...prev, [campaignId]: response.data }));
            }
        } catch (error) {
            showToast('Retry failed: ' + (error.response?.data?.detail || 'Unknown error'), 'error');
        }
    };

    const handleRetry = async (messageId) => {
        try {
            await apiClient.post(`/sms/retry/${messageId}`);
            showToast('Message re-enqueued for delivery', 'success');
            fetchMessages();
        } catch (error) {
            showToast('Retry failed: ' + (error.response?.data?.detail || 'Unknown error'), 'error');
        }
    };

    const handleDeleteCampaign = async (campaignId) => {
        try {
            await apiClient.delete(`/campaigns/${campaignId}`);
            showToast('Campaign history deleted', 'success');
            fetchCampaigns();
        } catch (error) {
            showToast('Delete failed: ' + (error.response?.data?.detail || 'Unknown error'), 'error');
        }
    };

    const getStatusBadge = (status) => {
        const variants = {
            pending: 'warning',
            sent: 'info',
            delivered: 'success',
            failed: 'danger',
            expired: 'warning',
        };
        return html`<${Badge} variant=${variants[status] || 'default'}>${status}</${Badge}>`;
    };

    if (loading) {
        return html`
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        `;
    }

    return html`
        <div className="space-y-6 fade-in">

            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
                ${['all', 'pending', 'delivered', 'failed'].map((f) => html`
                    <button
                        key=${f}
                        onClick=${() => setFilter(f)}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${filter === f ? 'bg-primary-600 text-white shadow-sm' : 'bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-100/50'}"
                    >
                        ${f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                `)}
            </div>

            <div className="campaign-history-container">
                ${campaigns.length === 0 ? html`
                    <${Card} className="p-12 text-center">
                        <${Icon} name="history" size=${64} className="mx-auto mb-4 text-gray-400 dark:text-midnight-600" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No history found</h3>
                        <p className="text-gray-600 dark:text-midnight-400">Your sent campaigns will appear here</p>
                    </${Card}>
                ` : html`
                    <${Card} className="overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-midnight-900/80 border-b border-gray-200 dark:border-midnight-800">
                                    <tr>
                                        <th className="w-10 px-4 py-3"></th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-midnight-300">Campaign Name</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-midnight-300">Sender</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-midnight-300">Status</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-midnight-300 whitespace-nowrap">Date</th>
                                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-midnight-300">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    ${campaigns.map((campaign) => {
                                        const isExpanded = expandedId === campaign.id;
                                        const stats = campaignStats[campaign.id];
                                        
                                        const handleExpand = () => {
                                            if (!isExpanded) fetchCampaignStats(campaign.id);
                                            setExpandedId(isExpanded ? null : campaign.id);
                                        };

                                        return html`
                                            <tr key=${campaign.id} 
                                                onClick=${handleExpand}
                                                className=${`hover:bg-gray-50 cursor-pointer transition-colors ${isExpanded ? 'bg-primary-50/30' : ''}`}
                                            >
                                                <td className="px-4 py-3">
                                                    <${Icon} 
                                                        name="chevron-down" 
                                                        size=${16} 
                                                        className=${`text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-primary-600' : ''}`} 
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-sm font-bold text-gray-900">${campaign.name}</td>
                                                <td className="px-4 py-3 text-sm text-gray-600">${campaign.sender}</td>
                                                <td className="px-4 py-3 text-sm">${getStatusBadge(campaign.status)}</td>
                                                <td className="px-4 py-3 text-sm text-gray-600">${new Date(campaign.created_at).toLocaleDateString()}</td>
                                                <td className="px-4 py-3 text-right" onClick=${(e) => e.stopPropagation()}>
                                                    <div className="flex justify-end gap-2">
                                                        <${Button} 
                                                            variant="outline"
                                                            size="sm"
                                                            onClick=${() => window.location.hash = `#/campaigns/create?edit=${campaign.id}`} 
                                                            className="text-gray-600 dark:text-midnight-400 hover:text-primary-600 dark:hover:text-primary-400 p-1 border-none shadow-none"
                                                            title="Edit/View Campaign"
                                                        >
                                                            <${Icon} name="edit" size=${16} />
                                                        </${Button}>
                                                        ${campaign.status === 'failed' && html`
                                                            <${Button} 
                                                                variant="outline"
                                                                size="sm"
                                                                onClick=${() => handleBatchRetry(campaign.id)} 
                                                                className="text-primary-600 dark:text-primary-400 p-1 border-none shadow-none"
                                                                title="Retry Failed Messages"
                                                            >
                                                                <${Icon} name="refresh-cw" size=${16} />
                                                            </${Button}>
                                                        `}
                                                        <${Button} 
                                                            variant="outline"
                                                            size="sm"
                                                            onClick=${() => { if(confirm('Delete this campaign history?')) handleDeleteCampaign(campaign.id) }} 
                                                            className="text-red-500 hover:text-red-700 p-1 border-none shadow-none"
                                                            title="Delete History"
                                                        >
                                                            <${Icon} name="trash-2" size=${16} />
                                                        </${Button}>
                                                    </div>
                                                </td>
                                            </tr>
                                            ${isExpanded && html`
                                                <tr className="bg-gray-50/50 dark:bg-midnight-900/30">
                                                    <td colSpan="6" className="px-4 sm:px-12 py-6">
                                                        <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-200">
                                                            <div>
                                                                <p className="text-[10px] font-bold text-gray-400 dark:text-midnight-500 uppercase tracking-widest mb-1.5">Message Template</p>
                                                                <p className="text-sm text-gray-800 dark:text-midnight-100 leading-relaxed bg-white dark:bg-midnight-900 p-4 rounded-xl border border-gray-100 dark:border-midnight-800 shadow-sm whitespace-pre-wrap">${campaign.template}</p>
                                                            </div>
                                                            
                                                            <div>
                                                                <p className="text-[10px] font-bold text-gray-400 dark:text-midnight-500 uppercase tracking-widest mb-3">Delivery Statistics</p>
                                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                                                                    ${stats ? html`
                                                                        <div className="bg-white dark:bg-midnight-900 p-3 rounded-xl border border-gray-100 dark:border-midnight-800 shadow-sm">
                                                                            <p className="text-[10px] font-bold text-gray-400 dark:text-midnight-500 uppercase tracking-widest mb-1">Delivered</p>
                                                                            <p className="text-lg font-black text-green-600 dark:text-emerald-400">${stats.delivered}</p>
                                                                        </div>
                                                                        <div className="bg-white dark:bg-midnight-900 p-3 rounded-xl border border-gray-100 dark:border-midnight-800 shadow-sm">
                                                                            <p className="text-[10px] font-bold text-gray-400 dark:text-midnight-500 uppercase tracking-widest mb-1">Pending</p>
                                                                            <p className="text-lg font-black text-amber-500 dark:text-amber-400">${stats.pending}</p>
                                                                        </div>
                                                                        <div className="bg-white dark:bg-midnight-900 p-3 rounded-xl border border-gray-100 dark:border-midnight-800 shadow-sm">
                                                                            <p className="text-[10px] font-bold text-gray-400 dark:text-midnight-500 uppercase tracking-widest mb-1">Failed</p>
                                                                            <p className="text-lg font-black text-red-500 dark:text-rose-400">${stats.failed}</p>
                                                                        </div>
                                                                        <div className="bg-white dark:bg-midnight-900 p-3 rounded-xl border border-gray-100 dark:border-midnight-800 shadow-sm">
                                                                            <p className="text-[10px] font-bold text-gray-400 dark:text-midnight-500 uppercase tracking-widest mb-1">Total</p>
                                                                            <p className="text-lg font-black text-gray-900 dark:text-white">${stats.total}</p>
                                                                        </div>
                                                                    ` : html`
                                                                        <div className="col-span-4 py-4 flex items-center gap-2 text-gray-400 dark:text-midnight-500 text-xs">
                                                                            <div className="animate-spin rounded-full h-3 w-3 border-2 border-primary-600 border-t-transparent"></div>
                                                                            Loading stats...
                                                                        </div>
                                                                    `}
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-midnight-800">
                                                                <p className="text-[10px] text-gray-500 dark:text-midnight-500 font-medium tracking-tight">Campaign ID: #${campaign.id}</p>
                                                                <${Button} 
                                                                    variant="outline" 
                                                                    size="sm" 
                                                                    className="text-[10px] py-1"
                                                                    onClick=${() => window.location.hash = `#/campaigns/create?edit=${campaign.id}`}
                                                                >
                                                                    View Detailed Logs <${Icon} name="chevron-right" size=${10} className="ml-1" />
                                                                </${Button}>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            `}
                                        `;
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </${Card}>
                `}
            </div>
        </div>
    `;
};



const PricingPage = () => {
    const { showToast } = useToast();
    const [pricing, setPricing] = useState([]);
    const [ledger, setLedger] = useState([]);
    const [balance, setBalance] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showTopupModal, setShowTopupModal] = useState(false);
    const [topupAmount, setTopupAmount] = useState('10.00');
    const [momoPhone, setMomoPhone] = useState('');
    const [momoNetwork, setMomoNetwork] = useState('MTN');
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentRef, setPaymentRef] = useState(null);
    const [txnStatus, setTxnStatus] = useState(null); // 'pending', 'success', 'failed'

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [pricingRes, ledgerRes, balanceRes] = await Promise.all([
                apiClient.get('/billing/pricing'),
                apiClient.get('/billing/ledger'),
                apiClient.get('/billing/balance')
            ]);
            setPricing(pricingRes.data);
            setLedger(ledgerRes.data);
            setBalance(balanceRes.data);
        } catch (error) {
            console.error('Failed to fetch pricing data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleTopup = async (e) => {
        e.preventDefault();
        if (!momoPhone || momoPhone.length < 10) {
            showToast('Please enter a valid phone number', 'error');
            return;
        }

        setIsProcessing(true);
        setTxnStatus('preparing');
        try {
            const response = await apiClient.post('/payments/momo-push', {
                amount: parseFloat(topupAmount),
                phone_number: momoPhone,
                network: momoNetwork
            });
            
            setPaymentRef(response.data.reference);
            setTxnStatus('pending');
            startPolling(response.data.reference);
            showToast('Payment request sent!', 'info');
        } catch (error) {
            showToast('Failed to initiate payment', 'error');
            setTxnStatus(null);
            setIsProcessing(false);
        }
    };

    const startPolling = (ref) => {
        const interval = setInterval(async () => {
            try {
                const res = await apiClient.get(`/payments/status/${ref}`);
                if (res.data.status === 'SUCCESS') {
                    clearInterval(interval);
                    setTxnStatus('success');
                    showToast('Payment Successful!', 'success');
                    setTimeout(() => {
                        setShowTopupModal(false);
                        resetTopupState();
                        fetchData();
                    }, 2000);
                } else if (res.data.status === 'FAILED') {
                    clearInterval(interval);
                    setTxnStatus('failed');
                    showToast('Payment Failed', 'error');
                    setIsProcessing(false);
                }
            } catch (error) {
                console.error('Polling error:', error);
            }
        }, 3000);

        // Cleanup after 2 minutes
        setTimeout(() => {
            clearInterval(interval);
            if (txnStatus === 'pending') {
                setTxnStatus('timeout');
                setIsProcessing(false);
            }
        }, 120000);
    };

    const resetTopupState = () => {
        setTxnStatus(null);
        setPaymentRef(null);
        setIsProcessing(false);
    };

    if (loading) {
        return html`
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        `;
    }

    return html`
        <div className="space-y-6 fade-in">
            <${Card} className="p-6 bg-gradient-to-r from-primary-600 to-primary-800 text-white border-none">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-primary-100 mb-1">Current Balance</p>
                        <h2 className="text-4xl font-bold">${balance?.balance?.toFixed(2) || '0.00'} <span className="text-2xl font-normal">${balance?.currency || 'GHS'}</span></h2>
                    </div>
                    <div className="text-right">
                        <${Button} variant="secondary" size="sm" onClick=${() => setShowTopupModal(true)}>
                            Top Up Wallet
                        </${Button}>
                    </div>
                </div>
        <div className="mt-6 flex gap-8">
            <div>
                <p className="text-primary-200 text-sm">Subscription Credits</p>
                <p className="font-semibold text-lg">${balance?.subscription_credits?.toFixed(2) || '0.00'}</p>
            </div>
            <div>
                <p className="text-primary-200 text-sm">Pay-As-You-Go Credits</p>
                <p className="font-semibold text-lg">${balance?.payg_credits?.toFixed(2) || '0.00'}</p>
            </div>
        </div>
    </${Card}>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <${Card} className="p-0 overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-midnight-800 bg-gray-50 dark:bg-midnight-900/80">
                    <h3 className="font-semibold text-gray-900 dark:text-white">SMS Rates</h3>
                </div>
                <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-midnight-900/50 text-gray-600 dark:text-midnight-400 text-xs uppercase">
                        <tr>
                            <th className="px-4 py-3 text-left">Network</th>
                            <th className="px-4 py-3 text-right">Cost per SMS</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        ${pricing.map((rate, idx) => html`
                                <tr key=${idx} className="hover:bg-gray-50 dark:hover:bg-midnight-900/50">
                                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">${rate.network_name}</td>
                                    <td className="px-4 py-3 text-right text-gray-600 dark:text-midnight-400">
                                        ${rate.cost_per_sms.toFixed(4)} ${rate.currency}
                                    </td>
                                </tr>
                            `)}
                        ${pricing.length === 0 && html`
                                <tr>
                                    <td colSpan="2" className="px-4 py-6 text-center text-gray-500">
                                        No pricing data available
                                    </td>
                                </tr>
                            `}
                    </tbody>
                </table>
            </${Card}>

            <${Card} className="p-0 overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-midnight-800 bg-gray-50 dark:bg-midnight-900/80">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Recent Transactions</h3>
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                    ${ledger.length === 0 ? html`
                            <div className="p-8 text-center text-gray-500">
                                <${Icon} name="clock" size=${32} className="mx-auto mb-2 text-gray-300" />
                                <p>No transaction history</p>
                            </div>
                        ` : html`
                            <div className="divide-y divide-gray-100">
                                ${ledger.map((entry) => html`
                                    <div key=${entry.id} className="p-4 hover:bg-gray-50 dark:hover:bg-midnight-900/50 flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">${entry.description}</p>
                                            <p className="text-xs text-gray-500 dark:text-midnight-400">${new Date(entry.created_at).toLocaleString()}</p>
                                        </div>
                                        <div className=${`text-sm font-bold ${entry.type === 'debit' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-emerald-400'}`}>
                                            ${entry.type === 'debit' ? '-' : '+'}${entry.amount.toFixed(2)}
                                        </div>
                                    </div>
                                `)}
                            </div>
                        `}
                </div>
            </${Card}>
        </div>

<${Modal} isOpen=${showTopupModal} onClose=${() => !isProcessing && setShowTopupModal(false)} title="Top Up Wallet">
    ${txnStatus === 'pending' || txnStatus === 'success' || txnStatus === 'failed' ? html`
        <div className="py-8 text-center space-y-4">
            ${txnStatus === 'pending' ? html`
                <div className="w-16 h-16 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin mx-auto"></div>
                <div>
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white">Waiting for Approval</h4>
                    <p className="text-sm text-gray-500 dark:text-midnight-400 mt-1">Check your phone for the prompt (Simulation Mode).</p>
                </div>
                <div className="space-y-3">
                    <div className="bg-gray-50 dark:bg-midnight-900/50 p-3 rounded-xl inline-block mx-auto border border-gray-100 dark:border-midnight-800">
                        <p className="text-xs font-mono text-gray-500 uppercase tracking-widest">Ref: ${paymentRef}</p>
                    </div>
                    <div className="pt-2">
                        <a href="simulate_momo.html" target="_blank" className="text-xs text-primary-600 hover:underline font-bold flex items-center justify-center gap-1">
                            <${Icon} name="external-link" size=${12} />
                            Open Simulation Tool to Approve
                        </a>
                    </div>
                </div>
            ` : txnStatus === 'success' ? html`
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                    <${Icon} name="check" size=${32} />
                </div>
                <h4 className="text-lg font-bold text-gray-900 dark:text-white">Top-up Successful!</h4>
            ` : html`
                <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mx-auto text-rose-600">
                    <${Icon} name="x" size=${32} />
                </div>
                <h4 className="text-lg font-bold text-gray-900 dark:text-white">Transaction Failed</h4>
                <${Button} variant="outline" size="sm" onClick=${resetTopupState}>Try Again</${Button}>
            `}
        </div>
    ` : html`
        <form onSubmit=${handleTopup} className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-midnight-400">Choose an amount and enter your mobile money details.</p>
            
            <div className="grid grid-cols-3 gap-2">
                ${['10', '20', '50', '100', '200', '500'].map(amt => html`
                    <button 
                        type="button" 
                        key=${amt}
                        onClick=${() => setTopupAmount(amt)}
                        className=${`py-2 px-3 border rounded-xl text-sm font-medium transition-all ${topupAmount === amt ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-700 hover:border-primary-400 dark:bg-midnight-900 dark:text-midnight-300 dark:border-midnight-800'}`}
                    >
                        ${amt} GHS
                    </button>
                `)}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 ml-1">Network</label>
                    <select 
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-midnight-900/50 text-gray-900 dark:text-white border border-gray-200 dark:border-midnight-800 rounded-xl outline-none text-sm"
                        value=${momoNetwork}
                        onChange=${(e) => setMomoNetwork(e.target.value)}
                    >
                        <option value="MTN">MTN Ghana</option>
                        <option value="TELECEL">Telecel (Vodafone)</option>
                        <option value="AIRTELTIGO">AirtelTigo</option>
                    </select>
                </div>
                <${Input} 
                    label="Mobile Number" 
                    placeholder="024XXXXXXX"
                    value=${momoPhone}
                    onChange=${(e) => setMomoPhone(e.target.value)}
                />
            </div>

            <${Input} 
                label="Custom Amount (GHS)" 
                type="number" 
                min="1" 
                value=${topupAmount} 
                onChange=${(e) => setTopupAmount(e.target.value)} 
            />

            <div className="pt-4 flex gap-2">
                <${Button} type="button" variant="outline" className="flex-1" onClick=${() => setShowTopupModal(false)}>Cancel</${Button}>
                <${Button} type="submit" className="flex-1" disabled=${isProcessing}>
                    ${isProcessing ? 'Initiating...' : 'Send Payment Request'}
                </${Button}>
            </div>
        </form>
    `}
</${Modal}>
</div>
    `;
};

const TemplatesPage = () => {
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

const SettingsPage = () => {
    const { user, logout } = useAuth();
    return html`
        <div className="max-w-2xl mx-auto space-y-6 fade-in">
            <${Card} className="p-6 sm:p-8">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-20 h-20 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-3xl font-black text-primary-600 border-2 border-primary-200 dark:border-primary-800">
                        ${user?.full_name?.charAt(0) || 'U'}
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">${user?.full_name}</h2>
                        <p className="text-sm font-medium text-gray-500 uppercase tracking-widest mt-1">${user?.role}</p>
                    </div>
                </div>

                <div className="space-y-4 mb-8">
                    <div className="p-4 bg-gray-50 dark:bg-midnight-900/50 rounded-xl border border-gray-100 dark:border-midnight-800">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-semibold uppercase tracking-wider">Email Address</p>
                        <p className="text-gray-900 dark:text-white font-medium">${user?.email}</p>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-midnight-900/50 rounded-xl border border-gray-100 dark:border-midnight-800">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-semibold uppercase tracking-wider">Organization ID</p>
                        <p className="text-gray-900 dark:text-white font-medium">ORG-${user?.organization_id.toString().padStart(4, '0')}</p>
                    </div>
                </div>

                <${Button} 
                    onClick=${logout} 
                    className="w-full sm:w-auto py-3 px-8 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:text-red-400 transition-colors"
                >
                    <${Icon} name="log-out" size=${18} className="inline mr-2" />
                    Sign Out Securely
                </${Button}>
            </${Card}>
        </div>
    `;
};

// ============================================================================
// MAIN APP
// ============================================================================

const App = () => {
    const { user, loading } = useAuth();
    const [currentPage, setCurrentPage] = useState('dashboard');
    const [currentHash, setCurrentHash] = useState(window.location.hash);

    useEffect(() => {
        // Simple hash-based routing
        const handleHashChange = () => {
            const hash = window.location.hash.slice(1) || '/dashboard';
            const page = hash.split('/')[1] || 'dashboard';
            setCurrentHash(window.location.hash);
            setCurrentPage(page);
        };

        window.addEventListener('hashchange', handleHashChange);
        handleHashChange();

        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    // Public routes
    if (!user) {
        if (currentPage === 'register') {
            return html`<${RegisterPage} />`;
        }
        return html`<${LoginPage} />`;
    }

    // Protected routes
    const renderPage = () => {
        switch (currentPage) {
            case 'campaigns':
                return currentHash.includes('/create') ? html`<${CreateCampaignPage} />` : html`<${CampaignsPage} />`;
            case 'contacts':
                return html`<${ContactsPage} />`;
            case 'messages':
                return html`<${MessagesPage} />`;
            case 'pricing':
                return html`<${PricingPage} />`;
            case 'sender-ids':
                return html`<${SenderIDManagement} />`;
            case 'templates':
                return html`<${TemplatesPage} />`;
            case 'settings':
                return html`<${SettingsPage} />`;
            case 'help':
                return html`<${HelpPage} />`;
            case 'api-docs':
                return html`<${APIDocsPage} />`;
            default:
                return html`<${DashboardPage} />`;
        }
    };

    return html`
        <${DashboardLayout} currentPage=${currentPage} onNavigate=${(page) => window.location.href = `#/${page}`}>
            ${renderPage()}
        </${DashboardLayout}>
    `;
};

// ============================================================================
// RENDER APP
// ============================================================================

const root = createRoot(document.getElementById('root'));
root.render(html`
    <${AuthProvider}>
        <${ToastProvider}>
            <${App} />
        </${ToastProvider}>
    </${AuthProvider}>
`);

// Give the beautiful splash screen animation roughly 1s to play out before the app removes it.
setTimeout(() => {
    hideSplashScreen();
}, 1000);


 