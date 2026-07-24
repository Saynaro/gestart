import React, { useState } from "react";
import { Building, Plus, CheckCircle2, RefreshCw, Shield, CreditCard } from "lucide-react";

export default function BanquesTab({ isMobileView, triggerToast }) {
    const [bankName, setBankName] = useState("Boursorama Banque Pro");
    const [iban, setIban] = useState("FR76 3000 3020 5001 2345 6789 012");
    const [bic, setBIC] = useState("BNPAFRPPXXX");

    const [connectedAccounts, setConnectedAccounts] = useState([
        { id: 1, bank: "Boursorama Banque Pro", type: "Compte Pro principal", iban: "****4920", balance: "14 250,80 €", status: "Connecté (Bridge API)", lastSync: "Aujourd'hui à 11:30" },
        { id: 2, bank: "Qonto", type: "Compte Secondaire", iban: "****8812", balance: "2 410,00 €", status: "Connecté (Linxo API)", lastSync: "Hier à 18:00" }
    ]);

    const handleSubmit = (e) => {
        if (e) e.preventDefault();
        triggerToast("Coordonnées bancaires enregistrées pour l'impression PDF !");
    };

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Formulaire IBAN / BIC Principal */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', backgroundColor: 'var(--card)' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Building size={18} style={{ color: 'var(--sidebar-primary)' }} />
                    Coordonnées Bancaires Officielle (PDF Devis & Factures)
                </h3>

                <div className="profile-form-grid">
                    <div className="form-field form-group-full">
                        <label className="form-label">Nom de l'établissement bancaire</label>
                        <input type="text" className="form-input" value={bankName} onChange={(e) => setBankName(e.target.value)} required />
                    </div>

                    <div className="form-field">
                        <label className="form-label">IBAN (Format Français)</label>
                        <input type="text" className="form-input" value={iban} onChange={(e) => setIban(e.target.value)} style={{ fontFamily: 'monospace', fontWeight: 600 }} required />
                    </div>

                    <div className="form-field">
                        <label className="form-label">Code BIC / SWIFT</label>
                        <input type="text" className="form-input" value={bic} onChange={(e) => setBIC(e.target.value)} style={{ fontFamily: 'monospace', fontWeight: 600 }} required />
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                    <button type="submit" className="save-profile-btn" style={{ padding: '9px 20px', backgroundColor: 'var(--sidebar-primary)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                        Enregistrer l'IBAN
                    </button>
                </div>
            </div>

            {/* Open Banking - Comptes connectés */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', backgroundColor: 'var(--card)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>Comptes Bancaires Synchro Open Banking</h4>
                            <span style={{ backgroundColor: 'rgba(91, 77, 219, 0.1)', color: 'var(--sidebar-primary)', fontSize: '10px', padding: '2px 8px', borderRadius: '50px', fontWeight: 800 }}>V2 BRIDGE / LINXO</span>
                        </div>
                        <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: 'var(--muted-foreground)' }}>Synchronisation automatique des réglements factures avec votre banque.</p>
                    </div>

                    <button
                        type="button"
                        onClick={() => triggerToast("Redirection vers la passerelle sécurisée Bridge / DSP2...")}
                        style={{ padding: '9px 16px', backgroundColor: 'var(--sidebar-primary)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <Plus size={15} />
                        Connecter une autre banque
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {connectedAccounts.map((acc) => (
                        <div key={acc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', border: '1px solid var(--border)', borderRadius: '10px', backgroundColor: 'var(--background)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: 'rgba(91, 77, 219, 0.08)', color: 'var(--sidebar-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <CreditCard size={20} />
                                </div>
                                <div>
                                    <span style={{ fontSize: '14px', fontWeight: 700, display: 'block' }}>{acc.bank} — {acc.iban}</span>
                                    <span style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>{acc.type} • Synchro : {acc.lastSync}</span>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--foreground)', display: 'block' }}>{acc.balance}</span>
                                <span style={{ color: '#22c55e', fontSize: '11px', fontWeight: 700 }}>{acc.status}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </form>
    );
}
