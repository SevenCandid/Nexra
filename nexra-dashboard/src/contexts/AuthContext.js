import { html, useState, useEffect, createContext, useContext } from '../utils/htm.js';
import apiClient from '../api/client.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

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
        } catch (error) {
            localStorage.removeItem('access_token');
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        const params = new URLSearchParams();
        params.append('username', email);
        params.append('password', password);

        const response = await apiClient.post('/auth/login', params, {
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
        setUser(null);
        window.location.hash = '#/login';
    };

    return html`
        <${AuthContext.Provider} value=${{ user, loading, login, register, logout }}>
            ${children}
        </${AuthContext.Provider}>
    `;
};

export const useAuth = () => useContext(AuthContext);
