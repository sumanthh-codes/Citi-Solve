/**
 * apiFetch — API helper for the single-origin deployment.
 *
 * The frontend proxies /api/* to the backend (Vercel rewrite in prod, Vite
 * proxy in dev), so every request is same-origin and authentication rides
 * entirely on httpOnly cookies sent via credentials: 'include'.
 *
 * We deliberately do NOT keep the access token in localStorage. A first-party
 * httpOnly cookie is invisible to JavaScript, so it cannot be exfiltrated by
 * XSS — storing a copy in localStorage would throw that protection away.
 *
 * getToken/setToken/clearToken are kept for backwards compatibility with the
 * many call sites that still import them:
 *   - getToken/setToken are inert (the token is never in JS anymore).
 *   - clearToken purges any token left behind by the old cross-origin scheme.
 */

const API = import.meta.env.VITE_BACKEND_URL || '';

const LEGACY_TOKEN_KEY = 'citisolve_token';

export const getToken = () => null;
export const setToken = () => {};
export const clearToken = () => localStorage.removeItem(LEGACY_TOKEN_KEY);

/**
 * apiFetch(path, options)
 * @param {string} path    - e.g. '/api/auth/profile'
 * @param {object} options - same as fetch options (method, body, headers, ...)
 *
 * NOTE: If body is FormData, Content-Type is NOT set (the browser sets it
 *       automatically with the correct multipart boundary for file uploads).
 */
export const apiFetch = async (path, options = {}) => {
  const isFormData = options.body instanceof FormData;

  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {}),
  };

  return fetch(`${API}${path}`, {
    ...options,
    headers,
    credentials: 'include', // send the httpOnly auth cookies (same-origin)
  });
};
