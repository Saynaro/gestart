import React, { useState } from "react";
import { Link, CheckCircle2, XCircle, AlertCircle, RefreshCw, HelpCircle, ExternalLink, X, BookOpen, Info } from "lucide-react";
import BottomSheetModal from "../../components/BottomSheetModal";

const SOFTWARE_GUIDES = {
    Pennylane: {
        name: "Pennylane",
        badge: "Comptabilité & Facturation",
        title: "Comment connecter votre compte Pennylane",
        directUrl: "https://app.pennylane.com",
        steps: [
            {
                title: "1. Rendez-vous sur Pennylane",
                desc: "Connectez-vous sur app.pennylane.com avec vos identifiants d'entreprise."
            },
            {
                title: "2. Paramètres API",
                desc: "Allez dans Paramètres de l'entreprise ➔ Développeurs & API ➔ Clés API."
            },
            {
                title: "3. Générez une clé API",
                desc: "Créez une nouvelle clé nommée « Mon CRM » avec les droits facturation."
            },
            {
                title: "4. Enregistrez dans votre CRM",
                desc: "Collez la clé API dans le champ ci-dessous et cliquez sur Tester la connexion."
            }
        ],
        tip: "La synchronisation permet la transmission automatique des factures à votre expert-comptable."
    },
    Indy: {
        name: "Indy",
        badge: "Comptabilité Indépendants",
        title: "Comment connecter ou exporter vers Indy",
        directUrl: "https://app.indy.fr",
        steps: [
            {
                title: "1. Ouvrez votre espace Indy",
                desc: "Connectez-vous sur app.indy.fr."
            },
            {
                title: "2. Clé d'intégration",
                desc: "Dans Paramètres ➔ Connexions & API, récupérez votre jeton d'accès."
            },
            {
                title: "3. Alternative Export FEC (1-clic)",
                desc: "Vous pouvez également télécharger le fichier FEC officiel (Fichier des Écritures Comptables) depuis cette page et l'importer dans Indy."
            }
        ],
        tip: "Les écritures et factures émises depuis le CRM respectent les normes comptables de l'administration fiscale."
    },
    MyUnisoft: {
        name: "MyUnisoft",
        badge: "Portail Expert-Comptable",
        title: "Comment interconnecter MyUnisoft",
        directUrl: "https://app.myunisoft.fr",
        steps: [
            {
                title: "1. Accédez à MyUnisoft",
                desc: "Connectez-vous à votre portail client sur app.myunisoft.fr."
            },
            {
                title: "2. Demandez la clé d'API",
                desc: "Dans les paramètres du dossier ou auprès de votre cabinet, activez l'accès API client."
            },
            {
                title: "3. Enregistrez le jeton",
                desc: "Renseignez la clé API dans votre CRM."
            }
        ],
        tip: "Votre comptable reçoit vos factures de vente en temps réel sans ressaisie manuelle."
    },
    QuickBooks: {
        name: "QuickBooks",
        badge: "Comptabilité Internationale",
        title: "Comment connecter QuickBooks",
        directUrl: "https://quickbooks.intuit.com",
        steps: [
            {
                title: "1. Connectez-vous à QuickBooks",
                desc: "Accédez à votre espace Intuit QuickBooks Online."
            },
            {
                title: "2. Clé API & App Token",
                desc: "Dans Paramètres ➔ Applications ➔ Clé d'API développeur."
            },
            {
                title: "3. Synchronisez vos ventes",
                desc: "Collez la clé pour automatiser le journal des ventes."
            }
        ],
        tip: "Permet la synchronisation des factures et règlements multi-devises."
    }
};

