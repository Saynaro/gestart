import React from "react";
import { Star, ExternalLink, ThumbsUp, Award } from "lucide-react";

export default function AvisTab({ isMobileView, triggerToast }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Note Globale Banner */}
            <div style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.02) 100%)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '14px', padding: '20px', textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginBottom: '8px' }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} size={28} style={{ color: '#f59e0b', fill: '#f59e0b' }} />
                    ))}
                </div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '24px', fontWeight: 800 }}>4.9 sur 5</h3>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted-foreground)' }}>Basé sur plus de 120 avis d'artisans plombiers, chauffagistes et électriciens.</p>
            </div>

            {/* Liens Avis Google & Trustpilot */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                {/* Google My Business */}
                <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', backgroundColor: 'var(--card)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                            <span style={{ fontSize: '20px' }}>🌐</span>
                            <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Avis Google</h4>
                        </div>
                        <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted-foreground)', lineHeight: '1.4' }}>
                            Partagez votre expérience sur Google My Business pour aider les autres artisans de votre région à découvrir GestArt.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            window.open("https://google.com", "_blank");
                            triggerToast("Ouverture de Google My Business...");
                        }}
                        style={{ marginTop: '20px', padding: '10px 16px', borderRadius: '8px', backgroundColor: 'var(--sidebar-primary)', color: '#fff', border: 'none', fontWeight: 600, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                        <ExternalLink size={15} />
                        Laisser un avis sur Google
                    </button>
                </div>

                {/* Trustpilot */}
                <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', backgroundColor: 'var(--card)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                            <span style={{ fontSize: '20px' }}>⭐</span>
                            <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Trustpilot</h4>
                        </div>
                        <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted-foreground)', lineHeight: '1.4' }}>
                            Évaluez la qualité de notre service client, la réactivité du support et la simplicité de notre outil de facturation.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            window.open("https://trustpilot.com", "_blank");
                            triggerToast("Ouverture de Trustpilot...");
                        }}
                        style={{ marginTop: '20px', padding: '10px 16px', borderRadius: '8px', backgroundColor: '#00b67a', color: '#fff', border: 'none', fontWeight: 600, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                        <ExternalLink size={15} />
                        Donner mon avis sur Trustpilot
                    </button>
                </div>
            </div>
        </div>
    );
}
