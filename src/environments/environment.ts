import { Capacitor } from '@capacitor/core';

const getApiUrl = (): string => {
  try {
    if (Capacitor.isNativePlatform()) {
      return 'http://192.168.1.26:5000/api';
    }
  } catch (e) {
    // fallback
  }

  if (typeof window === 'undefined') {
    return 'http://127.0.0.1:5000/api';
  }
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:5000/api';
  }
  return `http://${hostname}:5000/api`;
};

export const environment = {
  production: false,
  apiUrl: getApiUrl()
};
