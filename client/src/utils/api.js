import { API_URL, BACKEND_URL } from './config';
import { getAuthToken, clearAuthToken } from './auth';

/**
 *
 * @param {string} endpoint - API route relative to API_URL (e.g. '/v1/quotes' or '/v1/clients')
 * @param {RequestInit} [options] - Standard fetch options
 * @returns {Promise<any>} - Parsed JSON response
 */
export async function apiFetch(endpoint, options = {}) {
    const token = getAuthToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
    };

    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = cleanEndpoint.startsWith('/api/')
        ? `${BACKEND_URL}${cleanEndpoint}`
        : `${API_URL}${cleanEndpoint}`;

    const response = await fetch(url, {
        ...options,
        headers,
    });

    if (response.status === 401) {
        clearAuthToken();
        const currentPath = window.location.pathname;
        if (currentPath !== '/login' && currentPath !== '/register' && currentPath !== '/') {
            window.location.href = '/login';
        }
    }

    const text = await response.text();
    let data;
    try {
        data = text ? JSON.parse(text) : {};
    } catch (e) {
        data = { message: text };
    }

    if (!response.ok) {
        const error = new Error(data.message || `Erreur HTTP ${response.status}`);
        error.status = response.status;
        error.data = data;
        throw error;
    }

    return data;
}

export default apiFetch;
