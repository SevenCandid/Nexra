import { html, useState, useEffect, useRef, useMemo, useCallback } from '../../utils/htm.js';
import { Icon, Button, Badge, Card, Modal, Skeleton } from '../ui/index.js';
import { useAuth } from '../../context/index.js';

export const AdminStatCard = ({ label, value, sub, icon, colorBg, colorIcon, prefix }) => html`
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
