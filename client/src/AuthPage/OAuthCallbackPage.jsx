import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { setAuthToken, clearAuthToken } from '../utils/auth';
import { apiFetch, startProactiveTokenRefresh } from '../utils/api';
import { useUser } from '../utils/useUser';
import { CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';

export default function OAuthCallbackPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { refreshUser } = useUser();
    const [statusMessage, setStatusMessage] = useState("Vérification de votre compte Google...");
    const [errorMsg, setErrorMsg] = useState("");

    useEffect(() => {
        const processOAuth = async () => {
            const error = searchParams.get('error');
            if (error) {
                setErrorMsg(error === 'no_code' ? 'Code d’autorisation manquant' : 'Échec de la connexion Google');
                setTimeout(() => navigate('/login?error=oauth_failed', { replace: true }), 2500);
                return;
            }

            const isGoogleSignup = searchParams.get('google_signup') === 'true';

            // CAS 1 : Utilisateur n'a pas encore de compte GestArt -> redirection vers la finalisation d'inscription
            if (isGoogleSignup) {
                setStatusMessage("Compte Google vérifié ! Redirection vers la finalisation de votre profil...");
                const email = searchParams.get('email') || '';
                const firstName = searchParams.get('firstName') || '';
                const lastName = searchParams.get('lastName') || '';
                const avatarUrl = searchParams.get('avatarUrl') || '';
                const googleToken = searchParams.get('googleToken') || '';

                const params = new URLSearchParams();
                params.set('google_signup', 'true');
                if (email) params.set('email', email);
                if (firstName) params.set('firstName', firstName);
                if (lastName) params.set('lastName', lastName);
                if (avatarUrl) params.set('avatarUrl', avatarUrl);
                if (googleToken) params.set('googleToken', googleToken);

                setTimeout(() => {
                    navigate(`/register?${params.toString()}`, { replace: true });
                }, 600);
                return;
            }

            // CAS 2 : Connexion réussie à un compte existant
            const token = searchParams.get('token');
            if (token) {
                setStatusMessage("Connexion sécurisée en cours...");
                clearAuthToken();
                localStorage.removeItem('currentUser');
                localStorage.removeItem('userEmail');

                setAuthToken(token);
                startProactiveTokenRefresh();

                try {
                    const res = await apiFetch('/v1/auth/me');
                    const user = res.data?.user || res.user;

                    if (user) {
                        localStorage.setItem('currentUser', JSON.stringify(user));
                        if (user.email) localStorage.setItem('userEmail', user.email.toLowerCase().trim());
                        window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: { user } }));
                        await refreshUser().catch(() => null);

                        if (user.email === 'khalid.cizdoev777@gmail.com' || user.role === 'SUPERADMIN') {
                            navigate('/admin', { replace: true });
                        } else if (user.role === 'TECHNICIAN') {
                            navigate('/interventions/today', { replace: true });
                        } else {
                            navigate('/home', { replace: true });
                        }
                        return;
                    }
                } catch (fetchErr) {
                    console.warn("Erreur chargement profil utilisateur:", fetchErr);
                }

                // Fallback direct si l'appel me a échoué mais le token est valide
                navigate('/home', { replace: true });
                return;
            }

            // Si aucun paramètre reconnu
            navigate('/login', { replace: true });
        };

        processOAuth();
    }, [searchParams, navigate, refreshUser]);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            width: '100%',
            background: 'var(--background, #0F172A)',
            color: 'var(--foreground, #F8FAFC)',
            gap: 20,
            padding: 24,
            textAlign: 'center'
        }}>
            <div style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'rgba(59, 130, 246, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(59, 130, 246, 0.25)'
            }}>
                {errorMsg ? (
                    <AlertCircle size={28} color="#EF4444" />
                ) : (
                    <div style={{
                        width: 32,
                        height: 32,
                        border: '3px solid rgba(255,255,255,0.15)',
                        borderTopColor: '#3B82F6',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite'
                    }} />
                )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>
                    {errorMsg ? "Erreur de connexion" : "GestArt x Google"}
                </h3>
                <p style={{ margin: 0, fontSize: '0.92rem', color: 'var(--muted-foreground, #94A3B8)' }}>
                    {errorMsg || statusMessage}
                </p>
            </div>

            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
