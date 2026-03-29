import axios from 'axios';
import { store } from '../store/store';
import { terminateSession } from '../store/authSlice';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

api.interceptors.request.use(
  (config) => {
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      const parsed = JSON.parse(userInfo);
      if (parsed?.token) {
        config.headers.Authorization = `Bearer ${parsed.token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const message = error.response.data?.message;
      
      if (message === 'Session expired: Logged in from another device') {
        store.dispatch(terminateSession());
      } else {
        localStorage.removeItem('userInfo');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
