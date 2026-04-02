import { store } from '../store/store';
import { terminateSession } from '../store/authSlice';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * FetchClient - A lightweight wrapper around fetch to mimic Axios functionality
 */
class FetchClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    // Request Interceptor Logic
    const userInfo = localStorage.getItem('userInfo');
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (userInfo) {
      const parsed = JSON.parse(userInfo);
      if (parsed?.token) {
        headers.Authorization = `Bearer ${parsed.token}`;
      }
    }

    const config = {
      ...options,
      headers,
    };

    if (config.data) {
      config.body = JSON.stringify(config.data);
      delete config.data;
    }

    try {
      const response = await fetch(url, config);
      
      // Response Interceptor Logic
      if (response.status === 401) {
        const data = await response.json().catch(() => ({}));
        if (data.message === 'Session expired: Logged in from another device') {
          store.dispatch(terminateSession());
        } else {
          localStorage.removeItem('userInfo');
          window.location.href = '/login';
        }
        throw { response: { status: 401, data } };
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw { response: { status: response.status, data: errorData } };
      }

      const data = await response.json().catch(() => ({}));
      return { data, status: response.status, ok: response.ok };
      
    } catch (error) {
      if (error.response) throw error;
      throw { response: { data: { message: error.message || 'Network Error' } } };
    }
  }

  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  post(endpoint, data, options = {}) {
    return this.request(endpoint, { ...options, method: 'POST', data });
  }

  put(endpoint, data, options = {}) {
    return this.request(endpoint, { ...options, method: 'PUT', data });
  }

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
}

const api = new FetchClient(BASE_URL);

export default api;

