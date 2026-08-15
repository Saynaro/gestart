import React, { useState, useEffect } from "react";
import { 
    Building, 
    ShieldCheck, 
    CheckCircle2, 
    AlertTriangle, 
    RefreshCw, 
    Link, 
    Unlink, 
    Download, 
    ExternalLink, 
    FileText, 
    Radio, 
    Info, 
    Loader2, 
    Check, 
    Zap,
    Send,
    Inbox
} from "lucide-react";
import { apiFetch } from "../../utils/api";
import { LegalHelpTooltip } from "../../components/LegalHelpModal";

export default function EInvoicingTab({ isMobileView, triggerToast }) {
    const [loading, setLoading] = useState(true);
    const [testing, setTesting] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [connectionData, setConnectionData] = useState(null);
    const [showConfigModal, setShowConfigModal] = useState(false);

    // Form inputs for modal
    const [selectedProvider, setSelectedProvider] = useState("B2BROUTER");
    const [apiKeyInput, setApiKeyInput] = useState("");
    const [accountIdInput, setAccountIdInput] = useState("");
    const [envInput, setEnvInput] = useState("sandbox");

    const fetchConnection = async () => {
        try {
            setLoading(true);
            const res = await apiFetch("/v1/e-invoicing/connection");
            if (res.data?.connection) {
                setConnectionData(res.data.connection);
                if (res.data.connection.provider) setSelectedProvider(res.data.connection.provider);
                if (res.data.connection.providerAccountId) setAccountIdInput(res.data.connection.providerAccountId);
                if (res.data.connection.environment) setEnvInput(res.data.connection.environment);
            }
        } catch (err) {
            console.warn("Error fetching e-invoicing connection:", err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConnection();
    }, []);

    const handleTestConnection = async () => {
        try {
            setTesting(true);
            const res = await apiFetch("/v1/e-invoicing/test", { method: "POST" });
            if (res.data?.connected) {
                triggerToast(`Connexion vérifiée avec succès ! (Latence: ${res.data.latencyMs}ms)`);
                fetchConnection();
            } else {
                triggerToast(res.data?.error || "Échec du test de connexion", true);
            }
        } catch (err) {
            triggerToast(err.message || "Erreur lors du test de connexion", true);
        } finally {
            setTesting(false);
        }
    };

    const handleSaveConnection = async (e) => {
        if (e) e.preventDefault();
        if (!apiKeyInput && !connectionData?.connected) {
            triggerToast("Veuillez saisir votre clé API B2Brouter", true);
            return;
        }

        try {
            setSaving(true);
            const res = await apiFetch("/v1/e-invoicing/connect", {
                method: "POST",
                body: JSON.stringify({
                    provider: selectedProvider,
                    apiKey: apiKeyInput,
                    accountId: accountIdInput || undefined,
                    environment: envInput
                })
            });

            triggerToast(res.message || "Plateforme Agréée connectée avec succès !");
            setShowConfigModal(false);
            setApiKeyInput("");
            fetchConnection();
        } catch (err) {
            triggerToast(err.message || "Erreur lors de la connexion", true);
        } finally {
            setSaving(false);
        }
    };

    const handleDisconnect = async () => {
        if (!window.confirm("Êtes-vous sûr de vouloir déconnecter votre Plateforme Agréée ?")) return;
        try {
            setSaving(true);
            await apiFetch("/v1/e-invoicing/connection", { method: "DELETE" });
            triggerToast("Plateforme Agréée déconnectée.");
            fetchConnection();
        } catch (err) {
            triggerToast(err.message || "Erreur lors de la déconnexion", true);
        } finally {
            setSaving(false);
        }
    };

    const handleRunReconciliation = async () => {
        try {
            setSyncing(true);
            const res = await apiFetch("/v1/e-invoicing/reconciliation/run", { method: "POST" });
            triggerToast(`Synchronisation terminée (${res.data?.reconciledCount || 0} document(s) synchronisé(s))`);
            fetchConnection();
        } catch (err) {
            triggerToast(err.message || "Erreur lors de la synchronisation", true);
        } finally {
            setSyncing(false);
        }
    };

    const isConnected = connectionData?.connected;
    const company = connectionData?.company || {};

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '12px' }}>
                <Loader2 size={32} className="spin-loader" style={{ color: 'var(--sidebar-primary)' }} />
                <span style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>Chargement du statut de facturation électronique...</span>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Banner Légal Réforme 2026/2027 */}
            <div style={{
                background: 'linear-gradient(135deg, rgba(85, 107, 47, 0.08) 0%, rgba(37, 99, 235, 0.08) 100%)',
                border: '1px solid rgba(85, 107, 47, 0.25)',
                borderRadius: '16px',
                padding: '20px',
                display: 'flex',
                gap: '16px',
                alignItems: 'flex-start'
            }}>
                <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    backgroundColor: 'var(--sidebar-primary)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                }}>
                    <ShieldCheck size={24} />
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--foreground)' }}>
                            Réforme de la Facturation Électronique (DGFiP / AIFE)
                        </h3>
                        <span style={{
                            padding: '2px 8px',
                            borderRadius: '6px',
                            backgroundColor: '#22C55E',
                            color: '#fff',
                            fontSize: '11px',
                            fontWeight: 800
                        }}>
                            CONFORME 2026 / 2027
                        </span>
                    </div>
                    <p style={{ margin: '8px 0 0 0', fontSize: '13px', lineHeight: 1.5, color: 'var(--muted-foreground)' }}>
                        GestArt intègre le protocole d'échange sécurisé via Plateforme Agréée (PA). Votre entreprise est prête pour l'obligation de <strong>réception des factures B2B au 1er septembre 2026</strong> et préparée pour l'émission généralisée 2027.
                    </p>
                </div>
            </div>

            {/* Section 1 : Identité Entreprise Émettrice */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', backgroundColor: 'var(--card)' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Building size={18} style={{ color: 'var(--sidebar-primary)' }} />
                    Votre Entreprise (Identifiants Légaux art. 289 CGI)
                    <LegalHelpTooltip lawArticle="art. 289 CGI" title="Identité légale émetteur" text="Le SIREN/SIRET et le numéro de TVA intracommunautaire sont obligatoires pour le routage des factures électroniques." />
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <div style={{ padding: '12px 16px', backgroundColor: 'var(--background)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '11px', color: 'var(--muted-foreground)', fontWeight: 600, textTransform: 'uppercase' }}>Raison Sociale</span>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--foreground)', marginTop: '4px' }}>
                            {company.name || "Non renseigné"}
                        </div>
                    </div>
                    <div style={{ padding: '12px 16px', backgroundColor: 'var(--background)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '11px', color: 'var(--muted-foreground)', fontWeight: 600, textTransform: 'uppercase' }}>SIRET (14 Chiffres)</span>
                        <div style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--foreground)', marginTop: '4px' }}>
                            {company.siret || "Non renseigné"}
                        </div>
                    </div>
                    <div style={{ padding: '12px 16px', backgroundColor: 'var(--background)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '11px', color: 'var(--muted-foreground)', fontWeight: 600, textTransform: 'uppercase' }}>SIREN (9 Chiffres)</span>
                        <div style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--foreground)', marginTop: '4px' }}>
                            {company.siren || (company.siret ? company.siret.substring(0, 9) : "Non renseigné")}
                        </div>
                    </div>
                    <div style={{ padding: '12px 16px', backgroundColor: 'var(--background)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '11px', color: 'var(--muted-foreground)', fontWeight: 600, textTransform: 'uppercase' }}>TVA Intracommunautaire</span>
                        <div style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--foreground)', marginTop: '4px' }}>
                            {company.tvaNumber || "Non renseigné"}
                        </div>
                    </div>
                </div>
            </div>

            {/* Section 2 : Plateforme Agréée Partenaire */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', backgroundColor: 'var(--card)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Zap size={18} style={{ color: 'var(--sidebar-primary)' }} />
                            Plateforme Agréée (B2Brouter / PDP)
                        </h3>
                        <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: 'var(--muted-foreground)' }}>
                            Acheminement officiel et interconnexion avec le réseau national de facturation.
                        </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {isConnected ? (
                            <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 12px',
                                borderRadius: '20px',
                                backgroundColor: 'rgba(34, 197, 94, 0.12)',
                                color: '#16A34A',
                                fontSize: '12px',
                                fontWeight: 800
                            }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#16A34A' }} />
                                🟢 Connectée ({connectionData.environment === 'production' ? 'Production' : 'Sandbox / Test'})
                            </span>
                        ) : (
                            <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 12px',
                                borderRadius: '20px',
                                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                                color: '#DC2626',
                                fontSize: '12px',
                                fontWeight: 800
                            }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#DC2626' }} />
                                🔴 Non connectée
                            </span>
                        )}
                    </div>
                </div>

                {/* Statut fonctionnel des flux */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: '14px',
                    margin: '20px 0'
                }}>
                    <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                            <Inbox size={18} style={{ color: '#16A34A' }} />
                            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--foreground)' }}>Réception des factures B2B</span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#16A34A', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            🟢 Activée (Obligatoire dès sept. 2026)
                        </div>
                        <p style={{ margin: '6px 0 0 0', fontSize: '11.5px', color: 'var(--muted-foreground)' }}>
                            Vos factures d'achats et fournisseurs sont reçues automatiquement dans l'onglet « Factures reçues ».
                        </p>
                    </div>

                    <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                            <Send size={18} style={{ color: '#EAB308' }} />
                            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--foreground)' }}>Émission B2B structurée</span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#CA8A04', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            🟡 Disponible à partir de 2027 / Optionnel
                        </div>
                        <p style={{ margin: '6px 0 0 0', fontSize: '11.5px', color: 'var(--muted-foreground)' }}>
                            Format Factur-X / UBL prêt pour transmission aux entreprises clientes dès l'application légale.
                        </p>
                    </div>

                    <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                            <FileText size={18} style={{ color: 'var(--sidebar-primary)' }} />
                            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--foreground)' }}>E-reporting & Encaissements</span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--sidebar-primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            🟢 Prêt selon statut TVA
                        </div>
                        <p style={{ margin: '6px 0 0 0', fontSize: '11.5px', color: 'var(--muted-foreground)' }}>
                            Les statuts de paiement des factures de prestations de services sont transmis pour le reporting fiscal.
                        </p>
                    </div>
                </div>

                {/* Actions Buttons */}
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '20px' }}>
                    <button
                        type="button"
                        onClick={() => setShowConfigModal(true)}
                        style={{
                            padding: '10px 18px',
                            borderRadius: '10px',
                            backgroundColor: 'var(--sidebar-primary)',
                            color: '#fff',
                            border: 'none',
                            fontWeight: 700,
                            fontSize: '13px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        <Link size={16} />
                        {isConnected ? "Modifier la configuration" : "Connecter ma Plateforme Agréée"}
                    </button>

                    {isConnected && (
                        <>
                            <button
                                type="button"
                                onClick={handleTestConnection}
                                disabled={testing}
                                style={{
                                    padding: '10px 18px',
                                    borderRadius: '10px',
                                    backgroundColor: 'transparent',
                                    color: 'var(--foreground)',
                                    border: '1px solid var(--border)',
                                    fontWeight: 700,
                                    fontSize: '13px',
                                    cursor: testing ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                {testing ? <Loader2 size={16} className="spin-loader" /> : <RefreshCw size={16} />}
                                Tester la connexion
                            </button>

                            <button
                                type="button"
                                onClick={handleRunReconciliation}
                                disabled={syncing}
                                style={{
                                    padding: '10px 18px',
                                    borderRadius: '10px',
                                    backgroundColor: 'transparent',
                                    color: 'var(--foreground)',
                                    border: '1px solid var(--border)',
                                    fontWeight: 700,
                                    fontSize: '13px',
                                    cursor: syncing ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                {syncing ? <Loader2 size={16} className="spin-loader" /> : <Inbox size={16} />}
                                Synchroniser les factures reçues
                            </button>

                            <button
                                type="button"
                                onClick={handleDisconnect}
                                style={{
                                    padding: '10px 18px',
                                    borderRadius: '10px',
                                    backgroundColor: 'rgba(239, 68, 68, 0.08)',
                                    color: '#DC2626',
                                    border: '1px solid rgba(239, 68, 68, 0.2)',
                                    fontWeight: 700,
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    marginLeft: 'auto'
                                }}
                            >
                                <Unlink size={16} />
                                Déconnecter
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Modal de Configuration Sécurisée */}
            {showConfigModal && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.7)',
                    backdropFilter: 'blur(8px)',
                    zIndex: 999999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}>
                    <div style={{
                        backgroundColor: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: '20px',
                        padding: '28px',
                        maxWidth: '520px',
                        width: '100%',
                        boxShadow: '0 25px 60px rgba(0,0,0,0.3)'
                    }}>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 800, color: 'var(--foreground)' }}>
                            Configuration de la Plateforme Agréée
                        </h3>
                        <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: 'var(--muted-foreground)', lineHeight: 1.5 }}>
                            Renseignez votre clé API B2Brouter pour activer la réception automatique des factures et l'interconnexion légale. Les clés sont chiffrées en AES-256 et sécurisées.
                        </p>

                        <form onSubmit={handleSaveConnection} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--foreground)' }}>
                                    Plateforme Agréée
                                </label>
                                <select
                                    className="form-input"
                                    value={selectedProvider}
                                    onChange={(e) => setSelectedProvider(e.target.value)}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px' }}
                                >
                                    <option value="B2BROUTER">B2Brouter (Recommandé / Certifié DGFiP)</option>
                                    <option value="PENNYLANE">Pennylane (Comptabilité)</option>
                                    <option value="SAGE">Sage Network</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--foreground)' }}>
                                    Environnement
                                </label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setEnvInput("sandbox")}
                                        style={{
                                            flex: 1,
                                            padding: '10px',
                                            borderRadius: '8px',
                                            border: envInput === "sandbox" ? '2px solid var(--sidebar-primary)' : '1px solid var(--border)',
                                            backgroundColor: envInput === "sandbox" ? 'rgba(85, 107, 47, 0.1)' : 'var(--background)',
                                            fontWeight: 700,
                                            fontSize: '13px',
                                            cursor: 'pointer',
                                            color: envInput === "sandbox" ? 'var(--sidebar-primary)' : 'var(--foreground)'
                                        }}
                                    >
                                        🧪 Sandbox / Test
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEnvInput("production")}
                                        style={{
                                            flex: 1,
                                            padding: '10px',
                                            borderRadius: '8px',
                                            border: envInput === "production" ? '2px solid var(--sidebar-primary)' : '1px solid var(--border)',
                                            backgroundColor: envInput === "production" ? 'rgba(85, 107, 47, 0.1)' : 'var(--background)',
                                            fontWeight: 700,
                                            fontSize: '13px',
                                            cursor: 'pointer',
                                            color: envInput === "production" ? 'var(--sidebar-primary)' : 'var(--foreground)'
                                        }}
                                    >
                                        🚀 Production
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--foreground)' }}>
                                    Clé API (X-B2B-API-Key)
                                </label>
                                <input
                                    type="password"
                                    className="form-input"
                                    placeholder={isConnected ? "•••••••••••••••••••• (Inchangée)" : "Ex: b2b_live_xxxxxxxxxxxxxx"}
                                    value={apiKeyInput}
                                    onChange={(e) => setApiKeyInput(e.target.value)}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', fontFamily: 'monospace' }}
                                />
                                <span style={{ fontSize: '11px', color: 'var(--muted-foreground)', marginTop: '4px', display: 'block' }}>
                                    Générez votre clé depuis votre espace <em>B2Brouter &gt; Développeurs</em>.
                                </span>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--foreground)' }}>
                                    Account ID (Optionnel si auto-détecté)
                                </label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Ex: 12345 ou project_id"
                                    value={accountIdInput}
                                    onChange={(e) => setAccountIdInput(e.target.value)}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', fontFamily: 'monospace' }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowConfigModal(false)}
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        borderRadius: '10px',
                                        border: '1px solid var(--border)',
                                        backgroundColor: 'transparent',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        color: 'var(--foreground)'
                                    }}
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        borderRadius: '10px',
                                        border: 'none',
                                        backgroundColor: 'var(--sidebar-primary)',
                                        color: '#fff',
                                        fontWeight: 800,
                                        cursor: saving ? 'not-allowed' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    {saving ? <Loader2 size={16} className="spin-loader" /> : "Enregistrer et Connecter"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
