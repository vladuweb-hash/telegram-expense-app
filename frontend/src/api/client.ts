import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add Telegram init data
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const initData = window.Telegram?.WebApp?.initData;
    
    if (initData) {
      config.headers.set('X-Telegram-Init-Data', initData);
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string }>) => {
    const message = error.response?.data?.message || error.message || 'An error occurred';
    
    // Handle specific error codes
    if (error.response?.status === 401) {
      console.error('Unauthorized - invalid Telegram data');
    }
    
    if (error.response?.status === 403) {
      console.error('Forbidden - access denied');
    }
    
    if (error.response?.status === 429) {
      console.error('Too many requests - rate limited');
    }
    
    return Promise.reject(new Error(message));
  }
);

export default apiClient;
