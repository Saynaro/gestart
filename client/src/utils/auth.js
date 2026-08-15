/**
 * Centralized Authentication & Token Management Utilities
 */

// Function to set Auth Token in both localStorage and 30-day Cookie
export function setAuthToken(token) {
    if (token) {
        localStorage.setItem('accessToken', token);
        // Set 30 days cookie
        document.cookie = `accessToken=${encodeURIComponent(token)}; path=/; max-age=2592000; SameSite=Lax`;
    }
}

// Function to get Auth Token (checks localStorage first, then Cookie)
export function getAuthToken() {
    const localToken = localStorage.getItem('accessToken');
    if (localToken && localToken.trim() !== '') {
        return localToken;
    }
    // Fallback to cookie
    const cookies = document.cookie.split(';');
    for (let c of cookies) {
        const [name, val] = c.trim().split('=');
        if (name === 'accessToken' && val) {
            const cookieToken = decodeURIComponent(val);
            localStorage.setItem('accessToken', cookieToken); // sync to localStorage
            return cookieToken;
        }
    }
    return null;
}

// Function to clear Auth Token (clears localStorage & cookie)
export function clearAuthToken() {
    localStorage.removeItem('accessToken');
    document.cookie = 'accessToken=; path=/; max-age=0; SameSite=Lax';
    document.cookie = 'accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
}

// Function to verify if user is authenticated & token is valid
export function isAuthenticated() {
    const token = getAuthToken();
    if (!token) return false;
    
    // As long as a token exists, consider authenticated and let apiFetch perform silent refresh if expired
    return true;
}

// Global logout function
export function handleLogout(navigate) {
    clearAuthToken();
    localStorage.removeItem('userEmail');
    localStorage.removeItem('currentUser');
    // Stop background token refresh interval
    import('./api.js').then(({ stopProactiveTokenRefresh }) => {
        stopProactiveTokenRefresh();
    }).catch(() => {});
    if (navigate) {
        navigate('/login', { replace: true });
    } else {
        window.location.href = '/login';
    }
}

// Function to verify if current user is Super Admin (khalid.cizdoev777@gmail.com or SUPERADMIN role)
export function isSuperAdmin() {
    if (!isAuthenticated()) return false;
    const userEmail = localStorage.getItem('userEmail');
    if (userEmail === 'khalid.cizdoev777@gmail.com') return true;
    
    const token = getAuthToken();
    if (token) {
        try {
            const parts = token.split('.');
            if (parts.length === 3) {
                const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
                if (payload.role === 'SUPERADMIN' || payload.email === 'khalid.cizdoev777@gmail.com') {
                    return true;
                }
            }
        } catch (e) {}
    }

    try {
        const storedUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        if (storedUser.role === 'SUPERADMIN' || storedUser.email === 'khalid.cizdoev777@gmail.com') {
            return true;
        }
    } catch (e) {}

    return userEmail === 'khalid.cizdoev777@gmail.com';
}
