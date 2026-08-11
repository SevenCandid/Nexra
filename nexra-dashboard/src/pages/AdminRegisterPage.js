import { html, useState, useEffect, useRef, useMemo, useCallback } from '../utils/htm.js';
import apiClient from '../api/client.js';
import { useToast, useAuth } from '../context/index.js';
import { Icon, Button, Badge, Card, Modal, Skeleton, TrendChart } from '../components/ui/index.js';

export const AdminRegisterPage = () => {
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