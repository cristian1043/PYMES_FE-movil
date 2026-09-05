import { Capacitor } from '@capacitor/core';

const getApiUrl = (): string => {
  try {
    if (Capacitor.isNativePlatform()) {
      return 'http://192.168.1.26:5000/api';
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
  return 'http://192.168.1.26:5000/api';
};

export const environment = {
  production: true,
  apiUrl: getApiUrl()
};

