export const API_BASE_URL = window.__NEXRA_API_URL__ || 'http://localhost:8000/api/v1';

const apiClient = window.axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor — attach access token
apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response interceptor — silent refresh on 401
let _isRefreshing = false;
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401 && !error.config._retry) {
            const refreshToken = localStorage.getItem('refresh_token');
            if (refreshToken && !_isRefreshing) {
                _isRefreshing = true;
                try {
                    const res = await window.axios.post(
                        `${API_BASE_URL}/auth/refresh`,
                        {},
                        { headers: { Authorization: `Bearer ${refreshToken}` } }
                    );
                    const { access_token, refresh_token } = res.data;
                    localStorage.setItem('access_token', access_token);
                    if (refresh_token) localStorage.setItem('refresh_token', refresh_token);
                    error.config._retry = true;
                    error.config.headers.Authorization = `Bearer ${access_token}`;
                    _isRefreshing = false;
                    return apiClient(error.config);
                } catch (_) {
                    _isRefreshing = false;
                }
            }
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            window.location.hash = '#/login';
        }
        return Promise.reject(error);
    }
);

export default apiClient;
