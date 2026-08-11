import { html, useState, useEffect, useRef, useMemo } from '../../utils/htm.js';
import { Icon } from './index.js';

export const Modal = ({ isOpen, onClose, title, children }) => {
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