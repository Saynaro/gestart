import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, Star, ArrowRight, Zap } from 'lucide-react';

export function SubscriptionSuccessPage() {
    const navigate = useNavigate();

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
            color: '#FFFFFF',
            padding: '20px'
        }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(16px)',
                    borderRadius: '24px',
                    padding: '48px 36px',
                    maxWidth: '480px',
                    width: '100%',
                    textAlign: 'center',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)'
                }}
            >
                <div style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '50%',
                    background: 'rgba(21, 128, 61, 0.2)',
                    color: '#22C55E',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 24px'
                }}>
                    <CheckCircle2 size={40} />
                </div>

                <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(85, 107, 47, 0.2)',
                    color: '#84CC16',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    marginBottom: '16px'
                }}>
                    <Star size={16} fill="currentColor" /> Paiement Confirmé
                </div>

                <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '12px', letterSpacing: '-0.02em' }}>
                    Félicitations ! 🎉
                </h1>
                <p style={{ color: '#94A3B8', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '32px' }}>
                    Votre abonnement ClimPro CRM a été activé avec succès. Toutes vos fonctionnalités Premium sont débloquées.
                </p>

                <button
                    onClick={() => navigate('/home')}
                    style={{
                        width: '100%',
                        padding: '16px',
                        borderRadius: '30px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #36451C 0%, #556B2F 100%)',
                        color: '#FFFFFF',
                        fontWeight: 700,
                        fontSize: '1rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                    }}
                >
                    Accéder à mon Dashboard <ArrowRight size={18} />
                </button>
            </motion.div>
        </div>
    );
}

export function SubscriptionCancelPage() {
    const navigate = useNavigate();

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
            color: '#FFFFFF',
            padding: '20px'
        }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(16px)',
                    borderRadius: '24px',
                    padding: '48px 36px',
                    maxWidth: '480px',
                    width: '100%',
                    textAlign: 'center',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)'
                }}
            >
                <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '12px' }}>
                    Paiement Annulé
                </h1>
                <p style={{ color: '#94A3B8', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '32px' }}>
                    L'opération de paiement a été interrompue. Vous pouvez réessayer à tout moment.
                </p>

                <button
                    onClick={() => navigate('/home')}
                    style={{
                        width: '100%',
                        padding: '16px',
                        borderRadius: '30px',
                        border: 'none',
                        background: 'rgba(255, 255, 255, 0.1)',
                        color: '#FFFFFF',
                        fontWeight: 700,
                        fontSize: '1rem',
                        cursor: 'pointer'
                    }}
                >
                    Retour au Dashboard
                </button>
            </motion.div>
        </div>
    );
}
