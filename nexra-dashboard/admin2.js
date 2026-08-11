import { ConfirmModal } from './src/components/ui/ConfirmModal.js';
import { AdminTransactionsPage } from './src/pages/AdminTransactionsPage.js';
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

const API_BASE_URL = window.__NEXRA_API_URL__ || 'https://nexra-api.onrender.com/api/v1';

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

// Response interceptor — silent token refresh on 401
let _isRefreshing = false;
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401 && !error.config._retry) {
            const refreshToken = localStorage.getItem('refresh_token');
            if (refreshToken && !_isRefreshing) {
                _isRefreshing = true;
                try {
                    const res = await axios.post(
                        `${API_BASE_URL}/auth/refresh`,
                        {},
                        { headers: { Authorization: `Bearer ${refreshToken}` } }
                    );
                    const { access_token, refresh_token } = res.data;
                    localStorage.setItem('access_token', access_token);
                    if (refresh_token) localStorage.setItem('refresh_token', refresh_token);
                    error.config._retry = true;
                    error.config.headers.Authorization = `Bearer ${access_token}`;
                    _isRefreshing = false;
                    return apiClient(error.config);
                } catch (_) {
                    _isRefreshing = false;
                }
            }
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            window.location.href = 'admin.html#/login';
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
            // Verify if user is actually a platform-level account
            if (response.data.role !== 'superadmin' && response.data.role !== 'staff') {
                showToast('Access denied: You are not a platform administrator.', 'error');
                logout();
            }
        } catch (error) {
            localStorage.removeItem('access_token');
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        const formData = new FormData();
        formData.append('username', email);
        formData.append('password', password);

        const response = await apiClient.post('/auth/login', formData, {
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
        localStorage.removeItem('refresh_token');
        setUser(null);
        window.location.href = 'admin.html#/login';
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

    return html`
        <${ToastContext.Provider} value=${{ showToast }}>
            ${children}
            
            <!-- Toast Container -->
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

const useToast = () => useContext(ToastContext);

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
// UI COMPONENTS (CORE)
// ============================================================================

const Icon = ({ name, size = 24, className = '' }) => {
    const iconRef = useRef(null);

    useEffect(() => {
        if (window.lucide && iconRef.current) {
            iconRef.current.innerHTML = `<i data-lucide="${name}" style="width: ${size}px; height: ${size}px;"></i>`;
            window.lucide.createIcons({ root: iconRef.current });
        }
    }, [name, size]);

    return html`<span 
        ref=${iconRef} 
        className="inline-flex items-center justify-center ${className}" 
        style=${{ width: `${size}px`, height: `${size}px` }}
    ></span>`;
};

const Button = ({ children, variant = 'primary', size = 'md', className = '', ...props }) => {
    const baseClasses = 'font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2';

    const variants = {
        primary: 'bg-primary-600 hover:bg-primary-700 text-white shadow-lg shadow-primary-600/20',
        secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-900 dark:bg-midnight-800 dark:hover:bg-midnight-700 dark:text-white',
        outline: 'border-2 border-primary-600 text-primary-600 hover:bg-primary-50 dark:hover:bg-midnight-900/50 dark:border-primary-500 dark:text-primary-400',
        danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/20',
        ghost: 'hover:bg-gray-100 dark:hover:bg-midnight-800 text-gray-700 dark:text-gray-300',
    };

    const sizes = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-base',
        lg: 'px-6 py-3 text-lg',
    };

    return html`
        <button className="${baseClasses} ${variants[variant]} ${sizes[size]} ${className}" ...${props}>
            ${children}
        </button>
    `;
};

const Card = ({ children, className = '', ...props }) => {
    return html`<div className="premium-card rounded-2xl ${className}" ...${props}>${children}</div>`;
};

const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    const modal = html`
        <div className="fixed inset-0 z-[1000] flex items-start justify-center p-4 sm:p-6 pt-6 pb-6 overflow-x-hidden overflow-y-auto">
            <div className="absolute inset-0 bg-midnight-950/60 backdrop-blur-sm animate-fade-in" onClick=${onClose}></div>
            <div className="relative bg-white dark:bg-midnight-900 w-full max-w-[95%] sm:max-w-md md:max-w-lg rounded-2xl shadow-2xl animate-pop-in overflow-hidden border border-white/10 dark:border-midnight-800 max-h-[calc(100vh-3rem)]">
                <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-midnight-800 flex items-center justify-between">
                    <h3 className="text-lg font-bold dark:text-white">${title}</h3>
                    <button onClick=${onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-midnight-800 rounded-xl transition-colors">
                        <${Icon} name="x" size=${20} className="text-gray-400" />
                    </button>
                </div>
                <div className="p-5 sm:p-6 max-h-[calc(100vh-10rem)] overflow-y-auto no-scrollbar">
                    ${children}
                </div>
            </div>
        </div>
    `;
    return ReactDOM.createPortal(modal, document.body);
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
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-midnight-900/50 text-gray-900 dark:text-white border border-gray-200 dark:border-midnight-800 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:focus:border-primary-500 transition-all outline-none text-sm ${className} ${isPassword ? 'pr-11' : ''}"
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
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold border ${variants[variant] || variants.default} ${className}">
            ${children}
        </span>
    `;
};

const Dropdown = ({ trigger, children, align = 'right' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return html`
        <div className="relative" ref=${dropdownRef}>
            <div onClick=${() => setIsOpen(!isOpen)}>${trigger}</div>
            ${isOpen && html`
                <div className="absolute z-10 mt-2 w-48 rounded-2xl shadow-xl bg-white/90 dark:bg-midnight-900/80 border border-gray-100 dark:border-midnight-800 ring-1 ring-black/5 backdrop-blur-xl ${align === 'right' ? 'right-0' : 'left-0'} animate-in fade-in zoom-in-95 duration-200">
                    <div className="py-1 overflow-hidden rounded-2xl" role="menu">
                        ${children}
                    </div>
                </div>
            `}
        </div>
    `;
};

// ============================================================================
// ADMIN COMPONENTS
// ============================================================================

const AdminStatCard = ({ label, value, sub, icon, colorBg, colorIcon, prefix }) => html`
    <${Card} className="relative overflow-hidden p-5 flex items-start gap-4 hover:shadow-lg transition-all duration-300 border border-gray-100 dark:border-midnight-800 bg-gradient-to-br from-white to-gray-50/50 dark:from-midnight-950 dark:to-midnight-900/50 group">
        <div className=${`absolute -right-6 -top-6 w-24 h-24 rounded-full ${colorBg} opacity-40 blur-2xl group-hover:opacity-70 transition-opacity duration-300`}></div>
        
        <div className=${`relative z-10 p-3 rounded-xl flex-shrink-0 ${colorBg} ring-1 ring-white/50 dark:ring-midnight-800/50 shadow-inner`}>
            <${Icon} name=${icon} size=${22} className=${colorIcon} />
        </div>
        <div className="relative z-10 flex-1 min-w-0">
            <p className="text-[10px] font-bold text-gray-500 dark:text-midnight-400 uppercase tracking-widest truncate">${label}</p>
            <h3 className="text-xl font-black text-gray-900 dark:text-white mt-1 tracking-tight">
                ${prefix}${typeof value === 'number' ? value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : value}
            </h3>
            ${sub && html`<p className="text-[10px] text-gray-400 dark:text-midnight-500 mt-1 font-medium truncate">${sub}</p>`}
        </div>
    </${Card}>
`;

const SystemHealthWidget = () => {
    const [health, setHealth] = useState(null);

    useEffect(() => {
        const checkHealth = () => {
            apiClient.get('/health/worker')
                .then(res => setHealth(res.data))
                .catch(() => setHealth({ status: 'error', reason: 'Failed to contact API' }));
        };
        checkHealth();
        const interval = setInterval(checkHealth, 15000);
        return () => clearInterval(interval);
    }, []);

    if (!health) return null;

    let bgClass = 'bg-gray-50 dark:bg-midnight-900';
    let textClass = 'text-gray-900 dark:text-white';
    let dotClass = 'bg-gray-400';
    let icon = 'activity';
    let label = 'Checking Status...';

    if (health.status === 'healthy') {
        bgClass = 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30';
        textClass = 'text-emerald-700 dark:text-emerald-400';
        dotClass = 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]';
        icon = 'check-circle';
        label = 'Resolve Worker is Healthy';
    } else if (health.status === 'degraded') {
        bgClass = 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30';
        textClass = 'text-amber-700 dark:text-amber-400';
        dotClass = 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]';
        icon = 'alert-triangle';
        label = 'Worker is Degraded';
    } else if (health.status === 'pending') {
        bgClass = 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30';
        textClass = 'text-blue-700 dark:text-blue-400';
        dotClass = 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]';
        icon = 'clock';
        label = 'Worker is Starting';
    } else {
        bgClass = 'bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30';
        textClass = 'text-red-700 dark:text-red-400';
        dotClass = 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)] animate-pulse';
        icon = 'x-circle';
        label = 'Worker is Offline (Dead)';
    }

    return html`
        <div className=${`flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 mb-6 ${bgClass}`}>
            <div className="flex items-center gap-3">
                <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-white/50 dark:bg-midnight-950/50 backdrop-blur-sm shadow-inner">
                    <span className=${`absolute w-2 h-2 rounded-full ${dotClass}`}></span>
                    ${health.status === 'healthy' && html`<span className="absolute w-2 h-2 rounded-full bg-emerald-500 animate-ping opacity-75"></span>`}
                </div>
                <div>
                    <h4 className=${`text-sm font-black ${textClass}`}>${label}</h4>
                    <p className=${`text-[10px] font-medium mt-0.5 opacity-80 ${textClass}`}>
                        ${health.reason || (health.last_run_at ? `Last active: ${new Date(health.last_run_at).toLocaleTimeString()}` : 'No runs recorded yet')}
                    </p>
                </div>
            </div>
            <div className="hidden sm:block">
                <div className="px-3 py-1.5 rounded-lg bg-white/40 dark:bg-midnight-950/40 backdrop-blur-md flex items-center gap-2 shadow-sm border border-white/50 dark:border-midnight-700/50">
                    <${Icon} name=${icon} size=${14} className=${textClass} />
                    <span className=${`text-[10px] font-black uppercase tracking-widest ${textClass}`}>System Liveness</span>
                </div>
            </div>
        </div>
    `;
};

