import { html } from '../../utils/htm.js';
import { Icon } from './Icon.js';
import { Button } from './Button.js';

export const ConfirmModal = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title = "Are you sure?", 
    message, 
    confirmText = "Confirm", 
    cancelText = "Cancel",
    variant = "danger", // danger, warning, info
    loading = false 
}) => {
    if (!isOpen) return null;

    const variants = {
        danger: {
            icon: "alert-triangle",
            iconBg: "bg-rose-50 dark:bg-rose-900/20",
            iconColor: "text-rose-500",
            button: "bg-rose-500 hover:bg-rose-600 border-none text-white",
            shadow: "shadow-rose-500/20"
        },
        warning: {
            icon: "alert-circle",
            iconBg: "bg-amber-50 dark:bg-amber-900/20",
            iconColor: "text-amber-500",
            button: "bg-amber-500 hover:bg-amber-600 border-none text-white",
            shadow: "shadow-amber-500/20"
        },
        info: {
            icon: "help-circle",
            iconBg: "bg-primary-50 dark:bg-primary-900/20",
            iconColor: "text-primary-500",
            button: "bg-primary-600 hover:bg-primary-700 border-none text-white",
            shadow: "shadow-primary-500/20"
        }
    };

    const style = variants[variant] || variants.info;

    return html`
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
            <!-- Backdrop -->
            <div 
                className="absolute inset-0 bg-midnight-950/40 backdrop-blur-md"
                onClick=${loading ? null : onClose}
            ></div>

            <!-- Modal Content -->
            <div className="relative w-full max-w-sm bg-white dark:bg-midnight-900 rounded-[2.5rem] shadow-2xl border border-white/20 dark:border-midnight-800 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
                <div className="p-8">
                    <!-- Icon Header -->
                    <div className="flex justify-center mb-6">
                        <div className=${`w-20 h-20 rounded-full ${style.iconBg} flex items-center justify-center shadow-inner`}>
                            <div className=${`w-14 h-14 rounded-full bg-white dark:bg-midnight-800 flex items-center justify-center shadow-lg ${style.shadow}`}>
                                <${Icon} name=${style.icon} size=${28} className=${style.iconColor} />
                            </div>
                        </div>
                    </div>

                    <div className="text-center space-y-2">
                        <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">${title}</h3>
                        <p className="text-sm text-gray-500 dark:text-midnight-400 font-medium leading-relaxed">
                            ${message}
                        </p>
                    </div>

                    <div className="mt-8 flex flex-col gap-3">
                        <${Button} 
                            onClick=${onConfirm} 
                            disabled=${loading}
                            className=${`w-full h-12 rounded-2xl font-bold shadow-lg ${style.button} ${style.shadow}`}
                        >
                            ${loading ? html`
                                <div className="flex items-center gap-2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                                    Processing...
                                </div>
                            ` : confirmText}
                        </${Button}>
                        
                        <${Button} 
                            variant="ghost" 
                            onClick=${onClose} 
                            disabled=${loading}
                            className="w-full h-12 rounded-2xl font-bold text-gray-500 dark:text-midnight-400 hover:bg-gray-50 dark:hover:bg-midnight-800 transition-all"
                        >
                            ${cancelText}
                        </${Button}>
                    </div>
                </div>
            </div>
        </div>
    `;
};
