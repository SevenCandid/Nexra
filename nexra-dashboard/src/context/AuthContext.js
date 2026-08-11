import { html, useState, useEffect, createContext, useContext } from '../utils/htm.js';
import apiClient from '../api/client.js';
import { useToast } from './ToastContext.js';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const { showToast } = useToast();

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

export const useAuth = () => useContext(AuthContext);
