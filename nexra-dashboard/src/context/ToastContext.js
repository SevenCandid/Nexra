import { html, useState, createContext, useContext } from '../utils/htm.js';
import { Toast } from '../components/ui/index.js';

export const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
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

export const useToast = () => useContext(ToastContext);
