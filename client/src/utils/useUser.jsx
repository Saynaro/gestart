import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiFetch } from './api';
import { isAuthenticated } from './auth';

const UserContext = createContext({
    user: null,
    setUser: () => {},
    fullName: "Utilisateur",
    firstName: "Utilisateur",
    lastName: "",
    initials: "U",
    email: "",
    role: "OWNER",
    companyName: "Mon Entreprise",
    loading: false,
    refreshUser: () => {},
});

export function UserProvider({ children }) {
    const [user, setUser] = useState(() => {
        try {
            const saved = localStorage.getItem('currentUser');
            if (saved) return JSON.parse(saved);
        } catch (e) {}
        return null;
    });
    const [loading, setLoading] = useState(() => {
        try {
            return !localStorage.getItem('currentUser');
        } catch (e) {
            return true;
        }
    });

    const refreshUser = useCallback(async () => {
        if (!isAuthenticated()) {
            setUser(null);
            setLoading(false);
            return null;
        }
        try {
            const res = await apiFetch('/v1/auth/me');
            const userData = res.data?.user || res.user;
            if (userData) {
                setUser(userData);
                localStorage.setItem('currentUser', JSON.stringify(userData));
                if (userData.email) localStorage.setItem('userEmail', userData.email);
                return userData;
            }
        } catch (e) {
            console.warn("Could not fetch user profile:", e.message);
        } finally {
            setLoading(false);
        }
        return null;
    }, []);

    useEffect(() => {
        refreshUser();

        const handleUserChanged = (e) => {
            if (e?.detail === null) {
                setUser(null);
                setLoading(false);
                return;
            }
            if (e?.detail) {
                setUser(e.detail);
                localStorage.setItem('currentUser', JSON.stringify(e.detail));
            } else {
                refreshUser();
            }
        };

        const handleUserLoggedIn = (e) => {
            if (e?.detail) {
                const loggedUser = e.detail.user || e.detail;
                setUser(loggedUser);
                localStorage.setItem('currentUser', JSON.stringify(loggedUser));
            }
            refreshUser();
        };

        const handleUserLoggedOut = () => {
            setUser(null);
            setLoading(false);
        };

        window.addEventListener('userProfileChanged', handleUserChanged);
        window.addEventListener('userLoggedIn', handleUserLoggedIn);
        window.addEventListener('userLoggedOut', handleUserLoggedOut);
        window.addEventListener('companyUpdated', () => refreshUser());
        window.addEventListener('storage', handleUserChanged);
        return () => {
            window.removeEventListener('userProfileChanged', handleUserChanged);
            window.removeEventListener('userLoggedIn', handleUserLoggedIn);
            window.removeEventListener('userLoggedOut', handleUserLoggedOut);
            window.removeEventListener('companyUpdated', () => refreshUser());
            window.removeEventListener('storage', handleUserChanged);
        };
    }, [refreshUser]);

    const firstName = user?.firstName || (user?.email ? user.email.split('@')[0] : "Utilisateur");
    const lastName = user?.lastName || "";
    const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || "Utilisateur";
    const avatarUrl = user?.avatarUrl || null;
    
    // Calculate 2-letter Initials
    const initials = (() => {
        if (user?.firstName && user?.lastName) {
            return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
        }
        if (user?.firstName) {
            return user.firstName.substring(0, 2).toUpperCase();
        }
        if (user?.email) {
            return user.email.substring(0, 2).toUpperCase();
        }
        return "U";
    })();

    const email = user?.email || "";
    const role = user?.role || "OWNER";
    const company = user?.company || {};
    const companyName = company.name || user?.companyName || "Mon Entreprise";

    return (
        <UserContext.Provider value={{
            user,
            setUser,
            avatarUrl,
            company,
            fullName,
            firstName,
            lastName,
            initials,
            email,
            role,
            companyName,
            loading,
            refreshUser
        }}>
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    return useContext(UserContext);
}
