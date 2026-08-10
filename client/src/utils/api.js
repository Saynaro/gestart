import { API_URL, BACKEND_URL } from './config';

/**
 * Standardized API client helper for making authenticated requests to the backend.
 * Automatically attaches Authorization header if token exists in localStorage.
 *
 * @param {string} endpoint - API route relative to API_URL (e.g. '/v1/quotes' or '/v1/clients')
 * @param {RequestInit} [options] - Standard fetch options
 * @returns {Promise<any>} - Parsed JSON response
 */
export async function apiFetch(endpoint, options = {}) {
    const token = localStorage.getItem('accessToken');
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
