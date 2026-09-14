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
