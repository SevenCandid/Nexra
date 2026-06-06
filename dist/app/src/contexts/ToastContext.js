import { html, useState, createContext, useContext, useMemo } from '../utils/htm.js';
import { Icon } from '../components/ui/Icon.js';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const showToast = (message, variant = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, variant }]);

        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
    };

    const removeToast = (id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    const contextValue = useMemo(() => ({ showToast }), []); // showToast ref relies on setToasts which is stable

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

export const useToast = () => {
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
