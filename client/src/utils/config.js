export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

export const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || (typeof window !== 'undefined' ? window.location.origin : '');

export const API_URL = import.meta.env.VITE_API_URL || (BACKEND_URL ? `${BACKEND_URL}/api` : '/api');

/**
 * Helper to construct full API URLs cleanly.
 * @param {string} endpoint - e.g. '/v1/auth/login' or 'v1/auth/login'
 * @returns {string} - e.g. '/api/v1/auth/login'
 */
export const getApiUrl = (endpoint = '') => {
    if (!endpoint) return API_URL;
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    if (cleanEndpoint.startsWith('/api/')) {
        return BACKEND_URL ? `${BACKEND_URL}${cleanEndpoint}` : cleanEndpoint;
    }
    return `${API_URL}${cleanEndpoint}`;
};
