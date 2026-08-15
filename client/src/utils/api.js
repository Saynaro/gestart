import { API_URL, BACKEND_URL } from './config';
import { getAuthToken, setAuthToken, clearAuthToken } from './auth';

// ─── Silent Refresh State ────────────────────────────────────────────────────
let isRefreshing = false;
let refreshSubscribers = []; // Queue of callbacks waiting for new token

function onTokenRefreshed(newToken) {
    refreshSubscribers.forEach(cb => cb(newToken));
    refreshSubscribers = [];
}

function subscribeTokenRefresh(cb) {
    refreshSubscribers.push(cb);
}

// ─── Core Silent Refresh ─────────────────────────────────────────────────────
export async function silentRefresh() {
    if (isRefreshing) {
        // Already refreshing — wait for it
        return new Promise((resolve) => {
            subscribeTokenRefresh((newToken) => resolve(newToken));
        });
    }

    isRefreshing = true;
    try {
        const refreshRes = await fetch(`${API_URL}/v1/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });

        if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            const newToken = refreshData.data?.accessToken || refreshData.accessToken;
            if (newToken) {
                setAuthToken(newToken);
                onTokenRefreshed(newToken);
                return newToken;
            }
        }

        // Refresh failed — logout
        clearAuthToken();
        const currentPath = window.location.pathname;
        if (currentPath !== '/login' && currentPath !== '/register' && currentPath !== '/') {
            window.location.href = '/login';
        }
        return null;
    } catch (e) {
        console.warn('Silent refresh error:', e);
        return null;
    } finally {
        isRefreshing = false;
    }
}

// ─── Proactive Background Refresh ───────────────────────────────────────────
// Decodes JWT and returns expiry timestamp in milliseconds
function getTokenExpiry(token) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        return payload.exp ? payload.exp * 1000 : null;
    } catch {
        return null;
    }
}

// Start a background interval that proactively refreshes the access token
// 3 minutes before it expires, so the user never gets kicked out
let _refreshIntervalId = null;

export function startProactiveTokenRefresh() {
    if (_refreshIntervalId) return; // Already running

    _refreshIntervalId = setInterval(async () => {
        const token = getAuthToken();
        if (!token) return;

        const expiry = getTokenExpiry(token);
        if (!expiry) return;

        const msUntilExpiry = expiry - Date.now();

        // Refresh if token expires within 3 minutes (180,000ms)
        if (msUntilExpiry < 180_000) {
            console.debug('[Auth] Token expiring soon, refreshing proactively...');
            await silentRefresh();
        }
    }, 30_000); // Check every 30 seconds
}

export function stopProactiveTokenRefresh() {
    if (_refreshIntervalId) {
        clearInterval(_refreshIntervalId);
        _refreshIntervalId = null;
    }
}

// ─── Main apiFetch ───────────────────────────────────────────────────────────
export async function apiFetch(endpoint, options = {}) {
    let token = getAuthToken();

    // Proactively refresh if token is about to expire (< 60s left)
    if (token) {
        const expiry = getTokenExpiry(token);
        if (expiry && (expiry - Date.now()) < 60_000) {
            token = await silentRefresh() || token;
        }
    }

    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
    };

    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = cleanEndpoint.startsWith('/api/')
        ? `${BACKEND_URL}${cleanEndpoint}`
        : `${API_URL}${cleanEndpoint}`;

    let response = await fetch(url, { ...options, headers, credentials: 'include' });

    // If 401 — attempt silent refresh and retry once
    if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
        const newToken = await silentRefresh();

        if (newToken) {
            headers['Authorization'] = `Bearer ${newToken}`;
            response = await fetch(url, { ...options, headers, credentials: 'include' });
        }

        // If still 401 after refresh — redirect to login
        if (response.status === 401) {
            clearAuthToken();
            const currentPath = window.location.pathname;
            if (currentPath !== '/login' && currentPath !== '/register' && currentPath !== '/') {
                window.location.href = '/login';
            }
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
        if (response.status === 403 && (data.code === 'SUBSCRIPTION_EXPIRED' || (data.message && data.message.toLowerCase().includes('expirée')))) {
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('subscription_expired', { detail: data }));
            }
        }
        const error = new Error(data.message || `Erreur HTTP ${response.status}`);
        error.status = response.status;
        error.data = data;
        throw error;
    }

    return data;
}

export default apiFetch;
