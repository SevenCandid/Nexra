import { html } from '../../utils/htm.js';
import { Icon } from './Icon.js';

export const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return html`
        <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 sm:p-6 pt-6 pb-6 overflow-x-hidden overflow-y-auto outline-none focus:outline-none">
            <div 
                className="fixed inset-0 bg-midnight-950/40 dark:bg-black/80 backdrop-blur-md transition-opacity duration-300 animate-in fade-in"
                onClick=${onClose}
            ></div>

            <div className="relative w-full max-w-lg mx-auto bg-white dark:bg-midnight-950 rounded-3xl shadow-2xl transition-all transform animate-in zoom-in-95 fade-in duration-300 ease-out border border-gray-100 dark:border-midnight-800 overflow-hidden max-h-[calc(100vh-3rem)]">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50 dark:border-midnight-800 bg-gray-50/50 dark:bg-midnight-900/50">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">${title}</h3>
                    <button 
                        onClick=${onClose} 
                        className="p-2 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-all active:scale-95"
                    >
                        <${Icon} name="x" size=${20} />
                    </button>
                </div>
                
                <div className="p-6 max-h-[calc(100vh-10rem)] overflow-y-auto">
                    ${children}
                </div>
            </div>
        </div>
    `;
};
