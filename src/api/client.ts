import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

const MAX_RETRIES = 2;

interface RetryConfig extends InternalAxiosRequestConfig {
  _retryCount?: number;
}

apiClient.interceptors.request.use(
  async (config) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
      }
    } catch (error) {
      console.error('Error fetching session for API request:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryConfig;

    if (!config) return Promise.reject(error);

    config._retryCount = config._retryCount || 0;

    if (
      config._retryCount < MAX_RETRIES &&
      (error.code === 'ERR_NETWORK' || (error.response && error.response.status >= 500))
    ) {
      config._retryCount += 1;
      const delay = Math.min(1000 * Math.pow(2, config._retryCount), 5000);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return apiClient(config);
    }

    if (error.response) {
      const status = error.response.status;
      const data: any = error.response.data;
      const message = data?.error || data?.message || error.message;

      if (status === 401) {
        toast.error('Session expired. Please log in again.');
      } else if (status === 403) {
        toast.error('You do not have permission to perform this action.');
      } else if (status === 400) {
        toast.error(`Invalid request: ${message}`);
      } else if (status >= 500) {
        toast.error('A server error occurred. Please try again later.');
      } else {
        toast.error(message);
      }
    } else if (error.request) {
      toast.error('Network error. Please check your connection.');
    } else {
      toast.error('An unexpected error occurred.');
    }

    return Promise.reject(error);
  }
);