function AccountingIntegration() {
    const [software, setSoftware] = useState("Pennylane");
    const [apiKey, setApiKey] = useState("pennylane_live_a8f92j7s92k5j3s1");
    const [syncOnSend, setSyncOnSend] = useState(true);
    const [syncOnPay, setSyncOnPay] = useState(true);
    const [syncOnCreate, setSyncOnCreate] = useState(false);
    
    const [connectionStatus, setConnectionStatus] = useState("connected"); // 'connected', 'disconnected', 'testing'
    const [lastSync, setLastSync] = useState("18/07 09:00");
    const [showGuideModal, setShowGuideModal] = useState(false);

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

    const currentGuide = SOFTWARE_GUIDES[software] || SOFTWARE_GUIDES.Pennylane;

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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label className="form-label" style={{ margin: 0 }}>Logiciel de comptabilité</label>
                        <button
                            type="button"
                            onClick={() => setShowGuideModal(true)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#2563EB',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '2px 6px'
                            }}
                        >
                            <HelpCircle size={14} />
                            Comment connecter {software} ?
                        </button>
                    </div>
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

            {/* Modal / Bottom Sheet Guide de Connexion */}
            <BottomSheetModal
                isOpen={showGuideModal}
                onClose={() => setShowGuideModal(false)}
                maxWidth="540px"
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div>
                        <span style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            backgroundColor: 'rgba(37, 99, 235, 0.15)',
                            color: '#2563EB',
                            padding: '3px 9px',
                            borderRadius: '12px'
                        }}>
                            {currentGuide.badge}
                        </span>
                        <h3 style={{ margin: '6px 0 0 0', fontSize: '18px', fontWeight: 800, color: 'var(--foreground)' }}>
                            {currentGuide.title}
                        </h3>
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowGuideModal(false)}
                        style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer', padding: '6px' }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Direct portal link */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    backgroundColor: 'var(--accent)',
                    border: '1px solid var(--border)',
                    marginBottom: '16px'
                }}>
                    <div>
                        <div style={{ fontSize: '13.5px', fontWeight: 700 }}>Espace officiel {currentGuide.name}</div>
                        <div style={{ fontSize: '11.5px', color: 'var(--muted-foreground)', marginTop: '2px' }}>{currentGuide.directUrl}</div>
                    </div>
                    <a
                        href={currentGuide.directUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '8px 14px',
                            borderRadius: '8px',
                            backgroundColor: '#2563EB',
                            color: '#fff',
                            textDecoration: 'none',
                            fontSize: '12.5px',
                            fontWeight: 700
                        }}
                    >
                        Ouvrir <ExternalLink size={13} />
                    </a>
                </div>

                {/* Steps */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                    {currentGuide.steps.map((s, idx) => (
                        <div key={idx} style={{
                            padding: '12px 14px',
                            borderRadius: '10px',
                            border: '1px solid var(--border)',
                            backgroundColor: 'var(--background)'
                        }}>
                            <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#2563EB', marginBottom: '4px' }}>
                                {s.title}
                            </div>
                            <div style={{ fontSize: '12.5px', color: 'var(--muted-foreground)', lineHeight: 1.45 }}>
                                {s.desc}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Tip */}
                {currentGuide.tip && (
                    <div style={{
                        padding: '12px 14px',
                        borderRadius: '10px',
                        backgroundColor: 'rgba(16, 185, 129, 0.08)',
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                        fontSize: '12.5px',
                        color: 'var(--foreground)',
                        lineHeight: 1.4,
                        marginBottom: '16px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px'
                    }}>
                        <Info size={16} style={{ color: '#10b981', flexShrink: 0, marginTop: '1px' }} />
                        <div><strong>Astuce :</strong> {currentGuide.tip}</div>
                    </div>
                )}

                <button
                    type="button"
                    onClick={() => setShowGuideModal(false)}
                    style={{
                        width: '100%',
                        padding: '13px',
                        borderRadius: '12px',
                        border: 'none',
                        backgroundColor: 'var(--sidebar-primary)',
                        color: '#fff',
                        fontWeight: 800,
                        fontSize: '14.5px',
                        cursor: 'pointer'
                    }}
                >
                    Compris, fermer le guide
                </button>
            </BottomSheetModal>
        </div>
    );
}

export default AccountingIntegration;
