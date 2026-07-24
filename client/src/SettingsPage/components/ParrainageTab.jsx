import React, { useState } from "react";
import { Gift, Copy, Check, Users, Sparkles, Share2 } from "lucide-react";

export default function ParrainageTab({ isMobileView, triggerToast }) {
    const [copied, setCopied] = useState(false);
    const referralCode = "KHALID777";
    const referralLink = `https://gestart.fr/ref/${referralCode}`;

    const referralsHistory = [
        { email: "contact@clim-azur.fr", date: "12/06/2026", status: "Abonné Pro", reward: "1 mois offert (Juillet 2026)" },
        { email: "plomberie.martin@gmail.com", date: "04/05/2026", status: "Abonné Starter", reward: "1 mois offert (Juin 2026)" },
        { email: "elec.nice@gmail.com", date: "18/03/2026", status: "Abonné Pro", reward: "1 mois offert (Avril 2026)" }
    ];

    const handleCopy = () => {
        navigator.clipboard.writeText(referralLink);
        setCopied(true);
        triggerToast("Lien de parrainage copié dans le presse-papier !");
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Banner Parrainage */}
            <div style={{ background: 'linear-gradient(135deg, rgba(91, 77, 219, 0.1) 0%, rgba(91, 77, 219, 0.02) 100%)', border: '1px solid rgba(91, 77, 219, 0.25)', borderRadius: '14px', padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <Gift size={24} style={{ color: 'var(--sidebar-primary)' }} />
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>Programme de Parrainage Artisans</h3>
                </div>
                <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--muted-foreground)', lineHeight: '1.5' }}>
                    Recommandez GestArt à vos confrères artisans (chauffagistes, électriciens, plombiers). Pour chaque artisan qui s'abonne, vous recevez <strong>1 mois offert</strong> sur votre abonnement !
                </p>

                {/* Lien Unique Input */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input
                        type="text"
                        className="form-input"
                        value={referralLink}
                        readOnly
                        style={{ flex: 1, backgroundColor: '#fff', fontWeight: 700, color: 'var(--sidebar-primary)' }}
                    />
                    <button
                        type="button"
                        onClick={handleCopy}
                        style={{ padding: '10px 18px', backgroundColor: 'var(--sidebar-primary)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                        {copied ? "Copié !" : "Copier le lien"}
                    </button>
                </div>
            </div>

            {/* Metric Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--muted-foreground)', fontWeight: 600 }}>Parrainages réussis</span>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--sidebar-primary)', marginTop: '4px' }}>
                        3 artisans
                    </div>
                </div>

                <div style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--muted-foreground)', fontWeight: 600 }}>Mois d'abonnement gagnés</span>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#22c55e', marginTop: '4px' }}>
                        3 mois offerts (117 € économisés)
                    </div>
                </div>
            </div>

            {/* Historique des parrainages */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', backgroundColor: 'var(--card)' }}>
                <h4 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: 700 }}>Historique de vos parrainages</h4>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted-foreground)', textAlign: 'left' }}>
                                <th style={{ padding: '8px' }}>Email Filleul</th>
                                <th style={{ padding: '8px' }}>Date d'inscription</th>
                                <th style={{ padding: '8px' }}>Formule</th>
                                <th style={{ padding: '8px', textAlign: 'right' }}>Récompense</th>
                            </tr>
                        </thead>
                        <tbody>
                            {referralsHistory.map((item, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '10px 8px', fontWeight: 600 }}>{item.email}</td>
                                    <td style={{ padding: '10px 8px' }}>{item.date}</td>
                                    <td style={{ padding: '10px 8px' }}>
                                        <span style={{ backgroundColor: 'rgba(91, 77, 219, 0.1)', color: 'var(--sidebar-primary)', fontSize: '11px', padding: '2px 8px', borderRadius: '50px', fontWeight: 700 }}>
                                            {item.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700, color: '#22c55e' }}>{item.reward}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
