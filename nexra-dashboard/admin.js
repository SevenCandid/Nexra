import { ConfirmModal } from './src/components/ui/ConfirmModal.js';
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
    <${Card} className="p-5 flex items-start gap-4 hover:shadow-lg transition-shadow duration-200">
        <div className="p-3 rounded-xl flex-shrink-0 ${colorBg}">
            <${Icon} name=${icon} size=${22} className=${colorIcon} />
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-gray-500 dark:text-midnight-400 uppercase tracking-widest truncate">${label}</p>
            <h3 className="text-xl font-black text-gray-900 dark:text-white mt-1">
                ${prefix}${typeof value === 'number' ? value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : value}
            </h3>
            ${sub && html`<p className="text-[10px] text-gray-400 dark:text-midnight-500 mt-1 font-medium truncate">${sub}</p>`}
        </div>
    </${Card}>
`;

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

const BusinessOverviewPage = () => {
    const { showToast } = useToast();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiClient.get('/analytics/admin/overview')
            .then(res => { setData(res.data); setLoading(false); })
            .catch(() => {
                showToast('Failed to load financial data', 'error');
                setLoading(false);
            });
    }, []);

    if (loading) return html`
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 text-sm gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
            Loading platform financials...
        </div>
    `;

    if (!data) return html`<div className="p-12 text-center text-gray-500">No overview data available.</div>`;
    
    const { financials, platform, recent_topups, trends } = data;
    const deliveryRate = platform.total_messages > 0
        ? ((platform.delivered / platform.total_messages) * 100).toFixed(1)
        : '0.0';

    return html`
        <div className="space-y-6 fade-in max-w-6xl mx-auto pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold dark:text-white">Business Overview</h2>
                    <p className="text-sm text-gray-500 dark:text-midnight-400 mt-1">Real-time platform financial health and message volume.</p>
                </div>
            </div>

            <!-- Trend Charts -->
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <${TrendChart} data=${trends} dataKey="revenue" label="Daily Revenue" color="emerald" prefix="GH₵ " />
                <${TrendChart} data=${trends} dataKey="sms_count" label="Daily SMS Traffic" color="blue" />
            </div>

            <!-- KPI Cards -->
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <${AdminStatCard}
                    label="Total Revenue" value=${financials.total_revenue} prefix="GH₵ "
                    sub="All-time user top-ups" icon="trending-up"
                    colorBg="bg-emerald-50 dark:bg-emerald-900/20" colorIcon="text-emerald-600 dark:text-emerald-400"
                />
                <${AdminStatCard}
                    label="User Liability" value=${financials.total_liability} prefix="GH₵ "
                    sub="Current wallet balances" icon="shield-alert"
                    colorBg="bg-amber-50 dark:bg-amber-900/20" colorIcon="text-amber-600 dark:text-amber-400"
                />
                <${AdminStatCard}
                    label="Network Cost" value=${financials.total_network_cost} prefix="GH₵ "
                    sub="Estimated provider costs" icon="activity"
                    colorBg="bg-rose-50 dark:bg-rose-900/20" colorIcon="text-rose-600 dark:text-rose-400"
                />
                <${AdminStatCard}
                    label="Est. Net Profit" value=${financials.estimated_profit} prefix="GH₵ "
                    sub="Revenue minus costs" icon="briefcase"
                    colorBg="bg-blue-50 dark:bg-blue-900/20" colorIcon="text-blue-600 dark:text-blue-400"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <${Card} className="p-6">
                        <h3 className="text-xs font-black text-gray-400 dark:text-midnight-500 uppercase tracking-widest mb-4">Platform Performance</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <${PlatformRow} label="Total Organizations" value=${platform.total_organizations} icon="building" />
                            <${PlatformRow} label="Total Messages" value=${platform.total_messages} icon="send" />
                            <${PlatformRow} label="Delivered" value=${platform.delivered} icon="check-circle" />
                            <${PlatformRow} label="Failed" value=${platform.failed} icon="x-circle" />
                        </div>
                        
                        <div className="mt-6 pt-6 border-t border-gray-100 dark:border-midnight-800">
                            <div className="flex justify-between text-xs font-bold text-gray-500 mb-2">
                                <span>Global Delivery Rate</span>
                                <span className="text-emerald-500 font-black">${deliveryRate}%</span>
                            </div>
                            <div className="w-full h-2 bg-gray-100 dark:bg-midnight-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-1000"
                                    style=${{ width: `${deliveryRate}%` }}
                                ></div>
                            </div>
                        </div>
                    </${Card}>

                    <${Card} className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-black text-gray-400 dark:text-midnight-500 uppercase tracking-widest">Recent Top-Ups</h3>
                            <span className="text-[10px] font-bold text-gray-300">Live feed</span>
                        </div>
                        ${recent_topups.length === 0 ? html`
                            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                                <${Icon} name="inbox" size=${48} className="mb-3 opacity-20" />
                                <p className="text-xs font-medium uppercase tracking-widest">No recent transactions</p>
                            </div>
                        ` : html`
                            <div className="space-y-3">
                                ${recent_topups.map(t => html`
                                    <div key=${t.id} className="flex items-center justify-between p-4 bg-gray-50/50 dark:bg-midnight-900/30 rounded-2xl border border-gray-100 dark:border-midnight-800/50">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center">
                                                <${Icon} name="arrow-down-left" size=${16} className="text-emerald-600 dark:text-emerald-400" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">${t.description}</p>
                                                <p className="text-[10px] text-gray-400 dark:text-midnight-500 mt-0.5">${new Date(t.created_at).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                            </div>
                                        </div>
                                        <span className="text-sm font-black text-emerald-500">+GH₵${t.amount.toFixed(2)}</span>
                                    </div>
                                `)}
                            </div>
                        `}
                    </${Card}>
                </div>

                <div className="space-y-6">
                    <${Card} className="p-6">
                        <h3 className="text-xs font-black text-gray-400 dark:text-midnight-500 uppercase tracking-widest mb-6">Wallet Distribution</h3>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-primary-500"></div>
                                        <span className="text-xs text-gray-500 font-bold uppercase tracking-tighter">PAYG Credits</span>
                                    </div>
                                    <span className="text-sm font-black dark:text-white">GH₵ ${financials.distribution?.payg.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                                        <span className="text-xs text-gray-500 font-bold uppercase tracking-tighter">Subscription</span>
                                    </div>
                                    <span className="text-sm font-black dark:text-white">GH₵ ${financials.distribution?.subscription.toLocaleString()}</span>
                                </div>
                            </div>
                            
                            <div className="flex h-4 w-full bg-gray-100 dark:bg-midnight-800 rounded-full overflow-hidden shadow-inner">
                                ${(() => {
                                    const total = financials.distribution?.payg + financials.distribution?.subscription || 1;
                                    const paygPerc = (financials.distribution?.payg / total) * 100;
                                    return html`
                                        <div className="h-full bg-primary-500 shadow-lg shadow-primary-500/20" style=${{ width: `${paygPerc}%` }}></div>
                                        <div className="h-full bg-amber-500 shadow-lg shadow-amber-500/20" style=${{ width: `${100 - paygPerc}%` }}></div>
                                    `;
                                })()}
                            </div>
                            
                            <div className="p-4 bg-primary-50 dark:bg-primary-900/10 rounded-2xl border border-primary-100 dark:border-primary-900/20 mt-4">
                                <p className="text-[10px] text-primary-700 dark:text-primary-400 font-bold uppercase tracking-widest">Revenue Impact</p>
                                <p className="text-xs text-primary-600/80 dark:text-primary-400/60 mt-1">PAYG accounts for <span className="font-bold text-primary-700 dark:text-primary-300">${((financials.distribution?.payg / (financials.distribution?.payg + financials.distribution?.subscription || 1)) * 100).toFixed(0)}%</span> of current platform liability.</p>
                            </div>
                        </div>
                    </${Card}>
                </div>
            </div>
        </div>
    `;
};

const AdminApprovalPage = () => {
    const { showToast } = useToast();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('pending'); // 'pending' or 'history'
    const [detailRequest, setDetailRequest] = useState(null);

    useEffect(() => {
        fetchRequests();
    }, [tab]);

    useEffect(() => {
        if (!detailRequest) return undefined;
        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                setDetailRequest(null);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [detailRequest]);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const endpoint = tab === 'pending' ? '/sender-ids/admin/pending' : '/sender-ids/admin/history';
            const response = await apiClient.get(endpoint);
            setRequests(response.data);
        } catch (error) {
            console.error('Failed to fetch requests:', error);
            showToast('Failed to load requests', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (id, status) => {
        let comment = null;
        if (status === 'rejected') {
            comment = prompt('Reason for rejection (required):');
            if (comment === null || comment.trim() === '') return; // cancelled or empty
        } else if (status === 'approved') {
            comment = prompt('Optional approval note (press OK to skip):') || null;
        } else if (status === 'need_verification') {
            comment = prompt('Optional verification note (press OK to skip):') || null;
        }

        try {
            await apiClient.patch(`/sender-ids/${id}/status`, { status, admin_comment: comment });
            showToast(`Sender ID ${status}!`, 'success');
            setDetailRequest((current) => (current?.id === id ? null : current));
            fetchRequests();
        } catch (error) {
            showToast('Action failed', 'error');
        }
    };

    return html`
        <div className="space-y-4 lg:space-y-6 fade-in max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-2xl font-bold dark:text-white">Sender ID Approvals</h2>
                <div className="flex bg-gray-100 dark:bg-midnight-800 p-1 rounded-xl">
                    <button
                        onClick=${() => setTab('pending')}
                        className="px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${tab === 'pending' ? 'bg-white dark:bg-primary-600 text-primary-600 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}"
                    >
                        Pending
                    </button>
                    <button
                        onClick=${() => setTab('history')}
                        className="px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${tab === 'history' ? 'bg-white dark:bg-primary-600 text-primary-600 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}"
                    >
                        History
                    </button>
                </div>
            </div>

            ${loading ? html`
                <div className="p-12 text-center">
                    <div className="animate-spin inline-block text-primary-600"><${Icon} name="loader-2" size=${32} /></div>
                    <p className="text-sm text-gray-500 mt-4">Fetching requests...</p>
                </div>
            ` : requests.length === 0 ? html`
                <${Card} className="p-12 text-center text-gray-500 border-none lg:border">
                    <${Icon} name="check-circle" size=${64} className="mx-auto mb-4 text-green-500/20" />
                    <p className="text-lg font-medium">No ${tab} requests</p>
                    <p className="text-sm">Everything is up to date.</p>
                </${Card}>
            ` : html`
                <div className="grid gap-3 lg:gap-4">
                    ${requests.map((req) => html`
                        <${Card} key=${req.id} className="p-5 lg:p-6 flex flex-col md:flex-row md:items-center justify-between bg-white dark:bg-midnight-900 border-gray-100 dark:border-midnight-800 shadow-sm animate-pop-in gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-xl lg:text-2xl font-black text-gray-900 dark:text-white tracking-widest uppercase">${req.sender_id}</h3>
                                    <${Badge} variant=${req.status === 'approved' ? 'success' : req.status === 'need_verification' ? 'warning' : req.status === 'rejected' ? 'error' : 'default'}>
                                        ${req.status === 'approved' ? 'Approved ✅' : req.status === 'need_verification' ? 'Need Verification 🟡' : req.status === 'rejected' ? 'Rejected ❌' : 'Pending'}
                                    </${Badge}>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                    <span className="text-[10px] font-bold text-primary-700 dark:text-primary-400 uppercase px-2 py-0.5 bg-primary-50 dark:bg-primary-900/30 rounded">${req.organization_name || `Org #${req.organization_id}`}</span>
                                    <span className="text-xs text-gray-400">•</span>
                                    <span className="text-xs text-gray-500">${new Date(req.created_at).toLocaleString()}</span>
                                </div>
                                ${req.admin_comment && html`
                                    <div className="mt-3 p-3 bg-gray-50 dark:bg-midnight-800 rounded-xl text-xs text-gray-600 dark:text-midnight-300 border border-gray-100 dark:border-midnight-800">
                                        <span className="font-bold text-gray-400 mr-2 uppercase">Reason:</span>
                                        ${req.admin_comment}
                                    </div>
                                `}
                            </div>
                            
                            <div className="flex flex-wrap gap-2 w-full md:w-auto">
                                <${Button} variant="outline" size="sm" className="flex-1 md:flex-none text-[10px] uppercase border-gray-300 dark:border-midnight-700" onClick=${() => setDetailRequest(req)}>
                                    View Details
                                </${Button}>
                                ${req.status === 'pending' && html`
                                    <${Button} variant="ghost" size="sm" className="flex-1 md:flex-none text-[10px] uppercase text-amber-700 hover:bg-amber-50" onClick=${() => handleAction(req.id, 'need_verification')}>
                                        Need Verification
                                    </${Button}>
                                    <${Button} variant="ghost" size="sm" className="flex-1 md:flex-none text-rose-600 hover:bg-rose-50 text-[10px] uppercase" onClick=${() => handleAction(req.id, 'rejected')}>
                                        Reject
                                    </${Button}>
                                    <${Button} size="sm" className="flex-1 md:flex-none text-[10px] uppercase" onClick=${() => handleAction(req.id, 'approved')}>
                                        Approve
                                    </${Button}>
                                `}
                            </div>
                        </${Card}>
                    `)}
                </div>
            `}
            ${detailRequest && html`
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                    <button
                        type="button"
                        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
                        onClick=${() => setDetailRequest(null)}
                        aria-label="Close sender ID details"
                    ></button>

                    <div className="relative w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-3xl bg-white dark:bg-midnight-950 shadow-2xl border border-gray-100 dark:border-midnight-800">
                        <div className="p-6 border-b border-gray-100 dark:border-midnight-800 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                            <div className="space-y-2">
                                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-primary-600">Sender ID Application Snapshot</p>
                                <div className="flex flex-wrap items-center gap-3">
                                    <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-widest uppercase">${detailRequest.sender_id}</h3>
                                    <${Badge} variant=${detailRequest.status === 'approved' ? 'success' : detailRequest.status === 'need_verification' ? 'warning' : detailRequest.status === 'rejected' ? 'error' : 'default'}>
                                        ${detailRequest.status === 'approved' ? 'Approved ✅' : detailRequest.status === 'need_verification' ? 'Need Verification 🟡' : detailRequest.status === 'rejected' ? 'Rejected ❌' : 'Pending'}
                                    </${Badge}>
                                </div>
                                <p className="text-sm text-gray-500 dark:text-midnight-400">
                                    Request #${detailRequest.id} · Submitted ${new Date(detailRequest.created_at).toLocaleString()}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick=${() => setDetailRequest(null)}
                                className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-gray-200 dark:border-midnight-800 text-gray-500 dark:text-midnight-300 hover:bg-gray-50 dark:hover:bg-midnight-900 transition-colors"
                                aria-label="Close details"
                            >
                                <${Icon} name="x" size=${18} />
                            </button>
                        </div>

                        <div className="max-h-[calc(90vh-110px)] overflow-y-auto p-6 space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm">
                                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-midnight-900/50 border border-gray-100 dark:border-midnight-800">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Organization</p>
                                    <p className="font-medium text-gray-900 dark:text-white">${detailRequest.organization_name || `Org #${detailRequest.organization_id}`}</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-midnight-900/50 border border-gray-100 dark:border-midnight-800">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Official Email</p>
                                    <p className="font-medium text-gray-900 dark:text-white">${detailRequest.official_email || 'Not provided'}</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-midnight-900/50 border border-gray-100 dark:border-midnight-800">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Company / Username</p>
                                    <p className="font-medium text-gray-900 dark:text-white">${detailRequest.company_name || detailRequest.username || 'Not provided'}</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-midnight-900/50 border border-gray-100 dark:border-midnight-800">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Website / Social</p>
                                    <p className="font-medium text-gray-900 dark:text-white">${detailRequest.website_or_social || 'Not provided'}</p>
                                </div>
                                <div className="md:col-span-2 p-4 rounded-2xl bg-gray-50 dark:bg-midnight-900/50 border border-gray-100 dark:border-midnight-800">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Use Case</p>
                                    <p className="font-medium text-gray-900 dark:text-white whitespace-pre-wrap">${detailRequest.use_case || 'Not provided'}</p>
                                </div>
                                <div className="md:col-span-2 p-4 rounded-2xl bg-gray-50 dark:bg-midnight-900/50 border border-gray-100 dark:border-midnight-800">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Documents</p>
                                    <div className="flex flex-wrap gap-2 text-xs">
                                        <span className="px-2 py-1 rounded-full bg-white dark:bg-midnight-950 border border-gray-200 dark:border-midnight-800">Certificate: ${detailRequest.registration_certificate ? 'Provided' : 'Not provided'}</span>
                                        <span className="px-2 py-1 rounded-full bg-white dark:bg-midnight-950 border border-gray-200 dark:border-midnight-800">Authorization: ${detailRequest.authorization_letter ? 'Provided' : 'Not provided'}</span>
                                    </div>
                                </div>
                                <div className="md:col-span-2 p-4 rounded-2xl bg-gray-50 dark:bg-midnight-900/50 border border-gray-100 dark:border-midnight-800">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Admin Comment</p>
                                    <p className="font-medium text-gray-900 dark:text-white whitespace-pre-wrap">${detailRequest.admin_comment || 'No admin note yet'}</p>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center">
                                <div className="flex flex-wrap gap-2">
                                    <${Button} size="sm" onClick=${() => handleAction(detailRequest.id, 'approved')} className="text-[10px] uppercase">Approve</${Button}>
                                    <${Button} size="sm" variant="outline" onClick=${() => handleAction(detailRequest.id, 'need_verification')} className="text-[10px] uppercase border-amber-300 text-amber-700 dark:text-amber-300">Need Verification</${Button}>
                                    <${Button} size="sm" variant="ghost" className="text-[10px] uppercase text-rose-600 hover:bg-rose-50" onClick=${() => handleAction(detailRequest.id, 'rejected')}>Reject</${Button}>
                                </div>
                                <button
                                    type="button"
                                    onClick=${() => setDetailRequest(null)}
                                    className="text-sm font-bold text-gray-500 dark:text-midnight-400 hover:text-gray-700 dark:hover:text-white transition-colors"
                                >
                                    Close details
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `}
        </div>
    `;
};

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

const AdminLoginPage = () => {
    const { login } = useAuth();
    const [loginType, setLoginType] = useState('staff'); // 'staff' or 'master'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const userData = await login(email, password);
            // After login, fetchUser runs and sets user — check role expectation
            // fetchUser already logs out non-superadmins, so we just redirect
            window.location.href = 'admin.html#/approvals';
        } catch (err) {
            setError(err.response?.data?.detail || 'Invalid credentials');
        } finally {
            setLoading(false);
        }
    };

    return html`
        <${AuthLayout} isLogin=${true} loginType=${loginType}>
            <div className="flex bg-gray-100 dark:bg-midnight-800 p-1 rounded-xl mb-6">
                <button
                    type="button"
                    onClick=${() => { setLoginType('staff'); setError(''); }}
                    className="flex-1 py-2 text-xs font-bold rounded-lg transition-all ${loginType === 'staff' ? 'bg-white dark:bg-primary-600 text-primary-600 dark:text-white shadow-sm' : 'text-gray-500'}"
                >
                    Employee / Staff
                </button>
                <button
                    type="button"
                    onClick=${() => { setLoginType('master'); setError(''); }}
                    className="flex-1 py-2 text-xs font-bold rounded-lg transition-all ${loginType === 'master' ? 'bg-white dark:bg-primary-600 text-primary-600 dark:text-white shadow-sm' : 'text-gray-500'}"
                >
                    Master Admin
                </button>
            </div>

            <form onSubmit=${handleSubmit} className="space-y-4">
                ${error && html`<div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 animate-pop-in">${error}</div>`}

                <${Input}
                    label=${loginType === 'master' ? 'Master Admin Email' : 'Staff Email'}
                    type="email"
                    value=${email}
                    onChange=${(e) => setEmail(e.target.value)}
                    placeholder=${loginType === 'master' ? 'superadmin@nexra.com' : 'staff@nexra.com'}
                    required
                />
                <${Input}
                    label=${loginType === 'master' ? 'Master Password' : 'Staff Password'}
                    type="password"
                    value=${password}
                    onChange=${(e) => setPassword(e.target.value)}
                    required
                />

                <${Button} type="submit" disabled=${loading} className="w-full py-3 mt-4">
                    ${loading ? 'Verifying...' : loginType === 'master' ? 'Access Master Console' : 'Sign In to Staff Portal'}
                </${Button}>

                <p className="text-center text-sm text-gray-500 mt-4">
                    ${loginType === 'master'
                        ? html`New master admin? <a href="admin.html#/register" className="text-primary-600 font-bold">Register</a>`
                        : html`New staff member? <a href="admin.html#/register" className="text-primary-600 font-bold">Register with Staff ID</a>`
                    }
                </p>
                <div className="pt-4 border-t border-gray-100 dark:border-midnight-800 text-center">
                    <a href="index.html" className="text-xs text-gray-400 hover:text-primary-600 transition-colors">Return to Public App</a>
                </div>
            </form>
        </${AuthLayout}>
    `;
};

const AdminRegisterPage = () => {
    const { register } = useAuth();
    const [formData, setFormData] = useState({ full_name: '', organization_name: 'NEXRA INTERNAL', email: '', password: '', admin_secret: '', staff_id: '' });
    const [regType, setRegType] = useState('staff'); // 'staff' or 'master'
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const dataToSubmit = { ...formData };
            if (regType === 'staff') delete dataToSubmit.admin_secret;
            else delete dataToSubmit.staff_id;

            await register(dataToSubmit);
            window.location.href = 'admin.html#/approvals';
        } catch (err) {
            setError(err.response?.data?.detail || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    return html`
        <${AuthLayout} isLogin=${false}>
            <div className="flex bg-gray-100 dark:bg-midnight-800 p-1 rounded-xl mb-6">
                <button 
                    onClick=${() => setRegType('staff')}
                    className="flex-1 py-2 text-xs font-bold rounded-lg transition-all ${regType === 'staff' ? 'bg-white dark:bg-primary-600 text-primary-600 dark:text-white shadow-sm' : 'text-gray-500'}"
                >
                    Employee / Staff
                </button>
                <button 
                    onClick=${() => setRegType('master')}
                    className="flex-1 py-2 text-xs font-bold rounded-lg transition-all ${regType === 'master' ? 'bg-white dark:bg-primary-600 text-primary-600 dark:text-white shadow-sm' : 'text-gray-500'}"
                >
                    Master Admin
                </button>
            </div>

            <form onSubmit=${handleSubmit} className="space-y-4">
                ${error && html`<div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">${error}</div>`}
                <${Input} label="Full Name" name="full_name" value=${formData.full_name} onChange=${handleChange} required />
                <${Input} label="Official Email" name="email" type="email" value=${formData.email} onChange=${handleChange} required />
                <${Input} label="Access Password" name="password" type="password" value=${formData.password} onChange=${handleChange} required />
                
                ${regType === 'master' ? html`
                    <${Input} 
                        label="MASTER SECRET KEY" 
                        name="admin_secret" 
                        type="password" 
                        value=${formData.admin_secret} 
                        onChange=${handleChange} 
                        placeholder="Required for platform master" 
                        required 
                    />
                ` : html`
                    <${Input} 
                        label="OFFICIAL STAFF ID" 
                        name="staff_id" 
                        value=${formData.staff_id} 
                        onChange=${handleChange} 
                        placeholder="e.g. NEX-742" 
                        required 
                    />
                `}

                <${Button} type="submit" disabled=${loading} className="w-full py-3 mt-4">
                    ${regType === 'master' ? 'Initialize Master Console' : 'Complete Staff Signup'}
                </${Button}>
                <p className="text-center text-sm text-gray-500 mt-4">
                    Already staff? <a href="admin.html#/login" className="text-primary-600 font-bold">Sign In</a>
                </p>
                <div className="pt-4 border-t border-gray-100 dark:border-midnight-800 text-center">
                    <a href="index.html" className="text-xs text-gray-400 hover:text-primary-600 transition-colors font-semibold">Back to Public Workspace</a>
                </div>
            </form>
        </${AuthLayout}>
    `;
};

// ============================================================================
// ADMIN LAYOUT
// ============================================================================

const StaffManagementPage = () => {
    const { showToast } = useToast();
    const [invites, setInvites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        fetchInvites();
    }, []);

    const fetchInvites = async () => {
        try {
            const response = await apiClient.get('/staff/invites');
            setInvites(response.data);
        } catch (error) {
            console.error('Failed to fetch invites:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            await apiClient.post('/staff/invites');
            showToast('Unique Staff ID generated successfully!', 'success');
            fetchInvites();
        } catch (error) {
            showToast('Generation failed: Only Master Admin can generate codes.', 'error');
        } finally {
            setGenerating(false);
        }
    };

    if (loading) return html`<div className="p-8 text-center animate-pulse">Loading Staff IDs...</div>`;

    return html`
        <div className="space-y-6 fade-in max-w-5xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold dark:text-white">Staff Management</h2>
                    <p className="text-sm text-gray-500 dark:text-midnight-400 mt-1">Generate and track secure signup IDs for your employees.</p>
                </div>
                <${Button} onClick=${handleGenerate} disabled=${generating}>
                    <${Icon} name="plus-circle" size=${18} />
                    ${generating ? 'Generating...' : 'Generate New Staff ID'}
                </${Button}>
            </div>

            <${Card} className="overflow-hidden border-none lg:border lg:border-gray-200 lg:dark:border-midnight-800 bg-transparent lg:bg-white lg:dark:bg-midnight-900/40 shadow-none lg:shadow-sm">
                <!-- Desktop Table -->
                <table className="hidden lg:table w-full">
                    <thead className="bg-gray-50 dark:bg-midnight-900/80 border-b border-gray-200 dark:border-midnight-800">
                        <tr>
                            <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Official Staff ID</th>
                            <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                            <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Created At</th>
                            <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Used By</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-midnight-800">
                        ${invites.length === 0 ? html`
                            <tr>
                                <td colSpan="4" className="px-6 py-12 text-center text-gray-400">
                                    No staff IDs generated yet. Click the button above to start.
                                </td>
                            </tr>
                        ` : invites.map((item) => html`
                            <tr key=${item.id} className="hover:bg-gray-50 dark:hover:bg-midnight-900/30 transition-colors">
                                <td className="px-6 py-4">
                                    <span className="font-mono text-lg font-black text-primary-600 dark:text-primary-400 tracking-wider">
                                        ${item.staff_id}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <${Badge} variant=${item.is_used ? 'default' : 'success'}>
                                        ${item.is_used ? 'Redeemed' : 'Ready / Active'}
                                    </${Badge}>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    ${new Date(item.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 text-sm font-medium dark:text-gray-300">
                                    ${item.is_used ? html`
                                        <div className="flex items-center gap-2">
                                            <${Icon} name="user-check" size=${16} className="text-primary-500" />
                                            Active User #${item.used_by_id}
                                        </div>
                                    ` : html`<span className="text-gray-300 italic">Unassigned</span>`}
                                </td>
                            </tr>
                        `)}
                    </tbody>
                </table>

                <!-- Mobile Card List -->
                <div className="lg:hidden space-y-4">
                    ${invites.length === 0 ? html`
                        <div className="p-12 text-center text-gray-400">No staff IDs found.</div>
                    ` : invites.map((item) => html`
                        <div key=${item.id} className="bg-white dark:bg-midnight-900/60 p-5 rounded-2xl border border-gray-100 dark:border-midnight-800 shadow-sm">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Staff ID</span>
                                    <span className="font-mono text-xl font-black text-primary-600 dark:text-primary-400 tracking-wider">${item.staff_id}</span>
                                </div>
                                <${Badge} variant=${item.is_used ? 'default' : 'success'}>${item.is_used ? 'Redeemed' : 'Active'}</${Badge}>
                            </div>
                            <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-midnight-800">
                                <div className="text-[10px] text-gray-400 font-medium">
                                    Created: ${new Date(item.created_at).toLocaleDateString()}
                                </div>
                                <div className="text-xs font-bold dark:text-gray-300">
                                    ${item.is_used ? `User #${item.used_by_id}` : 'Unassigned'}
                                </div>
                            </div>
                        </div>
                    `)}
                </div>
            </${Card}>
            
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 p-4 rounded-xl flex gap-4">
                <${Icon} name="shield-alert" size=${24} className="text-amber-600 flex-shrink-0" />
                <div className="text-xs text-amber-800 dark:text-amber-400">
                    <p className="font-bold mb-1 uppercase tracking-wider">Security Notice</p>
                    <p>Generated Staff IDs are strictly single-use. Do not share these publicly. Only provide them to trusted employees for their initial registration.</p>
                </div>
            </div>
        </div>
    `;
};

const PlatformManagementPage = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState('users'); // 'users' or 'orgs'
    const [data, setData] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const PAGE_SIZE = 20;
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setPage(0);
        fetchData(0);
    }, [activeTab]);

    const fetchData = async (pageNum = page) => {
        setLoading(true);
        try {
            const endpoint = activeTab === 'users' ? '/platform/users' : '/platform/organizations';
            const response = await apiClient.get(endpoint, {
                params: { skip: pageNum * PAGE_SIZE, limit: PAGE_SIZE }
            });
            // Handle both paginated {items,total} and legacy flat array responses
            const raw = response.data;
            if (raw && raw.items !== undefined) {
                setData(raw.items);
                setTotal(raw.total);
            } else {
                setData(Array.isArray(raw) ? raw : []);
                setTotal(Array.isArray(raw) ? raw.length : 0);
            }
        } catch (error) {
            showToast('Failed to fetch data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async (id, currentStatus) => {
        try {
            const endpoint = activeTab === 'users' ? `/platform/users/${id}` : `/platform/organizations/${id}`;
            await apiClient.patch(endpoint, { is_active: !currentStatus });
            showToast('Status updated successfully', 'success');
            fetchData();
        } catch (error) {
            showToast('Failed to update status', 'error');
        }
    };

    const handleTogglePermission = async (u, permission) => {
        try {
            const currentPerms = u.permissions || {};
            const newPerms = { ...currentPerms, [permission]: !currentPerms[permission] };
            await apiClient.patch(`/platform/users/${u.id}/permissions`, { permissions: newPerms });
            showToast('Permission delegated successfully', 'success');
            fetchData();
        } catch (error) {
            showToast('Delegation failed', 'error');
        }
    };

    const handlePromote = (u) => {
        setConfirmAction({
            open: true,
            title: 'Promote User?',
            message: `Promote ${u.email} to Superadmin? They will gain full platform access and management rights.`,
            onConfirm: async () => {
                try {
                    await apiClient.post(`/platform/users/${u.id}/promote`);
                    showToast(`${u.email} promoted to Superadmin!`, 'success');
                    setConfirmAction({ open: false });
                    fetchData();
                } catch (error) {
                    showToast(error.response?.data?.detail || 'Promotion failed', 'error');
                }
            }
        });
    };

    const handleImpersonate = (u) => {
        setConfirmAction({
            open: true,
            title: 'Impersonate User?',
            message: `Login as ${u.full_name}? This will grant you full access to their dashboard and account as if you were them.`,
            onConfirm: async () => {
                try {
                    const response = await apiClient.post(`/auth/admin/impersonate/${u.id}`);
                    const { access_token } = response.data;
                    const url = `index.html?impersonate_token=${access_token}#/dashboard`;
                    window.open(url, '_blank');
                    showToast(`Logged in as ${u.full_name}`, 'success');
                    setConfirmAction({ open: false });
                } catch (error) {
                    showToast('Impersonation failed', 'error');
                }
            }
        });
    };

    const [adjustmentModal, setAdjustmentModal] = useState({ open: false, org: null });
    const [adjAmount, setAdjAmount] = useState('');
    const [adjDesc, setAdjDesc] = useState('');
    const [adjLoading, setAdjLoading] = useState(false);

    const [planModal, setPlanModal] = useState({ open: false, org: null });
    const [selectedPlan, setSelectedPlan] = useState('');
    const [planLoading, setPlanLoading] = useState(false);

    const [confirmAction, setConfirmAction] = useState({ open: false, title: '', message: '', onConfirm: null });

    const handleAdjustBalance = async (e) => {
        e.preventDefault();
        if (!adjustmentModal.org) return;
        setAdjLoading(true);
        try {
            await apiClient.post('/billing/admin/adjust-balance', null, {
                params: {
                    organization_id: adjustmentModal.org.id,
                    amount: parseFloat(adjAmount),
                    description: adjDesc
                }
            });
            showToast('Balance adjusted successfully', 'success');
            setAdjustmentModal({ open: false, org: null });
            setAdjAmount('');
            setAdjDesc('');
            fetchData();
        } catch (error) {
            showToast(error.response?.data?.detail || 'Adjustment failed', 'error');
        } finally {
            setAdjLoading(false);
        }
    };

    const handleAssignPlan = async (e) => {
        if (e) e.preventDefault();
        if (!planModal.org) return;
        setPlanLoading(true);
        try {
            await apiClient.post('/billing/admin/assign-plan', null, {
                params: {
                    org_id: planModal.org.id,
                    plan_slug: selectedPlan || undefined
                }
            });
            showToast('Plan updated successfully', 'success');
            setPlanModal({ open: false, org: null });
            fetchData();
        } catch (error) {
            showToast(error.response?.data?.detail || 'Update failed', 'error');
        } finally {
            setPlanLoading(false);
        }
    };

    const handleDelete = (id, name) => {
        setConfirmAction({
            open: true,
            title: 'Delete Forever?',
            message: `Are you absolutely sure you want to delete ${name}? This action is irreversible and will remove all associated data.`,
            onConfirm: async () => {
                try {
                    const endpoint = activeTab === 'users' ? `/platform/users/${id}` : `/platform/organizations/${id}`;
                    await apiClient.delete(endpoint);
                    showToast('Deleted successfully', 'success');
                    setConfirmAction({ open: false });
                    fetchData();
                } catch (error) {
                    showToast(error.response?.data?.detail || 'Delete failed', 'error');
                }
            }
        });
    };

    const totalPages = Math.ceil(total / PAGE_SIZE);
    const handlePageChange = (newPage) => {
        setPage(newPage);
        fetchData(newPage);
    };

    return html`
        <div className="space-y-6 fade-in max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold dark:text-white">Platform Management</h2>
                    <p className="text-sm text-gray-500 dark:text-midnight-400 mt-1">Manage all users and organizations on the NEXRA platform.</p>
                </div>
            </div>

            <div className="flex bg-gray-100 dark:bg-midnight-900/50 p-1 rounded-2xl w-full sm:w-fit">
                <button 
                    onClick=${() => setActiveTab('users')}
                    className="flex-1 sm:px-8 py-2.5 text-xs font-bold rounded-xl transition-all ${activeTab === 'users' ? 'bg-white dark:bg-primary-600 text-primary-600 dark:text-white shadow-sm' : 'text-gray-500'}"
                >
                    Users
                </button>
                <button 
                    onClick=${() => setActiveTab('orgs')}
                    className="flex-1 sm:px-8 py-2.5 text-xs font-bold rounded-xl transition-all ${activeTab === 'orgs' ? 'bg-white dark:bg-primary-600 text-primary-600 dark:text-white shadow-sm' : 'text-gray-500'}"
                >
                    Organizations
                </button>
            </div>

            <${Card} className="overflow-hidden border-none lg:border lg:border-gray-200 lg:dark:border-midnight-800 bg-transparent lg:bg-white lg:dark:bg-midnight-900/40 shadow-none lg:shadow-sm">
                ${loading ? html`
                    <div className="p-20 text-center animate-pulse flex flex-col items-center gap-4">
                        <div className="animate-spin text-primary-500"><${Icon} name="loader-2" size=${32} /></div>
                        <p className="text-gray-400 font-medium">Fetching platform data...</p>
                    </div>
                ` : html`
                    <!-- Desktop Table -->
                    <div className="hidden lg:block overflow-x-auto no-scrollbar">
                        <table className="w-full text-left min-w-[900px]">
                            <thead className="bg-gray-50 dark:bg-midnight-900/80 border-b border-gray-100 dark:border-midnight-800">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">${activeTab === 'users' ? 'User' : 'Organization'}</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">${activeTab === 'users' ? 'Role' : 'Plan / Created'}</th>
                                    ${activeTab === 'users' && user?.role === 'superadmin' && html`<th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Delegation</th>`}
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-midnight-800">
                                ${data.length === 0 ? html`
                                    <tr><td colSpan="5" className="px-6 py-12 text-center text-gray-400">No records found.</td></tr>
                                ` : data.map((item) => html`
                                    <tr key=${item.id} className="hover:bg-gray-50/50 dark:hover:bg-midnight-900/20 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-midnight-800 flex items-center justify-center text-primary-600 font-bold text-sm shadow-inner">
                                                    ${(item.full_name || item.name || item.email || '?').charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-gray-900 dark:text-white truncate max-w-[200px]">${item.full_name || item.name}</p>
                                                    <p className="text-[10px] text-gray-400 truncate max-w-[200px]">${item.email || item.slug}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className=${`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter ${item.is_active ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'}`}>
                                                ${item.is_active ? 'Active' : 'Restricted'}
                                            </span>
                                        </td>
                                        ${activeTab === 'users' ? html`
                                            <td className="px-6 py-4">
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 bg-gray-50 dark:bg-midnight-800 px-2 py-1 rounded">${item.role}</span>
                                            </td>
                                        ` : html`
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[10px] font-black uppercase text-primary-600 bg-primary-50 dark:bg-primary-900/30 px-2 py-0.5 rounded w-fit">${item.plan_slug || 'payg'}</span>
                                                    <span className="text-[10px] text-gray-400">${new Date(item.created_at).toLocaleDateString()}</span>
                                                </div>
                                            </td>
                                        `}
                                        ${activeTab === 'users' && user?.role === 'superadmin' && html`
                                            <td className="px-6 py-4">
                                                ${item.role === 'staff' ? html`
                                                    <div className="flex items-center gap-2">
                                                        <button 
                                                            onClick=${() => handleTogglePermission(item, 'manage_sender_ids')}
                                                            title="Toggle Sender ID Management"
                                                            className=${`p-1.5 rounded-lg transition-all ${item.permissions?.manage_sender_ids ? 'bg-primary-500 text-white' : 'bg-gray-100 dark:bg-midnight-800 text-gray-400'}`}
                                                        >
                                                            <${Icon} name="check-square" size=${14} />
                                                        </button>
                                                        <button 
                                                            onClick=${() => handleTogglePermission(item, 'manage_platform')}
                                                            title="Toggle Platform Management"
                                                            className=${`p-1.5 rounded-lg transition-all ${item.permissions?.manage_platform ? 'bg-primary-500 text-white' : 'bg-gray-100 dark:bg-midnight-800 text-gray-400'}`}
                                                        >
                                                            <${Icon} name="grid" size=${14} />
                                                        </button>
                                                    </div>
                                                ` : html`<span className="text-[10px] text-gray-300 italic">None</span>`}
                                            </td>
                                        `}
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                ${activeTab === 'users' && html`
                                                    <${Button} size="sm" variant="ghost" className="h-8 !px-3 text-primary-600 hover:bg-primary-50" title="Login as this user" onClick=${() => handleImpersonate(item)}>
                                                        <${Icon} name="user-check" size=${14} />
                                                    </${Button}>
                                                `}
                                                ${activeTab === 'orgs' && user?.role === 'superadmin' && html`
                                                    <${Button} size="sm" variant="ghost" className="h-8 !px-3 text-emerald-600 hover:bg-emerald-50" title="Give Credit" onClick=${() => setAdjustmentModal({ open: true, org: item })}>
                                                        <${Icon} name="plus-circle" size=${14} />
                                                    </${Button}>
                                                    <${Button} size="sm" variant="ghost" className="h-8 !px-3 text-primary-600 hover:bg-primary-50" title="Plan" onClick=${() => { setPlanModal({ open: true, org: item }); setSelectedPlan(item.plan_slug || ''); }}>
                                                        <${Icon} name="credit-card" size=${14} />
                                                    </${Button}>
                                                `}
                                                ${activeTab === 'users' && user?.role === 'superadmin' && item.role !== 'superadmin' && html`
                                                    <${Button} size="sm" variant="ghost" className="h-8 !px-3 text-amber-600 hover:bg-amber-50" title="Promote" onClick=${() => handlePromote(item)}>
                                                        <${Icon} name="chevrons-up" size=${14} />
                                                    </${Button}>
                                                `}
                                                <${Button} size="sm" variant=${item.is_active ? 'secondary' : 'primary'} className="h-8 !px-3" onClick=${() => handleToggleStatus(item.id, item.is_active)}>
                                                    <${Icon} name=${item.is_active ? 'shield-off' : 'shield-check'} size=${14} />
                                                </${Button}>
                                                <${Button} size="sm" variant="ghost" className="h-8 w-8 !p-0 text-rose-500 hover:bg-rose-50" onClick=${() => handleDelete(item.id, item.full_name || item.name)}>
                                                    <${Icon} name="trash-2" size=${16} />
                                                </${Button}>
                                            </div>
                                        </td>
                                    </tr>
                                `)}
                            </tbody>
                        </table>
                    </div>

                    <!-- Mobile Card List -->
                    <div className="lg:hidden space-y-4">
                        ${data.length === 0 ? html`
                            <div className="p-12 text-center text-gray-400">No records found.</div>
                        ` : data.map((item) => html`
                            <div key=${item.id} className="bg-white dark:bg-midnight-900/60 p-5 rounded-2xl border border-gray-100 dark:border-midnight-800 shadow-sm">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-midnight-800 flex items-center justify-center text-primary-600 font-bold text-lg shadow-inner">
                                            ${(item.full_name || item.name || item.email || '?').charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-[150px]">${item.full_name || item.name}</p>
                                            <p className="text-[10px] text-gray-400 truncate max-w-[150px]">${item.email || item.slug}</p>
                                        </div>
                                    </div>
                                    <span className=${`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter ${item.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                        ${item.is_active ? 'Active' : 'Restricted'}
                                    </span>
                                </div>
                                
                                <div className="flex items-center gap-4 py-3 border-t border-gray-50 dark:border-midnight-800">
                                    ${activeTab === 'users' ? html`
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Role</p>
                                            <p className="text-xs font-bold dark:text-gray-300 mt-1 uppercase">${item.role}</p>
                                        </div>
                                    ` : html`
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Plan</p>
                                            <p className="text-xs font-black text-primary-600 mt-1 uppercase">${item.plan_slug || 'payg'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Created</p>
                                            <p className="text-xs font-medium text-gray-500 mt-1">${new Date(item.created_at).toLocaleDateString()}</p>
                                        </div>
                                    `}
                                </div>

                                <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-50 dark:border-midnight-800">
                                    ${activeTab === 'users' && html`
                                        <${Button} size="sm" variant="ghost" className="h-10 w-10 !p-0 text-primary-600" title="Impersonate" onClick=${() => handleImpersonate(item)}>
                                            <${Icon} name="user-check" size=${18} />
                                        </${Button}>
                                    `}
                                    ${activeTab === 'orgs' && user?.role === 'superadmin' && html`
                                        <${Button} size="sm" variant="ghost" className="h-10 w-10 !p-0 text-emerald-600" onClick=${() => setAdjustmentModal({ open: true, org: item })}>
                                            <${Icon} name="plus-circle" size=${18} />
                                        </${Button}>
                                        <${Button} size="sm" variant="ghost" className="h-10 w-10 !p-0 text-primary-600" onClick=${() => { setPlanModal({ open: true, org: item }); setSelectedPlan(item.plan_slug || ''); }}>
                                            <${Icon} name="credit-card" size=${18} />
                                        </${Button}>
                                    `}
                                    <${Button} size="sm" variant=${item.is_active ? 'secondary' : 'primary'} className="h-10 px-4 text-xs" onClick=${() => handleToggleStatus(item.id, item.is_active)}>
                                        <${Icon} name=${item.is_active ? 'shield-off' : 'shield-check'} size=${16} />
                                        ${item.is_active ? 'Restrict' : 'Activate'}
                                    </${Button}>
                                    <${Button} size="sm" variant="ghost" className="h-10 w-10 !p-0 text-rose-500" onClick=${() => handleDelete(item.id, item.full_name || item.name)}>
                                        <${Icon} name="trash-2" size=${18} />
                                    </${Button}>
                                </div>
                            </div>
                        `)}
                    </div>

                    ${totalPages > 1 && html`
                        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-midnight-800">
                            <span className="text-xs text-gray-500">Showing ${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, total)} of ${total}</span>
                            <div className="flex gap-2">
                                <${Button} size="sm" variant="secondary" onClick=${() => handlePageChange(page - 1)} disabled=${page === 0}>
                                    <${Icon} name="chevron-left" size=${14} /> Previous
                                </${Button}>
                                <${Button} size="sm" variant="secondary" onClick=${() => handlePageChange(page + 1)} disabled=${page >= totalPages - 1}>
                                    Next <${Icon} name="chevron-right" size=${14} />
                                </${Button}>
                            </div>
                        </div>
                    `}
                `}
            </${Card}>

            <${Modal} 
                isOpen=${adjustmentModal.open} 
                onClose=${() => setAdjustmentModal({ open: false, org: null })}
                title="Manual Credit Grant"
            >
                <form onSubmit=${handleAdjustBalance} className="space-y-4">
                    <p className="text-sm text-gray-500 mb-2">Manually give credits to: <span className="font-bold text-gray-900 dark:text-white">${adjustmentModal.org?.name}</span></p>
                    <div className="bg-emerald-50 dark:bg-emerald-900/10 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/20 mb-4">
                        <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-widest">Administrator Action</p>
                        <p className="text-xs text-emerald-600/80 dark:text-emerald-400/60 mt-1">This will instantly update the client's wallet balance. Positive values add credit, negative values subtract.</p>
                    </div>
                    <${Input} 
                        label="Amount to Grant (GHS)" 
                        type="number" 
                        step="0.01" 
                        placeholder="e.g. 100" 
                        value=${adjAmount}
                        onChange=${(e) => setAdjAmount(e.target.value)}
                        required
                    />
                    <${Input} 
                        label="Internal Reference / Reason" 
                        placeholder="Manual top-up for custom deal / support" 
                        value=${adjDesc}
                        onChange=${(e) => setAdjDesc(e.target.value)}
                        required
                    />
                    <div className="pt-4 flex gap-3">
                        <${Button} type="button" variant="ghost" className="flex-1" onClick=${() => setAdjustmentModal({ open: false, org: null })}>Cancel</${Button}>
                        <${Button} type="submit" variant="primary" className="flex-1 bg-emerald-600 hover:bg-emerald-700 border-none text-white" disabled=${adjLoading}>
                            ${adjLoading ? 'Granting...' : 'Grant Credits'}
                        </${Button}>
                    </div>
                </form>
            </${Modal}>

            <${Modal} 
                isOpen=${planModal.open} 
                onClose=${() => setPlanModal({ open: false, org: null })}
                title="Manage Organization Plan"
            >
                <form onSubmit=${handleAssignPlan} className="space-y-4">
                    <div className="p-4 bg-primary-50 dark:bg-primary-900/10 rounded-2xl border border-primary-100 dark:border-primary-900/20 mb-4">
                        <p className="text-[10px] text-primary-700 dark:text-primary-400 font-bold uppercase tracking-widest">Plan Management</p>
                        <p className="text-xs text-primary-600/80 dark:text-primary-400/60 mt-1">Forcefully assign or cancel a subscription plan for <span className="font-bold text-primary-700 dark:text-primary-300">${planModal.org?.name}</span>.</p>
                    </div>

                    <div className="space-y-3">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Select New Plan</label>
                        <div className="grid grid-cols-1 gap-2">
                            ${[
                                { id: '', name: 'No Plan / Cancel Plan', desc: 'Remove all subscription benefits' },
                                { id: 'payg', name: 'Pay As You Go', desc: 'Standard usage-based pricing' },
                                { id: 'starter', name: 'Starter Plan', desc: 'GHS 25 / Month - 500 Credits' },
                                { id: 'enterprise', name: 'Enterprise Plan', desc: 'GHS 50 / Month - 1,250 Credits' }
                            ].map(p => html`
                                <button
                                    type="button"
                                    onClick=${() => setSelectedPlan(p.id)}
                                    className=${`flex flex-col items-start p-4 rounded-2xl border transition-all text-left ${selectedPlan === p.id ? 'bg-primary-50 border-primary-500 ring-1 ring-primary-500 dark:bg-primary-900/20' : 'bg-white dark:bg-midnight-900 border-gray-100 dark:border-midnight-800 hover:border-primary-200'}`}
                                >
                                    <div className="flex items-center justify-between w-full">
                                        <span className=${`text-sm font-bold ${selectedPlan === p.id ? 'text-primary-700 dark:text-primary-400' : 'text-gray-900 dark:text-white'}`}>${p.name}</span>
                                        ${selectedPlan === p.id && html`<${Icon} name="check-circle" size=${16} className="text-primary-500" />`}
                                    </div>
                                    <span className="text-[11px] text-gray-500 mt-0.5">${p.desc}</span>
                                </button>
                            `)}
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <${Button} type="button" variant="ghost" className="flex-1" onClick=${() => setPlanModal({ open: false, org: null })}>Cancel</${Button}>
                        <${Button} type="submit" variant="primary" className="flex-1" disabled=${planLoading}>
                            ${planLoading ? 'Updating...' : 'Update Plan'}
                        </${Button}>
                    </div>
                </form>
            </${Modal}>

            <${ConfirmModal}
                isOpen=${confirmAction.open}
                onClose=${() => setConfirmAction({ ...confirmAction, open: false })}
                onConfirm=${confirmAction.onConfirm}
                title=${confirmAction.title}
                message=${confirmAction.message}
                variant="danger"
            />
        </div>
    `;
};

const GlobalSearchPage = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);

    const handleSearch = async (e) => {
        if (e) e.preventDefault();
        if (query.length < 3) return;
        setLoading(true);
        try {
            const response = await apiClient.get('/admin/messages/search', { params: { q: query } });
            setResults(response.data);
        } catch (error) {
            console.error('Search failed', error);
        } finally {
            setLoading(false);
        }
    };

    return html`
        <div className="space-y-6 fade-in max-w-6xl mx-auto">
            <${Card} className="p-6">
                <form onSubmit=${handleSearch} className="flex gap-3">
                    <div className="flex-1">
                        <${Input} 
                            placeholder="Search by Recipient, Sender ID, or Message content..." 
                            value=${query}
                            onChange=${(e) => setQuery(e.target.value)}
                            className="text-lg"
                        />
                    </div>
                    <${Button} type="submit" disabled=${loading || query.length < 3} className="px-8">
                        <${Icon} name="search" size=${20} />
                        ${loading ? 'Searching...' : 'Search'}
                    </${Button}>
                </form>
            </${Card}>

            ${loading ? html`<div className="p-20 text-center animate-pulse text-gray-400">Searching global message logs...</div>` : results.length > 0 ? html`
                <${Card} className="overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-midnight-900 border-b border-gray-100 dark:border-midnight-800">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Organization</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">From/To</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Content</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-midnight-800">
                            ${results.map(msg => html`
                                <tr key=${msg.id} className="hover:bg-gray-50/50 dark:hover:bg-midnight-900/20 transition-colors">
                                    <td className="px-6 py-4">
                                        <p className="text-xs font-bold text-primary-600 uppercase">${msg.organization_name}</p>
                                        <p className="text-[10px] text-gray-400 mt-0.5">${new Date(msg.created_at).toLocaleString()}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase">From: ${msg.sender}</span>
                                            <span className="text-sm font-black text-gray-900 dark:text-white">${msg.recipient}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 max-w-xs">
                                        <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">${msg.content}</p>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <${Badge} variant=${msg.status === 'delivered' ? 'success' : msg.status === 'failed' ? 'error' : 'warning'}>${msg.status}</${Badge}>
                                    </td>
                                </tr>
                            `)}
                        </tbody>
                    </table>
                </${Card}>
            ` : query.length >= 3 && html`
                <div className="p-20 text-center text-gray-400">
                    <${Icon} name="info" size=${48} className="mx-auto mb-4 opacity-20" />
                    <p>No messages found matching "${query}"</p>
                </div>
            `}
        </div>
    `;
};

const AuditLogPage = () => {
    const [logs, setLogs] = useState([]);
    const [filteredLogs, setFilteredLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [actionFilter, setActionFilter] = useState('');
    const [selectedLog, setSelectedLog] = useState(null);

    useEffect(() => {
        apiClient.get('/admin/audit-logs')
            .then(res => { 
                setLogs(res.data); 
                setFilteredLogs(res.data);
                setLoading(false); 
            })
            .catch(() => setLoading(false));
    }, []);

    useEffect(() => {
        const filtered = logs.filter(log => {
            const matchesSearch = log.admin_email.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesAction = actionFilter === '' || log.action === actionFilter;
            return matchesSearch && matchesAction;
        });
        setFilteredLogs(filtered);
    }, [searchTerm, actionFilter, logs]);

    if (loading) return html`
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 text-sm gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
            Loading audit trail...
        </div>
    `;

    const uniqueActions = [...new Set(logs.map(l => l.action))].sort();

    return html`
        <div className="space-y-6 fade-in max-w-6xl mx-auto pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold dark:text-white">Audit Logs</h2>
                    <p className="text-sm text-gray-500 dark:text-midnight-400">Security and management activity history.</p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative">
                        <${Icon} name="search" size=${16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search Admin Email..."
                            value=${searchTerm}
                            onChange=${(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 rounded-xl border border-gray-100 dark:border-midnight-800 bg-white dark:bg-midnight-900 text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all w-full sm:w-64"
                        />
                    </div>
                    <select
                        value=${actionFilter}
                        onChange=${(e) => setActionFilter(e.target.value)}
                        className="px-4 py-2 rounded-xl border border-gray-100 dark:border-midnight-800 bg-white dark:bg-midnight-900 text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                    >
                        <option value="">All Actions</option>
                        ${uniqueActions.map(action => html`<option value=${action}>${action}</option>`)}
                    </select>
                </div>
            </div>

            <${Card} className="overflow-hidden border-none lg:border lg:border-gray-100 lg:dark:border-midnight-800 bg-transparent lg:bg-white lg:dark:bg-midnight-900 shadow-none lg:shadow-sm">
                <!-- Desktop Table -->
                <div className="hidden lg:block overflow-x-auto no-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 dark:bg-midnight-900 border-b border-gray-100 dark:border-midnight-800">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Admin</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Action</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Target</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Timestamp</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-midnight-800">
                            ${filteredLogs.map(log => html`
                                <tr 
                                    key=${log.id} 
                                    onClick=${() => setSelectedLog(log)}
                                    className="hover:bg-gray-50/50 dark:hover:bg-midnight-900/20 transition-colors cursor-pointer group"
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-midnight-800 flex items-center justify-center text-primary-600 font-bold text-xs">
                                                ${log.admin_email.charAt(0).toUpperCase()}
                                            </div>
                                            <p className="text-xs font-bold text-gray-900 dark:text-white">${log.admin_email}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-primary-600 bg-primary-50 dark:bg-primary-900/20 px-2 py-1 rounded">
                                            ${log.action}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-xs text-gray-500 dark:text-midnight-400">
                                            <span className="font-bold text-gray-700 dark:text-midnight-200">${log.target_type}</span>: ${log.target_id || 'N/A'}
                                        </p>
                                    </td>
                                    <td className="px-6 py-4 text-right text-xs text-gray-400 group-hover:text-primary-500 transition-colors">
                                        ${new Date(log.created_at).toLocaleString()}
                                    </td>
                                </tr>
                            `)}
                        </tbody>
                    </table>
                </div>

                <!-- Mobile Card List -->
                <div className="lg:hidden space-y-4">
                    ${filteredLogs.map(log => html`
                        <div 
                            key=${log.id} 
                            onClick=${() => setSelectedLog(log)}
                            className="bg-white dark:bg-midnight-900 p-5 rounded-2xl border border-gray-100 dark:border-midnight-800 shadow-sm active:scale-[0.98] transition-transform"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center text-primary-600 font-bold">
                                        ${log.admin_email.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-[150px]">${log.admin_email}</p>
                                        <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mt-0.5">${log.action}</p>
                                    </div>
                                </div>
                                <span className="text-[10px] text-gray-400 font-medium bg-gray-50 dark:bg-midnight-800 px-2 py-1 rounded-lg">
                                    ${new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            <div className="pt-4 border-t border-gray-50 dark:border-midnight-800 flex justify-between items-center">
                                <p className="text-xs text-gray-500">
                                    Target: <span className="font-bold text-gray-700 dark:text-midnight-200">${log.target_type}</span> (${log.target_id || 'N/A'})
                                </p>
                                <${Icon} name="chevron-right" size=${16} className="text-gray-300" />
                            </div>
                        </div>
                    `)}
                </div>
            </${Card}>

            <${Modal} 
                isOpen=${!!selectedLog} 
                onClose=${() => setSelectedLog(null)}
                title="Action Details"
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Admin</p>
                            <p className="text-sm font-bold dark:text-white mt-1">${selectedLog?.admin_email}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Timestamp</p>
                            <p className="text-sm dark:text-white mt-1">${selectedLog ? new Date(selectedLog.created_at).toLocaleString() : ''}</p>
                        </div>
                    </div>
                    
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Action</p>
                        <p className="text-sm font-black text-primary-600 uppercase mt-1">${selectedLog?.action}</p>
                    </div>

                    <div className="p-4 bg-gray-50 dark:bg-midnight-950 rounded-2xl border border-gray-100 dark:border-midnight-800">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Technical Data</p>
                        <pre className="text-[11px] font-mono text-gray-600 dark:text-midnight-300 overflow-x-auto whitespace-pre-wrap">
                            ${JSON.stringify(selectedLog?.details || {}, null, 2)}
                        </pre>
                    </div>
                    
                    <${Button} className="w-full" onClick=${() => setSelectedLog(null)}>Close</${Button}>
                </div>
            </${Modal}>
        </div>
    `;
};

const AnnouncementsPage = () => {
    const { showToast } = useToast();
    const [list, setList] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [usersLoading, setUsersLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [recipientMode, setRecipientMode] = useState('all');
    const [selectedUserIds, setSelectedUserIds] = useState([]);
    const [userSearch, setUserSearch] = useState('');
    const [form, setForm] = useState({ title: '', content: '', type: 'info', priority: 'normal' });

    useEffect(() => { fetchAnnouncements(); }, []);

    useEffect(() => {
        if (isCreating && users.length === 0 && !usersLoading) {
            fetchUsers();
        }
    }, [isCreating]);

    const fetchAnnouncements = async () => {
        try {
            const res = await apiClient.get('/admin/announcements');
            setList(res.data);
            setLoading(false);
        } catch (error) { setLoading(false); }
    };

    const fetchUsers = async () => {
        setUsersLoading(true);
        try {
            const res = await apiClient.get('/platform/users?limit=200');
            setUsers(res.data?.items || res.data || []);
        } catch (error) {
            showToast('Failed to load users', 'error');
        } finally {
            setUsersLoading(false);
        }
    };

    const toggleUserId = (id) => {
        setSelectedUserIds((prev) => (
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        ));
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (recipientMode === 'selected' && selectedUserIds.length === 0) {
            showToast('Pick at least one user or switch to All Users.', 'error');
            return;
        }
        try {
            await apiClient.post('/admin/announcements', null, {
                params: {
                    ...form,
                    target_user_ids: recipientMode === 'selected' ? selectedUserIds.join(',') : '',
                },
            });
            showToast('Announcement posted!', 'success');
            setIsCreating(false);
            setForm({ title: '', content: '', type: 'info', priority: 'normal' });
            setRecipientMode('all');
            setSelectedUserIds([]);
            setUserSearch('');
            fetchAnnouncements();
        } catch (error) { showToast('Failed to post', 'error'); }
    };

    const filteredUsers = users.filter((item) => {
        const query = userSearch.trim().toLowerCase();
        if (!query) return true;
        return [
            item.full_name,
            item.email,
            item.organization_name,
            item.role,
        ].some((value) => (value || '').toLowerCase().includes(query));
    });

    return html`
        <div className="space-y-6 fade-in max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold dark:text-white">Announcements</h2>
                <${Button} onClick=${() => setIsCreating(true)}>
                    <${Icon} name="plus" size=${18} /> New Announcement
                </${Button}>
            </div>

            <${Modal} isOpen=${isCreating} onClose=${() => setIsCreating(false)} title="Create Announcement">
                <form onSubmit=${handleCreate} className="space-y-4">
                    <${Input} label="Title" value=${form.title} onChange=${e => setForm({...form, title: e.target.value})} required />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold uppercase text-gray-500 ml-1">Priority</label>
                            <select
                                value=${form.priority}
                                onChange=${(e) => setForm({ ...form, priority: e.target.value })}
                                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-midnight-900 border border-gray-200 dark:border-midnight-800 rounded-xl outline-none text-sm"
                            >
                                <option value="low">Low</option>
                                <option value="normal">Normal</option>
                                <option value="high">High</option>
                                <option value="critical">Critical</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold uppercase text-gray-500 ml-1">Type</label>
                            <select
                                value=${form.type}
                                onChange=${(e) => setForm({ ...form, type: e.target.value })}
                                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-midnight-900 border border-gray-200 dark:border-midnight-800 rounded-xl outline-none text-sm"
                            >
                                <option value="info">Info</option>
                                <option value="warning">Warning</option>
                                <option value="success">Success</option>
                                <option value="emergency">Emergency</option>
                            </select>
                        </div>
                    </div>
                    <div className="space-y-2 rounded-2xl border border-gray-200 dark:border-midnight-800 bg-gray-50/70 dark:bg-midnight-900/40 p-4">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-midnight-400">Audience</p>
                                <p className="text-sm text-gray-500 dark:text-midnight-400">Choose all users or pick specific recipients.</p>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                ${recipientMode === 'selected' ? `${selectedUserIds.length} selected` : 'All users'}
                            </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick=${() => setRecipientMode('all')}
                                className=${`px-4 py-3 rounded-2xl border text-left transition-colors ${recipientMode === 'all' ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300' : 'border-gray-200 dark:border-midnight-800 text-gray-600 dark:text-midnight-300'}`}
                            >
                                <p className="font-bold">All users</p>
                                <p className="text-xs opacity-80">Send the announcement to everyone.</p>
                            </button>
                            <button
                                type="button"
                                onClick=${() => setRecipientMode('selected')}
                                className=${`px-4 py-3 rounded-2xl border text-left transition-colors ${recipientMode === 'selected' ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300' : 'border-gray-200 dark:border-midnight-800 text-gray-600 dark:text-midnight-300'}`}
                            >
                                <p className="font-bold">Selected users</p>
                                <p className="text-xs opacity-80">Choose specific users below.</p>
                            </button>
                        </div>
                        ${recipientMode === 'selected' && html`
                            <div className="space-y-3">
                                <input
                                    value=${userSearch}
                                    onChange=${(e) => setUserSearch(e.target.value)}
                                    placeholder="Search users by name, email, role, or organization"
                                    className="w-full px-4 py-2.5 bg-white dark:bg-midnight-950 border border-gray-200 dark:border-midnight-800 rounded-xl outline-none text-sm"
                                />
                                <div className="max-h-60 overflow-y-auto rounded-2xl border border-gray-200 dark:border-midnight-800 bg-white dark:bg-midnight-950 divide-y divide-gray-100 dark:divide-midnight-800">
                                    ${usersLoading ? html`
                                        <div className="p-4 text-sm text-gray-500">Loading users...</div>
                                    ` : filteredUsers.length === 0 ? html`
                                        <div className="p-4 text-sm text-gray-500">No users found.</div>
                                    ` : filteredUsers.map((user) => html`
                                        <label key=${user.id} className="flex items-start gap-3 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-midnight-900/60 transition-colors">
                                            <input
                                                type="checkbox"
                                                checked=${selectedUserIds.includes(user.id)}
                                                onChange=${() => toggleUserId(user.id)}
                                                className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                            />
                                            <div className="min-w-0 flex-1">
                                                <p className="font-semibold text-gray-900 dark:text-white truncate">${user.full_name || user.email}</p>
                                                <p className="text-xs text-gray-500 dark:text-midnight-400 truncate">${user.email}</p>
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">${user.role || 'user'}${user.organization_name ? ` · ${user.organization_name}` : ''}</p>
                                            </div>
                                        </label>
                                    `)}
                                </div>
                            </div>
                        `}
                    </div>
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold uppercase text-gray-500 ml-1">Content</label>
                        <textarea 
                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-midnight-900 border border-gray-200 dark:border-midnight-800 rounded-xl outline-none text-sm min-h-[100px]"
                            value=${form.content}
                            onChange=${e => setForm({...form, content: e.target.value})}
                            required
                        ></textarea>
                    </div>
                    <div className="flex gap-3 pt-4">
                        <${Button} type="button" variant="ghost" className="flex-1" onClick=${() => setIsCreating(false)}>Cancel</${Button}>
                        <${Button} type="submit" className="flex-1">Post Announcement</${Button}>
                    </div>
                </form>
            </${Modal}>

            <div className="space-y-4">
                ${list.map(item => html`
                    <${Card} key=${item.id} className="p-6 border-l-4 ${item.type === 'warning' ? 'border-amber-500' : item.type === 'emergency' ? 'border-rose-500' : 'border-primary-500'}">
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">${item.title}</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">${item.content}</p>
                                <div className="flex gap-3 mt-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                    <span>Posted: ${new Date(item.created_at).toLocaleDateString()}</span>
                                    <span>Type: ${item.type}</span>
                                    <span>Priority: ${(item.priority || 'normal').toUpperCase()}</span>
                                    <span>${item.target_user_ids && item.target_user_ids.length ? `${item.target_user_ids.length} selected users` : 'All users'}</span>
                                </div>
                            </div>
                        </div>
                    </${Card}>
                `)}
            </div>
        </div>
    `;
};

const SystemHealthPage = () => {
    const { showToast } = useToast();
    const [health, setHealth] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchHealth = () => {
        apiClient.get('/admin/system/health')
            .then(res => { setHealth(res.data); setLoading(false); })
            .catch(() => setLoading(false));
    };

    useEffect(() => { fetchHealth(); }, []);

    const handleToggleGateway = async (gatewayId) => {
        try {
            await apiClient.post(`/admin/gateways/${gatewayId}/toggle`);
            showToast('Gateway status updated', 'success');
            fetchHealth();
        } catch (error) {
            showToast('Failed to toggle gateway', 'error');
        }
    };

    if (loading) return html`<div className="p-20 text-center animate-pulse text-gray-400">Running diagnostic health checks...</div>`;

    return html`
        <div className="space-y-6 fade-in max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold dark:text-white">System Health</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <${Card} className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                            <${Icon} name="database" size=${24} className="text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">PostgreSQL DB</p>
                            <p className="text-lg font-black text-emerald-600">OPERATIONAL</p>
                        </div>
                    </div>
                    <${Icon} name="check-circle" className="text-emerald-500" />
                </${Card}>

                <${Card} className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-xl">
                            <${Icon} name="server" size=${24} className="text-primary-600" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">FastAPI Backend</p>
                            <p className="text-lg font-black text-primary-600">ONLINE</p>
                        </div>
                    </div>
                    <${Icon} name="check-circle" className="text-emerald-500" />
                </${Card}>
            </div>

            <div className="flex items-center justify-between mt-8 mb-4">
                <h3 className="text-xs font-black text-gray-400 dark:text-midnight-500 uppercase tracking-widest px-1">Gateway Connectivity</h3>
                <${Button} variant="ghost" size="sm" onClick=${fetchHealth} className="h-8">
                    <${Icon} name="refresh-cw" size=${14} className=${loading ? 'animate-spin' : ''} />
                </${Button}>
            </div>
            
            <div className="grid gap-3">
                ${health?.gateways.map(gw => html`
                    <${Card} key=${gw.id} className="p-4 flex items-center justify-between bg-white dark:bg-midnight-900/40">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-midnight-800 flex items-center justify-center">
                                <${Icon} name="zap" size=${18} className=${gw.is_active ? 'text-amber-500' : 'text-gray-300'} />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-900 dark:text-white">${gw.name}</p>
                                <p className="text-[10px] text-gray-500 font-mono">${gw.host}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <${Badge} variant=${gw.is_active ? 'success' : 'default'}>${gw.status}</${Badge}>
                            <${Button} 
                                size="sm" 
                                variant=${gw.is_active ? 'outline' : 'primary'}
                                className="h-8 text-[10px] font-black uppercase tracking-wider"
                                onClick=${() => handleToggleGateway(gw.id)}
                            >
                                ${gw.is_active ? 'Disable' : 'Enable'}
                            </${Button}>
                        </div>
                    </${Card}>
                `)}
            </div>
        </div>
    `;
};

const MobileHeader = ({ title }) => {
    const { user } = useAuth();
    return html`
        <header className="lg:hidden sticky top-0 z-50 bg-white/80 dark:bg-midnight-950/80 backdrop-blur-md border-b border-gray-100 dark:border-midnight-800 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <img src="assets/NEXRA_IconAbove.png" alt="NEXRA" className="h-8 w-auto" />
                <h1 className="text-lg font-bold text-gray-900 dark:text-white truncate max-w-[150px] sm:max-w-none">${title}</h1>
            </div>
            <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-[10px] font-black text-primary-600">
                ${user?.full_name?.charAt(0)}
            </div>
        </header>
    `;
};

const BottomNav = ({ currentPage, onNavigate }) => {
    const { user } = useAuth();
    
    return html`
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-midnight-950/90 backdrop-blur-xl border-t border-gray-100 dark:border-midnight-800 px-6 py-3 pb-safe">
            <div className="flex items-center justify-around max-w-md mx-auto">
                <button 
                    onClick=${() => onNavigate('overview')}
                    className="flex flex-col items-center gap-1 transition-colors ${currentPage === 'overview' ? 'text-primary-600 font-bold' : 'text-gray-400'}"
                >
                    <${Icon} name="trending-up" size=${20} />
                    <span className="text-[10px] uppercase tracking-wider">Overview</span>
                </button>
                
                <button 
                    onClick=${() => onNavigate('approvals')}
                    className="flex flex-col items-center gap-1 transition-colors ${currentPage === 'approvals' ? 'text-primary-600 font-bold' : 'text-gray-400'}"
                >
                    <${Icon} name="check-square" size=${20} />
                    <span className="text-[10px] uppercase tracking-wider">Approvals</span>
                </button>
                
                ${(user?.role === 'superadmin' || user?.permissions?.manage_platform) && html`
                    <button 
                        onClick=${() => onNavigate('management')}
                        className="flex flex-col items-center gap-1 transition-colors ${currentPage === 'management' ? 'text-primary-600 font-bold' : 'text-gray-400'}"
                    >
                        <${Icon} name="grid" size=${20} />
                        <span className="text-[10px] uppercase tracking-wider">Manage</span>
                    </button>
                `}
                ${user?.role === 'superadmin' && html`
                    <button 
                        onClick=${() => onNavigate('staff')}
                        className="flex flex-col items-center gap-1 transition-colors ${currentPage === 'staff' ? 'text-primary-600 font-bold' : 'text-gray-400'}"
                    >
                        <${Icon} name="users" size=${20} />
                        <span className="text-[10px] uppercase tracking-wider">Staff</span>
                    </button>
                `}
                
                <button 
                    onClick=${() => onNavigate('search')}
                    className="flex flex-col items-center gap-1 transition-colors ${currentPage === 'search' ? 'text-primary-600 font-bold' : 'text-gray-400'}"
                >
                    <${Icon} name="search" size=${20} />
                    <span className="text-[10px] uppercase tracking-wider">Search</span>
                </button>
                
                <button 
                    onClick=${() => onNavigate('settings')}
                    className="flex flex-col items-center gap-1 transition-colors ${currentPage === 'settings' ? 'text-primary-600 font-bold' : 'text-gray-400'}"
                >
                    <${Icon} name="user" size=${20} />
                    <span className="text-[10px] uppercase tracking-wider">Me</span>
                </button>
            </div>
        </nav>
    `;
};

const AdminSidebar = ({ currentPage, onNavigate }) => {
    const { user, logout } = useAuth();
    
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
                <button
                    onClick=${logout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                >
                    <${Icon} name="log-out" size=${20} />
                    <span>Sign Out</span>
                </button>
            </div>
        </aside>
    `;
};

const AdminBugsPage = () => {
    const { showToast } = useToast();
    const [bugs, setBugs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchBugs();
    }, []);

    const fetchBugs = async () => {
        setLoading(true);
        try {
            const response = await apiClient.get('/bugs/');
            setBugs(response.data);
        } catch (error) {
            console.error('Failed to fetch bugs:', error);
            showToast('Failed to load bug reports', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (id, status) => {
        try {
            await apiClient.patch(`/bugs/${id}`, { status });
            showToast(`Bug report marked as ${status}`, 'success');
            fetchBugs();
        } catch (error) {
            showToast('Failed to update bug report', 'error');
        }
    };

    return html`
        <div className="space-y-4 lg:space-y-6 fade-in max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold dark:text-white">Bug Reports</h2>
                    <p className="text-sm text-gray-500 dark:text-midnight-400 mt-1">Manage platform issues reported by users.</p>
                </div>
                <${Button} onClick=${fetchBugs} variant="secondary" size="sm">
                    <${Icon} name="refresh-cw" size=${16} className=${loading ? 'animate-spin' : ''} />
                    Refresh
                </${Button}>
            </div>

            ${loading ? html`
                <div className="p-12 text-center">
                    <div className="animate-spin inline-block text-primary-600"><${Icon} name="loader-2" size=${32} /></div>
                    <p className="text-sm text-gray-500 mt-4">Loading reports...</p>
                </div>
            ` : bugs.length === 0 ? html`
                <${Card} className="p-12 text-center text-gray-500 border-none lg:border">
                    <${Icon} name="check-circle" size=${64} className="mx-auto mb-4 text-green-500/20" />
                    <p className="text-lg font-medium">No bug reports</p>
                    <p className="text-sm">The platform is running smoothly.</p>
                </${Card}>
            ` : html`
                <div className="grid gap-3 lg:gap-4">
                    ${bugs.map((bug) => html`
                        <${Card} key=${bug.id} className="p-5 lg:p-6 flex flex-col md:flex-row md:items-start justify-between bg-white dark:bg-midnight-900 border-gray-100 dark:border-midnight-800 shadow-sm gap-4">
                            <div className="flex-1 space-y-3">
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 flex items-center justify-center shrink-0">
                                        <${Icon} name="alert-triangle" size=${20} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">${bug.subject}</h3>
                                        <div className="flex flex-wrap items-center gap-2 mt-1">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-gray-100 dark:bg-midnight-800 px-2 py-0.5 rounded">
                                                Org #${bug.organization_id} • User #${bug.user_id}
                                            </span>
                                            <span className="text-xs text-gray-400">•</span>
                                            <span className="text-xs text-gray-500">${new Date(bug.created_at).toLocaleString()}</span>
                                            <span className="text-xs text-gray-400">•</span>
                                            <${Badge} variant=${bug.status === 'resolved' ? 'success' : bug.status === 'in_progress' ? 'warning' : bug.status === 'closed' ? 'default' : 'error'}>
                                                ${bug.status.replace('_', ' ')}
                                            </${Badge}>
                                        </div>
                                    </div>
                                </div>
                                <div className="pl-13 text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap bg-gray-50 dark:bg-midnight-950 p-4 rounded-xl border border-gray-100 dark:border-midnight-800">
                                    ${bug.description}
                                </div>
                            </div>
                            
                            <div className="flex md:flex-col gap-2 w-full md:w-auto shrink-0 md:pl-4">
                                ${bug.status !== 'resolved' && bug.status !== 'closed' && html`
                                    <${Button} size="sm" className="flex-1 md:flex-none" onClick=${() => handleUpdateStatus(bug.id, 'resolved')}>
                                        Mark Resolved
                                    </${Button}>
                                    ${bug.status === 'open' && html`
                                        <${Button} variant="secondary" size="sm" className="flex-1 md:flex-none" onClick=${() => handleUpdateStatus(bug.id, 'in_progress')}>
                                            In Progress
                                        </${Button}>
                                    `}
                                `}
                                ${bug.status !== 'closed' && html`
                                    <${Button} variant="ghost" size="sm" className="flex-1 md:flex-none text-gray-500 hover:text-gray-700" onClick=${() => handleUpdateStatus(bug.id, 'closed')}>
                                        Close
                                    </${Button}>
                                `}
                            </div>
                        </${Card}>
                    `)}
                </div>
            `}
        </div>
    `;
};

const AdminApp = () => {
    const { user, loading, logout } = useAuth();
    const [currentPage, setCurrentPage] = useState('approvals');

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

    const renderPage = () => {
        switch (currentPage) {
            case 'overview': return html`<${BusinessOverviewPage} />`;
            case 'approvals': return html`<${AdminApprovalPage} />`;
            case 'management': return html`<${PlatformManagementPage} />`;
            case 'staff': return html`<${StaffManagementPage} />`;
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
            case 'approvals': return 'Approvals';
            case 'management': return 'Management';
            case 'staff': return 'Staff Management';
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
