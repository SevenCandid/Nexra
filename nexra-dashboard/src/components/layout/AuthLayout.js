import { html, useState, useEffect, useRef, useMemo, useCallback } from '../../utils/htm.js';
import { Icon, Button, Badge, Card, Modal, Skeleton } from '../ui/index.js';
import { useAuth } from '../../context/index.js';

export const AuthLayout = ({ children, isLogin, loginType }) => {
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
