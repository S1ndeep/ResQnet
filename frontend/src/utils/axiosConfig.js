import axios from 'axios';

// Configure axios defaults
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  timeout: 30000, // 30 second timeout - increased for slower connections
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED') {
      console.error('Request timeout');
      return Promise.reject(new Error('Request timeout. Please try again.'));
    }
    if (error.response?.status === 401) {
      // Don't redirect if we're already on login/register page or if it's a login/register request
      const isAuthRequest = error.config?.url?.includes('/auth/login') || error.config?.url?.includes('/auth/register');
      const isAuthPage = window.location.pathname === '/login' || window.location.pathname === '/register';
      
      if (!isAuthRequest && !isAuthPage) {
        // Only redirect if we have a token (meaning it expired/invalid)
        const token = localStorage.getItem('token');
        if (token) {
          localStorage.removeItem('token');
          // Use a small delay to prevent race conditions
          setTimeout(() => {
            if (window.location.pathname !== '/login') {
              window.location.href = '/login';
            }
          }, 100);
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;



