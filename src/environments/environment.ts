const host = (typeof window !== 'undefined' && window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1')
  ? window.location.hostname
  : '192.168.1.26';

export const environment = {
  production: false,
  apiUrl: `http://${host}:5000/api`
};
