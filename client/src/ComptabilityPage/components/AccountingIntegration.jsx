import React, { useState } from "react";
import { Link, CheckCircle2, XCircle, AlertCircle, RefreshCw } from "lucide-react";

function AccountingIntegration() {
    const [software, setSoftware] = useState("Pennylane");
    const [apiKey, setApiKey] = useState("pennylane_live_a8f92j7s92k5j3s1");
    const [syncOnSend, setSyncOnSend] = useState(true);
    const [syncOnPay, setSyncOnPay] = useState(true);
    const [syncOnCreate, setSyncOnCreate] = useState(false);
    
    const [connectionStatus, setConnectionStatus] = useState("connected"); // 'connected', 'disconnected', 'testing'
    const [lastSync, setLastSync] = useState("18/07 09:00");

    const handleTestConnection = () => {
        setConnectionStatus("testing");
        setTimeout(() => {
            if (apiKey.trim().length > 10) {
                setConnectionStatus("connected");
                setLastSync(new Date().toLocaleDateString("fr-FR") + " " + new Date().toLocaleTimeString("fr-FR", { hour: '2-digit', minute: '2-digit' }));
                alert("✓ Test de connexion réussi avec " + software + " !");
            } else {
                setConnectionStatus("disconnected");
                alert("✗ Échec de connexion : Clé API invalide ou expirée.");
            }
        }, 1200);
    };

    const handleSaveSettings = () => {
        alert("✓ Paramètres d'intégration enregistrés !");
    };

    return (
        <div className="comptability-card">
            <div className="widget-header">
                <div className="title-area">
                    <div className="header-icon-container">
                        <Link size={18} />
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h3>Intégration Comptable</h3>
                            <span className="premium-badge">PRO</span>
                        </div>
                        <p className="subtitle">Synchronisez automatiquement vos factures avec votre logiciel comptable</p>
                    </div>
                </div>
            </div>

            <div className="integration-form">
                {/* Software choice */}
                <div className="form-field">
                    <label className="form-label">Logiciel de comptabilité</label>
                    <select 
                        className="profile-input option-select"
                        value={software}
                        onChange={(e) => setSoftware(e.target.value)}
                    >
                        <option value="Pennylane">Pennylane</option>
                        <option value="Indy">Indy</option>
                        <option value="MyUnisoft">MyUnisoft</option>
                        <option value="QuickBooks">QuickBooks</option>
                    </select>
                </div>

                {/* API Key */}
                <div className="form-field">
                    <label className="form-label">Clé API / Token d'accès</label>
                    <input 
                        type="password" 
                        className="profile-input" 
                        value={apiKey} 
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Entrez votre clé API secrète"
                    />
                </div>

                {/* Checkboxes sync */}
                <div className="sync-checkboxes-section">
                    <span className="section-label">Options de synchronisation automatique :</span>
                    <div className="checkboxes-list">
                        <label className="checkbox-item">
                            <input 
                                type="checkbox" 
                                checked={syncOnSend} 
                                onChange={(e) => setSyncOnSend(e.target.checked)}
                            />
                            <span>À l'envoi de la facture au client</span>
                        </label>
                        <label className="checkbox-item">
                            <input 
                                type="checkbox" 
                                checked={syncOnPay} 
                                onChange={(e) => setSyncOnPay(e.target.checked)}
                            />
                            <span>Au paiement de la facture (marqué réglée)</span>
                        </label>
                        <label className="checkbox-item">
                            <input 
                                type="checkbox" 
                                checked={syncOnCreate} 
                                onChange={(e) => setSyncOnCreate(e.target.checked)}
                            />
                            <span>À la création du brouillon de facture</span>
                        </label>
                    </div>
                </div>

                {/* Connection status display */}
                <div className="connection-status-panel">
                    <span className="status-label">Statut de connexion :</span>
                    <div className="status-display">
                        {connectionStatus === "connected" && (
                            <div className="status-wrap text-success">
                                <CheckCircle2 size={16} />
                                <span>Connecté · Dernière sync: {lastSync}</span>
                            </div>
                        )}
                        {connectionStatus === "disconnected" && (
                            <div className="status-wrap text-danger">
                                <XCircle size={16} />
                                <span>Déconnecté (Veuillez tester la clé)</span>
                            </div>
                        )}
                        {connectionStatus === "testing" && (
                            <div className="status-wrap text-warning animation-spin">
                                <RefreshCw size={16} className="spin-icon" />
                                <span>Test de connexion en cours...</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Form buttons */}
                <div className="integration-actions">
                    <button 
                        type="button" 
                        className="integration-btn test-btn"
                        onClick={handleTestConnection}
                        disabled={connectionStatus === "testing"}
                    >
                        Tester la connexion
                    </button>
                    <button 
                        type="button" 
                        className="integration-btn save-btn"
                        onClick={handleSaveSettings}
                    >
                        Enregistrer
                    </button>
                </div>
            </div>
        </div>
    );
}

export default AccountingIntegration;
