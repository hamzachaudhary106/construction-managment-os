import axios from 'axios';

const client = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  // Send cookies with every request so backend can use HttpOnly auth cookies
  withCredentials: true,
});

client.interceptors.request.use((config) => {
  if (config.data instanceof FormData) {
    delete (config.headers as Record<string, unknown>)['Content-Type'];
  }
  return config;
});

client.interceptors.response.use(
  (r) => r,
  async (err) => {
    const orig = err.config;
    if (err.response?.status === 401 && !orig._retry) {
      orig._retry = true;
      try {
        // Ask backend to refresh tokens using HttpOnly refresh cookie
        await axios.post('/api/auth/token/refresh/', {}, { withCredentials: true });
        return client(orig);
      } catch {
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(err);
  }
);

export default client;
