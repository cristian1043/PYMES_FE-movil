import { Capacitor } from '@capacitor/core';

const getApiUrl = (): string => {
  if (typeof localStorage !== 'undefined') {
    const custom = localStorage.getItem('api_url');
    if (custom) return custom;
  }

  try {
    if (Capacitor.isNativePlatform()) {
      return 'https://pymes-be.onrender.com/api';
    }
  } catch (e) {
    // fallback
  }

  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:5000/api';
    }
    if (hostname) {
      return `http://${hostname}:5000/api`;
    }
  }
  return 'https://pymes-be.onrender.com/api';
};

export const environment = {
  production: true,
  apiUrl: getApiUrl()
};