const TrendChart = ({ data, dataKey, color, label, prefix = '' }) => {
    if (!data || data.length === 0) return null;
    
    const height = 100;
    const width = 400;
    const padding = 10;
    
    const maxVal = Math.max(...data.map(d => d[dataKey])) * 1.2 || 10;
    const points = data.map((d, i) => {
        const x = (i / (data.length - 1)) * (width - padding * 2) + padding;
        const y = height - ((d[dataKey] / maxVal) * (height - padding * 2) + padding);
        return `${x},${y}`;
    }).join(' ');

    const lastVal = data[data.length - 1][dataKey];

    return html`
        <${Card} className="p-6 relative overflow-hidden group">
            <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">${label}</p>
                        <h3 className="text-2xl font-black dark:text-white mt-1">
                            ${prefix}${lastVal.toLocaleString()}
                        </h3>
                    </div>
                    <div className=${`w-10 h-10 rounded-full flex items-center justify-center ${color === 'emerald' ? 'bg-emerald-50 text-emerald-600' : 'bg-primary-50 text-primary-600'}`}>
                        <${Icon} name=${dataKey === 'revenue' ? 'trending-up' : 'activity'} size=${20} />
                    </div>
                </div>
                
                <div className="mt-auto pt-4">
                    <svg viewBox="0 0 ${width} ${height}" className="w-full h-24 overflow-visible">
                        <defs>
                            <linearGradient id=${`grad-${dataKey}`} x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" style=${{ stopColor: color === 'emerald' ? '#10b981' : '#3b82f6', stopOpacity: 0.2 }} />
                                <stop offset="100%" style=${{ stopColor: color === 'emerald' ? '#10b981' : '#3b82f6', stopOpacity: 0 }} />
                            </linearGradient>
                        </defs>
                        <path
                            d=${`M ${points} L ${width - padding},${height} L ${padding},${height} Z`}
                            fill=${`url(#grad-${dataKey})`}
                            className="transition-all duration-1000"
                        />
                        <polyline
                            fill="none"
                            stroke=${color === 'emerald' ? '#10b981' : '#3b82f6'}
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            points=${points}
                            className="transition-all duration-1000"
                        />
                    </svg>
                </div>
            </div>
            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                 <span className="text-[10px] font-bold text-gray-400 uppercase">Last 14 Days</span>
            </div>
        </${Card}>
    `;
};

const PlatformRow = ({ label, value, icon }) => html`
    <div className="flex items-center justify-between p-3 bg-gray-50/70 dark:bg-midnight-900/50 rounded-xl border border-gray-100 dark:border-midnight-800">
        <div className="flex items-center gap-2.5">
            <${Icon} name=${icon} size=${15} className="text-gray-400 dark:text-midnight-500" />
            <span className="text-xs font-semibold text-gray-600 dark:text-midnight-300">${label}</span>
        </div>
        <span className="text-sm font-black text-gray-900 dark:text-white">${typeof value === 'number' ? value.toLocaleString() : value}</span>
    </div>
`;

const DateFilterDropdown = ({ currentRange, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const options = [
        { label: 'Today', getValue: () => {
            const start = new Date(); start.setHours(0,0,0,0);
            const end = new Date(); end.setHours(23,59,59,999);
            return { label: 'Today', start: start.toISOString(), end: end.toISOString() };
        }},
        { label: 'This Week', getValue: () => {
            const start = new Date();
            start.setDate(start.getDate() - start.getDay()); // Sunday
            start.setHours(0,0,0,0);
            const end = new Date(); end.setHours(23,59,59,999);
            return { label: 'This Week', start: start.toISOString(), end: end.toISOString() };
        }},
        { label: 'This Month', getValue: () => {
            const start = new Date(); start.setDate(1); start.setHours(0,0,0,0);
            const end = new Date(); end.setHours(23,59,59,999);
            return { label: 'This Month', start: start.toISOString(), end: end.toISOString() };
        }},
        { label: 'This Year', getValue: () => {
            const start = new Date(); start.setMonth(0, 1); start.setHours(0,0,0,0);
            const end = new Date(); end.setHours(23,59,59,999);
            return { label: 'This Year', start: start.toISOString(), end: end.toISOString() };
        }},
        { label: 'All Time', getValue: () => {
            return { label: 'All Time', start: null, end: null };
        }}
    ];

    const handleSelect = (opt) => {
        onChange(opt.getValue());
        setIsOpen(false);
    };

    const handleCustomApply = () => {
        if (!customStart || !customEnd) return;
        const start = new Date(customStart); start.setHours(0,0,0,0);
        const end = new Date(customEnd); end.setHours(23,59,59,999);
        onChange({ label: `Custom: ${start.toLocaleDateString()} - ${end.toLocaleDateString()}`, start: start.toISOString(), end: end.toISOString() });
        setIsOpen(false);
    };

    return html`
        <div className="relative inline-block text-left" ref=${dropdownRef}>
            <button 
                onClick=${() => setIsOpen(!isOpen)}
                className="inline-flex justify-center items-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none dark:bg-midnight-900 dark:border-midnight-700 dark:text-gray-200"
            >
                <${Icon} name="calendar" size=${16} className="mr-2 text-gray-400" />
                ${currentRange.label}
                <${Icon} name="chevron-down" size=${16} className="ml-2 -mr-1 text-gray-400" />
            </button>

            ${isOpen && html`
                <div className="origin-top-right absolute right-0 mt-2 w-64 rounded-md shadow-lg bg-white dark:bg-midnight-900 ring-1 ring-black ring-opacity-5 z-50 overflow-hidden divide-y divide-gray-100 dark:divide-midnight-800">
                    <div className="py-1">
                        ${options.map(opt => html`
                            <button
                                key=${opt.label}
                                onClick=${() => handleSelect(opt)}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-midnight-800 ${currentRange.label === opt.label ? 'font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/10' : ''}"
                            >
                                ${opt.label}
                            </button>
                        `)}
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-midnight-950/50">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Custom Range</p>
                        <div className="flex flex-col gap-2">
                            <input 
                                type="date" 
                                value=${customStart}
                                onChange=${(e) => setCustomStart(e.target.value)}
                                className="block w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-midnight-900 dark:border-midnight-700 dark:text-white"
                            />
                            <input 
                                type="date" 
                                value=${customEnd}
                                onChange=${(e) => setCustomEnd(e.target.value)}
                                className="block w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-midnight-900 dark:border-midnight-700 dark:text-white"
                            />
                            <button
                                onClick=${handleCustomApply}
                                disabled=${!customStart || !customEnd}
                                className="mt-2 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Apply
                            </button>
                        </div>
                    </div>
                </div>
            `}
        </div>
    `;
};

import { BusinessOverviewPage } from './src/pages/BusinessOverviewPage.js';

import { AdminApprovalPage } from './src/pages/AdminApprovalPage.js';

// ============================================================================
// ADMIN AUTH PAGES
// ============================================================================

const AuthLayout = ({ children, isLogin, loginType }) => {
    const subtitle = isLogin
        ? (loginType === 'master' ? 'Master Control — Restricted Access' : 'Staff Portal — Authenticated Access Only')
        : 'Platform Staff Registration';

    return html`
        <div className="h-[100dvh] w-full bg-white dark:bg-midnight-950 overflow-hidden flex items-center justify-center p-4">
            <div className="w-full max-w-md space-y-8 animate-pop-in">
                <div className="text-center">
                    <img src="assets/NEXRA_IconAbove.png" className="h-20 mx-auto mb-4 object-contain" />
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                        NEXRA <span className="text-primary-600">Admin</span>
                    </h1>
                    <p className="text-gray-500 dark:text-midnight-400 mt-2">
                        ${subtitle}
                    </p>
                </div>
                <${Card} className="p-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-primary-600"></div>
                    ${children}
                </${Card}>
                <p className="text-center text-xs text-gray-400">
                    Protected by NEXRA Security Stack v2.0
                </p>
            </div>
        </div>
    `;
};

import { AdminLoginPage } from './src/pages/AdminLoginPage.js';

import { AdminRegisterPage } from './src/pages/AdminRegisterPage.js';

// ============================================================================
// ADMIN LAYOUT
// ============================================================================

import { StaffManagementPage } from './src/pages/StaffManagementPage.js';

import { PlatformManagementPage } from './src/pages/PlatformManagementPage.js';

import { GlobalSearchPage } from './src/pages/GlobalSearchPage.js';

import { AuditLogPage } from './src/pages/AuditLogPage.js';

import { AnnouncementsPage } from './src/pages/AnnouncementsPage.js';

import { SystemHealthPage } from './src/pages/SystemHealthPage.js';

const MobileHeader = ({ title }) => {
    const { user } = useAuth();
    const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
    
    useEffect(() => {
        const handleThemeChange = () => setIsDark(document.documentElement.classList.contains('dark'));
        window.addEventListener('themechange', handleThemeChange);
        return () => window.removeEventListener('themechange', handleThemeChange);
    }, []);

    const toggleTheme = () => {
        const root = document.documentElement;
        if (root.classList.contains('dark')) {
            root.classList.remove('dark');
            localStorage.setItem('admin_theme', 'light');
            setIsDark(false);
        } else {
            root.classList.add('dark');
            localStorage.setItem('admin_theme', 'dark');
            setIsDark(true);
        }
        window.dispatchEvent(new Event('themechange'));
    };

    return html`
        <header className="lg:hidden sticky top-0 z-50 bg-white/80 dark:bg-midnight-950/80 backdrop-blur-md border-b border-gray-100 dark:border-midnight-800 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <img src="assets/NEXRA_IconAbove.png" alt="NEXRA" className="h-8 w-auto" />
                <h1 className="text-lg font-bold text-gray-900 dark:text-white truncate max-w-[150px] sm:max-w-none">${title}</h1>
            </div>
            <div className="flex items-center gap-4">
                <button
                    onClick=${toggleTheme}
                    className="p-2 rounded-full bg-gray-50 dark:bg-midnight-900 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                    <${Icon} name=${isDark ? 'sun' : 'moon'} size=${16} />
                </button>
                <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-[10px] font-black text-primary-600">
                    ${user?.full_name?.charAt(0)}
                </div>
            </div>
        </header>
    `;
};

const AdminMobileMenuDrawer = ({ isOpen, onClose, currentPage, onNavigate, user }) => {
    if (!isOpen) return null;

    const handleNavigate = (page) => {
        onNavigate(page);
        onClose();
    };

    return html`
        <div className="fixed inset-0 z-[100] lg:hidden flex flex-col justify-end">
            <style>
                @keyframes slideUp {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }
                .animate-slide-up {
                    animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-fade-in {
                    animation: fadeIn 0.2s ease-out forwards;
                }
            </style>
            <!-- Backdrop -->
            <div 
                className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-fade-in"
                onClick=${onClose}
            ></div>
            
            <!-- Drawer -->
            <div className="relative bg-white dark:bg-midnight-950 rounded-t-3xl shadow-2xl h-[85vh] flex flex-col animate-slide-up">
                <!-- Handle -->
                <div className="flex justify-center p-3 shrink-0">
                    <div className="w-12 h-1.5 bg-gray-300 dark:bg-midnight-700 rounded-full"></div>
                </div>
                
                <div className="flex-1 overflow-y-auto no-scrollbar px-6 pb-20">
                    <!-- Platform -->
                    <div className="mb-6">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Platform</p>
                        <div className="space-y-1">
                            <button onClick=${() => handleNavigate('overview')} className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${currentPage === 'overview' ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 font-bold' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-midnight-900'}">
                                <${Icon} name="trending-up" size=${20} />
                                <span>Business Overview</span>
                            </button>
                            <button onClick=${() => handleNavigate('admin-transactions')} className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${currentPage === 'admin-transactions' ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 font-bold' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-midnight-900'}">
                                <${Icon} name="dollar-sign" size=${20} />
                                <span>Transaction Ledger</span>
                            </button>
                        </div>
                    </div>

                    <!-- Management -->
                    <div className="mb-6">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Management</p>
                        <div className="space-y-1">
                            <button onClick=${() => handleNavigate('approvals')} className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${currentPage === 'approvals' ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 font-bold' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-midnight-900'}">
                                <${Icon} name="check-square" size=${20} />
                                <span>Sender ID Approvals</span>
                            </button>
                            ${(user?.role === 'superadmin' || user?.permissions?.manage_platform) && html`
                                <button onClick=${() => handleNavigate('management')} className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${currentPage === 'management' ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 font-bold' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-midnight-900'}">
                                    <${Icon} name="grid" size=${20} />
                                    <span>Platform Management</span>
                                </button>
                                <button onClick=${() => handleNavigate('bugs')} className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${currentPage === 'bugs' ? 'bg-red-50 dark:bg-red-900/30 text-red-700 font-bold' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-midnight-900'}">
                                    <${Icon} name="alert-triangle" size=${20} />
                                    <span>Bug Reports</span>
                                </button>
                            `}
                            ${user?.role === 'superadmin' && html`
                                <button onClick=${() => handleNavigate('staff')} className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${currentPage === 'staff' ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 font-bold' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-midnight-900'}">
                                    <${Icon} name="users" size=${20} />
                                    <span>Staff Management</span>
                                </button>
                                <button onClick=${() => handleNavigate('users')} className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${currentPage === 'users' ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 font-bold' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-midnight-900'}">
                                    <${Icon} name="user-check" size=${20} />
                                    <span>Users Directory</span>
                                </button>
                            `}
                        </div>
                    </div>

                    <!-- God Mode -->
                    <div className="mb-6">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">God Mode</p>
                        <div className="space-y-1">
                            <button onClick=${() => handleNavigate('search')} className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${currentPage === 'search' ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 font-bold' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-midnight-900'}">
                                <${Icon} name="search" size=${20} />
                                <span>Global Search</span>
                            </button>
                            <button onClick=${() => handleNavigate('audit')} className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${currentPage === 'audit' ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 font-bold' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-midnight-900'}">
                                <${Icon} name="shield-check" size=${20} />
                                <span>Audit Logs</span>
                            </button>
                            <button onClick=${() => handleNavigate('announcements')} className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${currentPage === 'announcements' ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 font-bold' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-midnight-900'}">
                                <${Icon} name="megaphone" size=${20} />
                                <span>Announcements</span>
                            </button>
                            <button onClick=${() => handleNavigate('health')} className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${currentPage === 'health' ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 font-bold' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-midnight-900'}">
                                <${Icon} name="activity" size=${20} />
                                <span>System Health</span>
                            </button>
                            <button onClick=${() => handleNavigate('settings')} className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${currentPage === 'settings' ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 font-bold' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-midnight-900'}">
                                <${Icon} name="user" size=${20} />
                                <span>My Account</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
};

const BottomNav = ({ currentPage, onNavigate }) => {
    const { user } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    
    return html`
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[90] bg-white/90 dark:bg-midnight-950/90 backdrop-blur-xl border-t border-gray-100 dark:border-midnight-800 px-6 py-3 pb-safe">
            <div className="flex items-center justify-between max-w-md mx-auto">
                <button onClick=${() => onNavigate('overview')} className="flex flex-col items-center gap-1 transition-colors ${currentPage === 'overview' ? 'text-primary-600 font-bold' : 'text-gray-400'}">
                    <${Icon} name="trending-up" size=${20} />
                    <span className="text-[10px] uppercase tracking-wider">Overview</span>
                </button>
                
                <button onClick=${() => onNavigate('admin-transactions')} className="flex flex-col items-center gap-1 transition-colors ${currentPage === 'admin-transactions' ? 'text-primary-600 font-bold' : 'text-gray-400'}">
                    <${Icon} name="dollar-sign" size=${20} />
                    <span className="text-[10px] uppercase tracking-wider">Ledger</span>
                </button>
                
                <button onClick=${() => onNavigate('approvals')} className="flex flex-col items-center gap-1 transition-colors ${currentPage === 'approvals' ? 'text-primary-600 font-bold' : 'text-gray-400'}">
                    <${Icon} name="check-square" size=${20} />
                    <span className="text-[10px] uppercase tracking-wider">Approvals</span>
                </button>
                
                ${(user?.role === 'superadmin' || user?.permissions?.manage_platform) ? html`
                    <button onClick=${() => onNavigate('management')} className="flex flex-col items-center gap-1 transition-colors ${currentPage === 'management' ? 'text-primary-600 font-bold' : 'text-gray-400'}">
                        <${Icon} name="grid" size=${20} />
                        <span className="text-[10px] uppercase tracking-wider">Manage</span>
                    </button>
                ` : html`
                    <button onClick=${() => onNavigate('search')} className="flex flex-col items-center gap-1 transition-colors ${currentPage === 'search' ? 'text-primary-600 font-bold' : 'text-gray-400'}">
                        <${Icon} name="search" size=${20} />
                        <span className="text-[10px] uppercase tracking-wider">Search</span>
                    </button>
                `}
                
                <button onClick=${() => setIsMenuOpen(true)} className="flex flex-col items-center gap-1 transition-colors ${isMenuOpen ? 'text-primary-600 font-bold' : 'text-gray-400'}">
                    <${Icon} name="menu" size=${20} />
                    <span className="text-[10px] uppercase tracking-wider">More</span>
                </button>
            </div>
        </nav>
        
        <${AdminMobileMenuDrawer} 
            isOpen=${isMenuOpen} 
            onClose=${() => setIsMenuOpen(false)} 
            currentPage=${currentPage}
            onNavigate=${onNavigate}
            user=${user}
        />
    `;
};

const AdminSidebar = ({ currentPage, onNavigate }) => {
    const { user, logout } = useAuth();
    const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
    
    useEffect(() => {
        const handleThemeChange = () => setIsDark(document.documentElement.classList.contains('dark'));
        window.addEventListener('themechange', handleThemeChange);
        return () => window.removeEventListener('themechange', handleThemeChange);
    }, []);

    const toggleTheme = () => {
        const root = document.documentElement;
        if (root.classList.contains('dark')) {
            root.classList.remove('dark');
            localStorage.setItem('admin_theme', 'light');
            setIsDark(false);
        } else {
            root.classList.add('dark');
            localStorage.setItem('admin_theme', 'dark');
            setIsDark(true);
        }
        window.dispatchEvent(new Event('themechange'));
    };
    
    return html`
        <aside className="hidden lg:flex lg:flex-col lg:w-72 bg-white dark:bg-midnight-950 border-r border-gray-200 dark:border-midnight-800 h-screen sticky top-0 transition-colors overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-midnight-800 flex justify-center flex-shrink-0">
                <img src="assets/NEXRA_IconBeside.png" alt="NEXRA Admin" className="h-14 lg:h-16 object-contain" />
            </div>

            <nav className="flex-1 p-4 space-y-4 overflow-y-auto no-scrollbar">
                <div>
                     <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Platform</p>
                     <button
                        onClick=${() => onNavigate('overview')}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentPage === 'overview'
                            ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 font-bold'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}"
                    >
                        <${Icon} name="trending-up" size=${20} />
                        <span>Business Overview</span>
                    </button>
                    <button
                        onClick=${() => onNavigate('admin-transactions')}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentPage === 'admin-transactions'
                            ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 font-bold'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}"
                    >
                        <${Icon} name="dollar-sign" size=${20} />
                        <span>Transaction Ledger</span>
                    </button>
                     <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 mt-4">Management</p>
                     <button
                        onClick=${() => onNavigate('approvals')}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentPage === 'approvals'
                            ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 font-bold'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}"
                    >
                        <${Icon} name="check-square" size=${20} />
                        <span>Sender ID Approvals</span>
                    </button>
                    ${(user?.role === 'superadmin' || user?.permissions?.manage_platform) && html`
                        <button
                            onClick=${() => onNavigate('management')}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentPage === 'management'
                                ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 font-bold'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}"
                        >
                            <${Icon} name="grid" size=${20} />
                            <span>Platform Management</span>
                        </button>
                        <button
                            onClick=${() => onNavigate('bugs')}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentPage === 'bugs'
                                ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 font-bold'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}"
                        >
                            <${Icon} name="alert-triangle" size=${20} />
                            <span>Bug Reports</span>
                        </button>
                    `}
                    ${user?.role === 'superadmin' && html`
                        <button
                            onClick=${() => onNavigate('staff')}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentPage === 'staff'
                                ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 font-bold'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}"
                        >
                            <${Icon} name="users" size=${20} />
                            <span>Staff Management</span>
                        </button>
                        <button
                            onClick=${() => onNavigate('users')}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentPage === 'users'
                                ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 font-bold'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}"
                        >
                            <${Icon} name="user-check" size=${20} />
                            <span>Users Directory</span>
                        </button>
                    `}
                     <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 mt-4">God Mode</p>
                     <button
                        onClick=${() => onNavigate('search')}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentPage === 'search'
                            ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 font-bold'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}"
                    >
                        <${Icon} name="search" size=${20} />
                        <span>Global Search</span>
                    </button>
                    <button
                        onClick=${() => onNavigate('audit')}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentPage === 'audit'
                            ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 font-bold'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}"
                    >
                        <${Icon} name="shield-check" size=${20} />
                        <span>Audit Logs</span>
                    </button>
                    <button
                        onClick=${() => onNavigate('announcements')}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentPage === 'announcements'
                            ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 font-bold'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}"
                    >
                        <${Icon} name="megaphone" size=${20} />
                        <span>Announcements</span>
                    </button>
                    <button
                        onClick=${() => onNavigate('health')}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentPage === 'health'
                            ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 font-bold'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}"
                    >
                        <${Icon} name="activity" size=${20} />
                        <span>System Health</span>
                    </button>
                </div>
            </nav>
            
            <div className="p-4 border-t border-gray-100 dark:border-midnight-800">
                <div className="mb-4 px-4 py-3 bg-gray-50 dark:bg-midnight-900 rounded-xl">
                    <p className="text-xs font-bold text-gray-900 dark:text-white truncate">${user?.full_name}</p>
                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-tighter mt-0.5">${user?.role === 'superadmin' ? 'PLATFORM SUPERADMIN' : 'OFFICIAL STAFF MEMBER'}</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick=${toggleTheme}
                        className="flex items-center justify-center p-3 rounded-lg text-gray-500 hover:bg-gray-50 dark:hover:bg-midnight-800 transition-colors"
                        title="Toggle theme"
                    >
                        <${Icon} name=${isDark ? 'sun' : 'moon'} size=${20} />
                    </button>
                    <button
                        onClick=${logout}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                        <${Icon} name="log-out" size=${20} />
                        <span className="font-bold">Sign Out</span>
                    </button>
                </div>
            </div>
        </aside>
    `;
};

import { AdminBugsPage } from './src/pages/AdminBugsPage.js';

import { AdminUsersPage } from './src/pages/AdminUsersPage.js';

const AdminApp = () => {
    const { user, loading, logout } = useAuth();
    const [currentPage, setCurrentPage] = useState('approvals');

    useEffect(() => {
        // Default to dark mode if not explicitly set to light
        const savedTheme = localStorage.getItem('admin_theme');
        if (savedTheme === 'light') {
            document.documentElement.classList.remove('dark');
        } else {
            document.documentElement.classList.add('dark');
            if (!savedTheme) {
                localStorage.setItem('admin_theme', 'dark');
            }
        }
    }, []);

    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash.slice(1) || '/approvals';
            const page = hash.split('/')[1] || 'approvals';
            setCurrentPage(page);
        };
        window.addEventListener('hashchange', handleHashChange);
        handleHashChange();
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    if (loading) return null;

    if (!user) {
        if (currentPage === 'register') return html`<${AdminRegisterPage} />`;
        return html`<${AdminLoginPage} />`;
    }

    const { showToast } = useToast();

    const renderPage = () => {
        switch (currentPage) {
            case 'overview': return html`<${BusinessOverviewPage} />`;
            case 'admin-transactions': return html`<${AdminTransactionsPage} showToast=${showToast} />`;
            case 'approvals': return html`<${AdminApprovalPage} />`;
            case 'management': return html`<${PlatformManagementPage} />`;
            case 'staff': return html`<${StaffManagementPage} />`;
            case 'users': return html`<${AdminUsersPage} />`;
            case 'search': return html`<${GlobalSearchPage} />`;
            case 'audit': return html`<${AuditLogPage} />`;
            case 'announcements': return html`<${AnnouncementsPage} />`;
            case 'health': return html`<${SystemHealthPage} />`;
            case 'bugs': return html`<${AdminBugsPage} />`;
            case 'settings': return html`
                <div className="p-4 space-y-4">
                    <${Card} className="p-6">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-16 h-16 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-xl font-black text-primary-600">
                                ${user?.full_name?.charAt(0)}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold dark:text-white">${user.full_name}</h2>
                                <p className="text-sm text-gray-500 uppercase tracking-widest font-bold">${user.role}</p>
                            </div>
                        </div>
                        <${Button} variant="danger" className="w-full" onClick=${logout}>
                            <${Icon} name="log-out" size=${18} />
                            Sign Out
                        </${Button}>
                    </${Card}>
                </div>
            `;
            default: return html`<${AdminApprovalPage} />`;
        }
    };

    const getPageTitle = () => {
        switch (currentPage) {
            case 'overview': return 'Business Overview';
            case 'admin-transactions': return 'Transaction Ledger';
            case 'approvals': return 'Sender ID Approvals';
            case 'management': return 'Platform Management';
            case 'staff': return 'Staff Management';
            case 'users': return 'Users Directory';
            case 'search': return 'Global Search';
            case 'audit': return 'Audit Logs';
            case 'announcements': return 'Announcements';
            case 'health': return 'System Health';
            case 'bugs': return 'Bug Reports';
            case 'settings': return 'Admin Settings';
            default: return 'Admin Console';
        }
    }

    return html`
        <div className="flex h-screen bg-[#f8fafc] dark:bg-midnight-950 overflow-hidden">
            <${AdminSidebar} currentPage=${currentPage} onNavigate=${(page) => window.location.href = `admin.html#/${page}`} />
            
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                <${MobileHeader} title=${getPageTitle()} />
                
                <main className="flex-1 p-4 lg:p-8 overflow-y-auto pb-24 lg:pb-8 no-scrollbar">
                    <div className="max-w-6xl mx-auto">
                        ${renderPage()}
                    </div>
                </main>
                
                <${BottomNav} currentPage=${currentPage} onNavigate=${(page) => window.location.href = `admin.html#/${page}`} />
            </div>
        </div>
    `;
};

// ============================================================================
// RENDER
// ============================================================================

const root = createRoot(document.getElementById('root'));
root.render(html`
    <${AuthProvider}>
        <${ToastProvider}>
            <${AdminApp} />
        </${ToastProvider}>
    </${AuthProvider}>
`);

setTimeout(() => hideSplashScreen(), 800);
