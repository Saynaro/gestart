export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';

export const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173');

export const API_URL = import.meta.env.VITE_API_URL || `${BACKEND_URL}/api`;

/**
 * Helper to construct full API URLs cleanly.
 * @param {string} endpoint - e.g. '/v1/auth/login' or 'v1/auth/login'
 * @returns {string} - e.g. 'http://localhost:5001/api/v1/auth/login'
 */
export const getApiUrl = (endpoint = '') => {
    if (!endpoint) return API_URL;
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    if (cleanEndpoint.startsWith('/api/')) {
        return `${BACKEND_URL}${cleanEndpoint}`;
    }
    return `${API_URL}${cleanEndpoint}`;
};
