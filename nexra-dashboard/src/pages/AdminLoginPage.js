import { html, useState, useEffect, useRef, useMemo, useCallback } from '../utils/htm.js';
import apiClient from '../api/client.js';
import { useToast, useAuth } from '../context/index.js';
import { Icon, Button, Badge, Card, Modal, Skeleton, TrendChart } from '../components/ui/index.js';

export const AdminLoginPage = () => {
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