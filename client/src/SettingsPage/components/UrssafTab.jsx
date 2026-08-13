import React, { useState } from "react";
import { Link, RefreshCw, CheckCircle2, AlertCircle, ShieldCheck } from "lucide-react";

export default function UrssafTab({ isMobileView, triggerToast, triggerConfirm }) {
    const [isConnected, setIsConnected] = useState(true);
    const [siret, setSiret] = useState("94408772500015");
    const [lastSyncDate, setLastSyncDate] = useState("24/07/2026 09:15");

    const syncHistory = [
        { date: "24/07/2026 09:15", status: "Succès", details: "Synchro CA & Cotisations T2" },
        { date: "15/04/2026 14:20", status: "Succès", details: "Synchro CA T1" },
        { date: "15/01/2026 10:05", status: "Succès", details: "Synchro CA T4 2025" }
    ];

    const handleSyncNow = () => {
        triggerToast("Synchronisation avec l'API URSSAF en cours...");
        setTimeout(() => {
            setLastSyncDate("Maintenant (24/07/2026 13:43)");
            triggerToast("Données URSSAF à jour !");
        }, 1200);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Statut de connexion */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', backgroundColor: 'var(--card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '10px', backgroundColor: isConnected ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: isConnected ? '#22c55e' : '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Link size={24} />
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>API URSSAF Auto-Entrepreneur</h3>
                            <span style={{ backgroundColor: isConnected ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)', color: isConnected ? '#22c55e' : '#ef4444', fontSize: '11px', padding: '2px 8px', borderRadius: '50px', fontWeight: 700 }}>
                                {isConnected ? "CONNECTÉ" : "NON CONNECTÉ"}
                            </span>
                        </div>
                        <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: 'var(--muted-foreground)' }}>
                            SIRET associé : <strong>{siret}</strong> • Dernière synchro : {lastSyncDate}
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        type="button"
                        onClick={handleSyncNow}
                        style={{ padding: '9px 16px', backgroundColor: 'var(--sidebar-primary)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <RefreshCw size={15} />
                        Synchroniser maintenant
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            if (isConnected) {
                                if (triggerConfirm) {
                                    triggerConfirm({
                                        title: "Déconnexion URSSAF",
                                        message: "Êtes-vous sûr de vouloir déconnecter votre compte URSSAF de GestArt ?",
                                        confirmText: "Déconnecter",
                                        cancelText: "Annuler",
                                        onConfirm: () => {
                                            setIsConnected(false);
                                            triggerToast("Compte URSSAF déconnecté.");
                                        }
                                    });
                                } else {
                                    setIsConnected(false);
                                    triggerToast("Compte URSSAF déconnecté.");
                                }
                            } else {
                                setIsConnected(true);
                                triggerToast("Compte URSSAF connecté !");
                            }
                        }}
                        style={{ padding: '9px 16px', backgroundColor: 'var(--background)', color: 'var(--foreground)', border: '1px solid var(--border)', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                    >
                        {isConnected ? "Déconnecter" : "Se connecter"}
                    </button>
                </div>
            </div>

            {/* Note V2 API */}
            <div style={{ padding: '14px 18px', backgroundColor: 'rgba(91, 77, 219, 0.04)', borderRadius: '10px', border: '1px solid rgba(91, 77, 219, 0.15)', fontSize: '13px', color: 'var(--muted-foreground)' }}>
                <span style={{ fontWeight: 700, color: 'var(--sidebar-primary)', display: 'block', marginBottom: '2px' }}>📌 Intégration Directe URSSAF (V2) :</span>
                La connexion directe permet de télétransmettre vos déclarations de CA sans quitter GestArt dès que le guichet API Urssaf ouvre les accès publics.
            </div>

            {/* Historique des synchronisations */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', backgroundColor: 'var(--card)' }}>
                <h4 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: 700 }}>Historique des synchronisations</h4>
                {isMobileView ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {syncHistory.map((item, idx) => (
                            <div key={idx} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'var(--background)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--foreground)' }}>{item.details}</span>
                                    <span style={{ color: '#22c55e', fontWeight: 700, fontSize: '12px' }}>{item.status}</span>
                                </div>
                                <span style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>{item.date}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted-foreground)', textAlign: 'left' }}>
                                    <th style={{ padding: '8px' }}>Date & Heure</th>
                                    <th style={{ padding: '8px' }}>Détails</th>
                                    <th style={{ padding: '8px', textAlign: 'right' }}>Statut</th>
                                </tr>
                            </thead>
                            <tbody>
                                {syncHistory.map((item, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '10px 8px', fontWeight: 500 }}>{item.date}</td>
                                        <td style={{ padding: '10px 8px' }}>{item.details}</td>
                                        <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                                            <span style={{ color: '#22c55e', fontWeight: 700, fontSize: '12px' }}>{item.status}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
