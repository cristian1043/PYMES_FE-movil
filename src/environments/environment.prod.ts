import { Capacitor } from '@capacitor/core';

const getApiUrl = (): string => {
  if (typeof localStorage !== 'undefined') {
    const custom = localStorage.getItem('api_url');
    if (custom) return custom;
  }

  try {
    if (Capacitor.isNativePlatform()) {
      const ua = (typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent.toLowerCase() : '';
      const isEmulator = ua.includes('sdk') || ua.includes('emulator') || ua.includes('x86') || ua.includes('goldfish') || ua.includes('ranchu');
      if (isEmulator) {
        return 'http://10.0.2.2:5000/api';
      }
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
      return `https://${hostname}/api`;
    }
  }
  return 'https://pymes-be.onrender.com/api';
};

export const environment = {
  production: true,
  apiUrl: getApiUrl()
};
