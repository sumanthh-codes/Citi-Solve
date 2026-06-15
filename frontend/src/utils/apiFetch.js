/**
 * apiFetch — Authenticated API helper
 *
 * Sends requests with BOTH:
 *   1. cookies (via credentials: 'include') — works when same-origin
 *   2. Authorization header (from localStorage) — fallback for cross-origin
 *
 * This ensures auth works on ALL browsers and devices.
 */

const API = import.meta.env.VITE_BACKEND_URL || '';

const TOKEN_KEY = 'citisolve_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => {
  if (token) localStorage.setItem(TOKEN_KEY, token);
};
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

/**
 * apiFetch(path, options)
 * @param {string} path  - e.g. '/api/auth/profile'
 * @param {object} options - same as fetch options (method, body, headers, etc.)
 *
 * NOTE: If body is FormData, Content-Type is NOT set (browser sets it automatically
 *       with correct multipart boundary for file uploads).
 */
export const apiFetch = async (path, options = {}) => {
  const token = getToken();
  const isFormData = options.body instanceof FormData;

  const headers = {
    // Don't set Content-Type for FormData — browser sets it with boundary
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {}),
    // Always add Authorization header if token exists (cross-origin fallback)
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  return fetch(`${API}${path}`, {
    ...options,
    headers,
    credentials: 'include', // still send cookies where browser allows
  });
};