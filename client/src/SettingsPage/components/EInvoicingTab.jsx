import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
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
    Inbox,
    Sparkles,
    Search,
    HelpCircle,
    X,
    BookOpen
} from "lucide-react";
import { apiFetch } from "../../utils/api";
import { LegalHelpTooltip } from "../../components/LegalHelpModal";
import BottomSheetModal from "../../components/BottomSheetModal";

const PROVIDER_GUIDES = {
    B2BROUTER: {
        name: "B2Brouter",
        badge: "PDP Agréée / PPF",
        title: "Comment obtenir votre clé API B2Brouter",
        directUrl: "https://app.b2brouter.net",
        steps: [
            {
                title: "1. Connectez-vous à B2Brouter",
                desc: "Rendez-vous sur app.b2brouter.net (l'inscription est gratuite pour les artisans et micro-entreprises)."
            },
            {
                title: "2. Allez dans les Paramètres d'intégration",
                desc: "Dans le menu ou en haut à droite, cliquez sur ⚙️ Paramètres ➔ Intégration (ou Clé API / Développeurs)."
            },
            {
                title: "3. Générez votre clé API",
                desc: "Cliquez sur « Générer une nouvelle clé API » et copiez la clé affichée."
            },
            {
                title: "4. Collez la clé dans votre CRM",
                desc: "Collez votre clé API dans le champ ci-dessous et cliquez sur « Enregistrer »."
            }
        ],
        tip: "La connexion est immédiate et permet d'émettre et de recevoir automatiquement vos factures électroniques conformes."
    },
    QONTO: {
        name: "Qonto",
        badge: "Banque & Plateforme Agréée",
        title: "Comment connecter votre compte Qonto",
        directUrl: "https://app.qonto.com",
        steps: [
            {
                title: "1. Ouvrez votre espace Qonto",
                desc: "Connectez-vous sur app.qonto.com avec votre compte professionnel."
            },
            {
                title: "2. Accédez aux Clés API",
                desc: "Cliquez sur Paramètres ➔ Intégrations & Partenaires ➔ Clés d'API & Développeurs."
            },
            {
                title: "3. Récupérez vos identifiants",
                desc: "Copiez votre Clé Secrète (Secret Key) et votre Identifiant d'Organisation (Organization ID)."
            },
            {
                title: "4. Enregistrez dans votre CRM",
                desc: "Collez la clé API dans le formulaire pour activer la synchronisation automatique des factures et paiements."
            }
        ],
        tip: "La connexion directe sécurisée permet la réconciliation bancaire automatique de vos factures émises."
    },
    SAGE_ACTIVE: {
        name: "Sage Active",
        badge: "PDP / Réseau Sage",
        title: "Comment connecter Sage Active",
        directUrl: "https://developer.sage.com/sageactive",
        steps: [
            {
                title: "1. Accédez au portail Sage",
                desc: "Connectez-vous sur votre espace Sage Active ou Sage Network."
            },
            {
                title: "2. Paramètres API & Raccordement",
                desc: "Allez dans Paramètres d'entreprise ➔ Applications connectées ➔ Générer un jeton d'accès."
            },
            {
                title: "3. Copiez le jeton",
                desc: "Copiez le token API fourni par Sage Active."
            },
            {
                title: "4. Collez dans le CRM",
                desc: "Renseignez le jeton dans le champ Clé API et enregistrez."
            }
        ],
        tip: "Compatible avec les flux PDP Sage Network pour l'émission et la réception certifiée."
    },
    PPF: {
        name: "Portail Public de Facturation (Chorus Pro / PPF)",
        badge: "Plateforme Publique Gratuite",
        title: "Comment raccorder Chorus Pro / PPF",
        directUrl: "https://portail.chorus-pro.gouv.fr",
        steps: [
            {
                title: "1. Rendez-vous sur Chorus Pro",
                desc: "Connectez-vous sur portail.chorus-pro.gouv.fr avec vos identifiants d'entreprise."
            },
            {
                title: "2. Gestion des Raccordements EDI / API",
                desc: "Allez dans Espace Entreprise ➔ Raccordements API / Fiche Structure."
            },
            {
                title: "3. Créez un compte technique",
                desc: "Générez un mot de passe technique API pour votre compte."
            },
            {
                title: "4. Renseignez la clé",
                desc: "Collez votre clé ou jeton d'accès PPF dans votre CRM."
            }
        ],
        tip: "Le PPF est le portail public gratuit de l'État pour la transmission des factures B2G (secteur public) et B2B."
    },
    PENNYLANE: {
        name: "Pennylane",
        badge: "Comptabilité & Facturation",
        title: "Comment connecter votre compte Pennylane",
        directUrl: "https://app.pennylane.com",
        steps: [
            {
                title: "1. Ouvrez Pennylane",
                desc: "Connectez-vous à votre espace entreprise sur app.pennylane.com."
            },
            {
                title: "2. Section Développeurs",
                desc: "Allez dans Paramètres de l'entreprise ➔ Intégrations ➔ Clés API."
            },
            {
                title: "3. Créez une nouvelle clé",
                desc: "Nommez-la « Mon CRM » et accordez les droits de lecture/écriture factures."
            },
            {
                title: "4. Enregistrez dans votre CRM",
                desc: "Collez la clé API (commençant par pennylane_...) et sauvegardez."
            }
        ],
        tip: "Toutes vos factures et devis validés seront instantanément synchronisés avec votre expert-comptable."
    },
    INDY: {
        name: "Indy",
        badge: "Comptabilité Indépendants",
        title: "Comment synchroniser vos factures avec Indy",
        directUrl: "https://app.indy.fr",
        steps: [
            {
                title: "1. Connectez-vous sur Indy",
                desc: "Ouvrez votre tableau de bord sur app.indy.fr."
            },
            {
                title: "2. Option 1 : Connexion API directe",
                desc: "Si disponible sur votre offre, récupérez votre token d'intégration dans Paramètres ➔ Connexions."
            },
            {
                title: "3. Option 2 : Export FEC / Factur-X (1-clic)",
                desc: "Vous pouvez également exporter vos écritures au format légal FEC depuis l'onglet Comptabilité de votre CRM et les importer directement dans Indy."
            }
        ],
        tip: "Le format FEC et Factur-X généré par votre CRM est 100% compatible avec le moteur d'Indy."
    }
};

export default function EInvoicingTab({ isMobileView, triggerToast }) {
    const [loading, setLoading] = useState(true);
    const [testing, setTesting] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [provisioning, setProvisioning] = useState(false);
    const [connectionData, setConnectionData] = useState(null);
    const [providersCatalog, setProvidersCatalog] = useState([]);
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [guideModalProvider, setGuideModalProvider] = useState(null);

    // Form inputs for modal
    const [selectedProvider, setSelectedProvider] = useState("B2BROUTER");
    const [apiKeyInput, setApiKeyInput] = useState("");
    const [accountIdInput, setAccountIdInput] = useState("");

    // Invoices list state
    const [receivedInvoices, setReceivedInvoices] = useState([]);
    const [invoiceSearch, setInvoiceSearch] = useState("");
    const [loadingInvoices, setLoadingInvoices] = useState(false);

    const fetchConnectionAndProviders = async () => {
        try {
            setLoading(true);
            const [connRes, provRes] = await Promise.all([
                apiFetch("/v1/e-invoicing/connection"),
                apiFetch("/v1/e-invoicing/providers")
            ]);

            if (connRes.data?.connection) {
                setConnectionData(connRes.data.connection);
                if (connRes.data.connection.provider) setSelectedProvider(connRes.data.connection.provider);
                if (connRes.data.connection.providerAccountId) setAccountIdInput(connRes.data.connection.providerAccountId);
            }

            if (provRes.data?.providers) {
                setProvidersCatalog(provRes.data.providers);
            }
        } catch (err) {
            console.warn("Error fetching e-invoicing data:", err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchReceivedInvoices = async () => {
        try {
            setLoadingInvoices(true);
            const res = await apiFetch(`/v1/e-invoicing/invoices/received?search=${encodeURIComponent(invoiceSearch)}`);
            if (res.data?.invoices) {
                setReceivedInvoices(res.data.invoices);
            }
        } catch (err) {
            console.warn("Error fetching received invoices:", err.message);
        } finally {
            setLoadingInvoices(false);
        }
    };

    useEffect(() => {
        fetchConnectionAndProviders();
    }, []);

    useEffect(() => {
        if (connectionData?.connected) {
            fetchReceivedInvoices();
        }
    }, [connectionData?.connected, invoiceSearch]);

    const handleTestConnection = async () => {
        try {
            setTesting(true);
            const res = await apiFetch("/v1/e-invoicing/test", { method: "POST" });
            if (res.data?.connected) {
                triggerToast(`Connexion vérifiée avec succès ! (Latence: ${res.data.latencyMs || 45}ms)`);
                fetchConnectionAndProviders();
            } else {
                triggerToast(res.data?.error || "Échec du test de connexion", true);
            }
        } catch (err) {
            triggerToast(err.message || "Erreur lors du test de connexion", true);
        } finally {
            setTesting(false);
        }
    };

    const handleQuickProvision = async () => {
        try {
            setProvisioning(true);
            const res = await apiFetch("/v1/e-invoicing/provision", {
                method: "POST",
                body: JSON.stringify({ environment: "production" })
            });

            triggerToast(res.message || "Facturation électronique activée avec succès !");
            fetchConnectionAndProviders();
        } catch (err) {
            triggerToast(err.message || "Erreur lors de l'activation automatique", true);
        } finally {
            setProvisioning(false);
        }
    };

    const handleSaveConnection = async (e) => {
        if (e) e.preventDefault();
        if (!apiKeyInput && !connectionData?.connected) {
            triggerToast("Veuillez saisir votre clé API", true);
            return;
        }

        try {
            setSaving(true);
            const env = apiKeyInput.startsWith("test_") ? "sandbox" : "production";
            const res = await apiFetch("/v1/e-invoicing/connect", {
                method: "POST",
                body: JSON.stringify({
                    provider: selectedProvider,
                    apiKey: apiKeyInput,
                    accountId: accountIdInput || undefined,
                    environment: env
                })
            });

            triggerToast(res.message || "Plateforme Agréée connectée avec succès !");
            setShowConfigModal(false);
            setApiKeyInput("");
            fetchConnectionAndProviders();
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
            fetchConnectionAndProviders();
        } catch (err) {
            triggerToast(err.message || "Erreur lors de la déconnexion", true);
        } finally {
            setSaving(false);
        }
    };

    const handleSync = async () => {
        try {
            setSyncing(true);
            const res = await apiFetch("/v1/e-invoicing/sync", { method: "POST" });
            triggerToast(res.message || "Synchronisation terminée avec succès");
            fetchConnectionAndProviders();
            fetchReceivedInvoices();
        } catch (err) {
            triggerToast(err.message || "Erreur lors de la synchronisation", true);
        } finally {
            setSyncing(false);
        }
    };

    const handleDownloadInvoice = async (invoiceId) => {
        try {
            window.open(`/api/v1/e-invoicing/invoices/received/${invoiceId}/download?format=pdf`, "_blank");
        } catch (err) {
            triggerToast("Erreur lors du téléchargement du document", true);
        }
    };

    const isConnected = connectionData?.connected;
    const company = connectionData?.company || {};
    const currentProvider = providersCatalog.find(p => p.id === (connectionData?.provider || selectedProvider)) || {};

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ padding: '20px', borderRadius: '16px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div className="skeleton-shimmer" style={{ width: '260px', height: '20px', borderRadius: '6px' }} />
                    <div className="skeleton-shimmer" style={{ width: '75%', height: '14px', borderRadius: '4px', opacity: 0.7 }} />
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobileView ? '14px' : '20px' }}>
            <style>{`
                @keyframes slideUpDrawer {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }
            `}</style>

            {/* Banner Réforme 2026 */}
            <div style={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: isMobileView ? '16px' : '16px',
                padding: isMobileView ? '16px 18px' : '20px',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '12px',
                flexWrap: 'wrap'
            }}>
                <div style={{ display: 'flex', gap: isMobileView ? '14px' : '16px', alignItems: 'flex-start' }}>
                    <div style={{
                        width: isMobileView ? '42px' : '44px',
                        height: isMobileView ? '42px' : '44px',
                        borderRadius: '12px',
                        backgroundColor: 'var(--accent)',
                        color: 'var(--foreground)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                    }}>
                        <ShieldCheck size={isMobileView ? 22 : 24} />
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <h3 style={{ margin: 0, fontSize: isMobileView ? '17px' : '17px', fontWeight: 800, color: 'var(--foreground)' }}>
                                Facturation Électronique (DGFiP)
                            </h3>
                            <span style={{
                                backgroundColor: 'var(--accent)',
                                color: 'var(--foreground)',
                                border: '1px solid var(--border)',
                                fontSize: isMobileView ? '11px' : '10px',
                                fontWeight: 800,
                                padding: '3px 8px',
                                borderRadius: '20px'
                            }}>
                                CONFORME DGFIP
                            </span>
                        </div>
                        <p style={{ margin: '6px 0 0 0', fontSize: isMobileView ? '13px' : '13px', color: 'var(--muted-foreground)', lineHeight: 1.45, maxWidth: '720px' }}>
                            Votre CRM est une <strong>Solution Compatible</strong> prête pour la réception (2026) et l'émission B2B via les <strong>Plateformes Agréées (PDP / PPF)</strong>.
                        </p>
                    </div>
                </div>
            </div>

            {/* Statut de Connexion Actuel */}
            <div style={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: isMobileView ? '16px' : '16px',
                padding: isMobileView ? '16px 18px' : '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            backgroundColor: isConnected ? '#16A34A' : '#94A3B8',
                            flexShrink: 0
                        }} />
                        <div>
                            <span style={{ fontSize: isMobileView ? '16px' : '15px', fontWeight: 800 }}>
                                {isConnected ? `Connecté à ${currentProvider.name || connectionData?.provider}` : "Aucune Plateforme Agréée connectée"}
                            </span>
                            <span style={{ display: 'block', fontSize: isMobileView ? '13px' : '11px', color: 'var(--muted-foreground)', marginTop: '2px' }}>
                                {isConnected
                                    ? "Connecté et actif pour l'émission et la réception de factures électroniques."
                                    : "Connectez votre compte PDP ou PPF pour émettre et recevoir vos factures."}
                            </span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', width: isMobileView ? '100%' : 'auto' }}>
                        {isConnected ? (
                            <>
                                <button
                                    type="button"
                                    onClick={handleTestConnection}
                                    disabled={testing}
                                    style={{
                                        flex: isMobileView ? 1 : 'none',
                                        padding: isMobileView ? '10px 14px' : '8px 12px',
                                        borderRadius: '10px',
                                        border: '1px solid var(--border)',
                                        backgroundColor: 'var(--background)',
                                        color: 'var(--foreground)',
                                        fontWeight: 700,
                                        fontSize: isMobileView ? '13px' : '12px',
                                        cursor: testing ? 'not-allowed' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    {testing ? <Loader2 size={14} className="spin-loader" /> : <RefreshCw size={14} />}
                                    Tester
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSync}
                                    disabled={syncing}
                                    style={{
                                        flex: isMobileView ? 1 : 'none',
                                        padding: isMobileView ? '10px 14px' : '8px 12px',
                                        borderRadius: '10px',
                                        border: '1px solid var(--border)',
                                        backgroundColor: 'var(--background)',
                                        color: 'var(--foreground)',
                                        fontWeight: 700,
                                        fontSize: isMobileView ? '13px' : '12px',
                                        cursor: syncing ? 'not-allowed' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    {syncing ? <Loader2 size={14} className="spin-loader" /> : <Inbox size={14} />}
                                    Sync
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDisconnect}
                                    disabled={saving}
                                    style={{
                                        padding: isMobileView ? '10px 14px' : '8px 12px',
                                        borderRadius: '10px',
                                        border: '1px solid var(--border)',
                                        backgroundColor: 'transparent',
                                        color: '#DC2626',
                                        fontWeight: 700,
                                        fontSize: isMobileView ? '13px' : '12px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '4px'
                                    }}
                                >
                                    <Unlink size={14} />
                                    Déconnecter
                                </button>
                            </>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setShowConfigModal(true)}
                                style={{
                                    width: isMobileView ? '100%' : 'auto',
                                    padding: isMobileView ? '12px 18px' : '10px 16px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    backgroundColor: 'var(--sidebar-primary)',
                                    color: '#fff',
                                    fontWeight: 800,
                                    fontSize: isMobileView ? '14px' : '13px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px'
                                }}
                            >
                                <Link size={16} />
                                Configurer manuellement (Clé API)
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Catalogue des Plateformes Agréées Supportées */}
            <div style={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: isMobileView ? '16px' : '16px',
                padding: isMobileView ? '16px 18px' : '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
            }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: isMobileView ? '17px' : '16px', fontWeight: 800, color: 'var(--foreground)' }}>
                        Plateformes Agréées (PDP / PPF) Disponibles
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: isMobileView ? '13px' : '12px', color: 'var(--muted-foreground)' }}>
                        Choisissez la plateforme avec laquelle interconnecter votre CRM.
                    </p>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobileView ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: isMobileView ? '12px' : '14px',
                    marginTop: '4px'
                }}>
                    {providersCatalog.map(p => {
                        const isCurrentActive = isConnected && connectionData?.provider === p.id;
                        const isAvailable = p.status === "AVAILABLE" || p.status === "ACTIVE";

                        return (
                            <div
                                key={p.id}
                                style={{
                                    border: isCurrentActive ? '2px solid #2563EB' : '1px solid var(--border)',
                                    borderRadius: '14px',
                                    padding: isMobileView ? '15px 16px' : '16px',
                                    backgroundColor: isCurrentActive ? 'rgba(37, 99, 235, 0.03)' : 'var(--background)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    gap: '12px'
                                }}
                            >
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h4 style={{ margin: 0, fontSize: isMobileView ? '16px' : '15px', fontWeight: 800 }}>{p.name}</h4>
                                        <span style={{
                                            fontSize: isMobileView ? '11px' : '10px',
                                            fontWeight: 800,
                                            padding: '3px 8px',
                                            borderRadius: '20px',
                                            backgroundColor: isCurrentActive ? '#16A34A' : isAvailable ? 'rgba(37, 99, 235, 0.15)' : 'var(--muted)',
                                            color: isCurrentActive ? '#fff' : isAvailable ? '#2563EB' : 'var(--muted-foreground)'
                                        }}>
                                            {isCurrentActive ? "CONNECTÉ" : isAvailable ? "DISPONIBLE" : "PARTENAIRE REQUIS"}
                                        </span>
                                    </div>
                                    <p style={{ margin: '6px 0 0 0', fontSize: isMobileView ? '13px' : '12px', color: 'var(--muted-foreground)', lineHeight: 1.4 }}>
                                        {p.description}
                                    </p>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <span style={{ fontSize: isMobileView ? '12.5px' : '11px', color: 'var(--muted-foreground)', fontWeight: 500 }}>
                                            Clé API
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setGuideModalProvider(p.id)}
                                            title="Comment obtenir les identifiants ?"
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: '#2563EB',
                                                cursor: 'pointer',
                                                padding: '2px',
                                                display: 'inline-flex',
                                                alignItems: 'center'
                                            }}
                                        >
                                            <HelpCircle size={16} />
                                        </button>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <button
                                            type="button"
                                            onClick={() => setGuideModalProvider(p.id)}
                                            style={{
                                                padding: isMobileView ? '8px 13px' : '6px 10px',
                                                borderRadius: '8px',
                                                backgroundColor: 'transparent',
                                                color: 'var(--foreground)',
                                                border: '1px solid var(--border)',
                                                fontSize: isMobileView ? '13px' : '11px',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '5px'
                                            }}
                                        >
                                            <BookOpen size={14} />
                                            Guide
                                        </button>

                                        {!isCurrentActive && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedProvider(p.id);
                                                    setShowConfigModal(true);
                                                }}
                                                style={{
                                                    padding: isMobileView ? '8px 16px' : '6px 14px',
                                                    borderRadius: '8px',
                                                    backgroundColor: '#2563EB',
                                                    color: '#fff',
                                                    border: 'none',
                                                    fontSize: isMobileView ? '13px' : '11px',
                                                    fontWeight: 800,
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Configurer
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Factures Fournisseurs Reçues */}
            {isConnected && (
                <div style={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: isMobileView ? '16px' : '16px',
                    padding: isMobileView ? '16px 18px' : '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: isMobileView ? '16px' : '16px', fontWeight: 800, color: 'var(--foreground)' }}>
                                Factures Fournisseurs Reçues
                            </h3>
                            <span style={{ fontSize: isMobileView ? '12.5px' : '11px', color: 'var(--muted-foreground)' }}>
                                Flux reçus en temps réel au format légal Factur-X / UBL
                            </span>
                        </div>

                        <div style={{ position: 'relative', width: isMobileView ? '100%' : '240px' }}>
                            <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--muted-foreground)' }} />
                            <input
                                type="text"
                                placeholder="Rechercher..."
                                value={invoiceSearch}
                                onChange={(e) => setInvoiceSearch(e.target.value)}
                                className="form-input"
                                style={{ width: '100%', paddingLeft: '32px', fontSize: isMobileView ? '13px' : '12px' }}
                            />
                        </div>
                    </div>

                    {loadingInvoices ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: '13px' }}>
                            <Loader2 size={20} className="spin-loader" style={{ margin: '0 auto 6px auto' }} />
                            Chargement des factures...
                        </div>
                    ) : receivedInvoices.length === 0 ? (
                        <div style={{
                            padding: '24px',
                            textAlign: 'center',
                            borderRadius: '10px',
                            border: '1px dashed var(--border)',
                            color: 'var(--muted-foreground)',
                            fontSize: '13px'
                        }}>
                            <Inbox size={26} style={{ margin: '0 auto 6px auto', opacity: 0.5 }} />
                            Aucune facture reçue pour le moment.
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--muted-foreground)' }}>
                                        <th style={{ padding: '8px 6px' }}>Numéro</th>
                                        <th style={{ padding: '8px 6px' }}>Fournisseur</th>
                                        <th style={{ padding: '8px 6px' }}>Date</th>
                                        <th style={{ padding: '8px 6px' }}>Total TTC</th>
                                        <th style={{ padding: '8px 6px' }}>Format</th>
                                        <th style={{ padding: '8px 6px' }}>Statut</th>
                                        <th style={{ padding: '8px 6px', textAlign: 'right' }}>Document</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {receivedInvoices.map(inv => (
                                        <tr key={inv.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                            <td style={{ padding: '10px 6px', fontWeight: 700 }}>{inv.invoiceNumber}</td>
                                            <td style={{ padding: '10px 6px' }}>{inv.supplierName}</td>
                                            <td style={{ padding: '10px 6px' }}>{new Date(inv.issueDate).toLocaleDateString("fr-FR")}</td>
                                            <td style={{ padding: '10px 6px', fontWeight: 800 }}>{Number(inv.totalTTC || 0).toFixed(2)} €</td>
                                            <td style={{ padding: '10px 6px' }}>
                                                <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', backgroundColor: 'var(--accent)' }}>
                                                    {inv.rawFormat || "Factur-X"}
                                                </span>
                                            </td>
                                            <td style={{ padding: '10px 6px' }}>
                                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#16A34A' }}>
                                                    ✓ Reçue
                                                </span>
                                            </td>
                                            <td style={{ padding: '10px 6px', textAlign: 'right' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDownloadInvoice(inv.id)}
                                                    style={{
                                                        padding: '4px 10px',
                                                        borderRadius: '6px',
                                                        border: '1px solid var(--border)',
                                                        backgroundColor: 'var(--background)',
                                                        cursor: 'pointer',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        fontSize: '12px'
                                                    }}
                                                >
                                                    <Download size={13} />
                                                    Factur-X
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Modal / Bottom Sheet de Configuration API Key */}
            <BottomSheetModal
                isOpen={showConfigModal}
                onClose={() => setShowConfigModal(false)}
                maxWidth="520px"
                isMobile={isMobileView}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: isMobileView ? '18px' : '18px', fontWeight: 800, color: 'var(--foreground)' }}>
                        Connexion ({selectedProvider})
                    </h3>
                    <button
                        type="button"
                        onClick={() => setShowConfigModal(false)}
                        style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer', padding: '6px' }}
                    >
                        <X size={20} />
                    </button>
                </div>
                <p style={{ margin: '0 0 16px 0', fontSize: isMobileView ? '13px' : '13px', color: 'var(--muted-foreground)', lineHeight: 1.45 }}>
                    Saisissez votre clé API. Vos identifiants sont chiffrés en AES-256-GCM.
                </p>

                {/* Helper banner for current selected provider */}
                <div style={{
                    backgroundColor: 'rgba(37, 99, 235, 0.08)',
                    border: '1px solid rgba(37, 99, 235, 0.25)',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <HelpCircle size={17} color="#2563EB" />
                        <span style={{ fontSize: isMobileView ? '12.5px' : '12px', fontWeight: 600, color: 'var(--foreground)' }}>
                            Où trouver ma clé API {selectedProvider} ?
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setGuideModalProvider(selectedProvider)}
                        style={{
                            backgroundColor: '#2563EB',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '6px 12px',
                            fontSize: isMobileView ? '12px' : '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            flexShrink: 0
                        }}
                    >
                        Voir tutoriel
                    </button>
                </div>

                <form onSubmit={handleSaveConnection} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: isMobileView ? '13.5px' : '13px', fontWeight: 700, marginBottom: '6px' }}>
                            Plateforme
                        </label>
                        <select
                            className="form-input"
                            value={selectedProvider}
                            onChange={(e) => setSelectedProvider(e.target.value)}
                            style={{ width: '100%', padding: '11px 12px', fontSize: isMobileView ? '14px' : '13px', borderRadius: '10px' }}
                        >
                            {providersCatalog.map(p => (
                                <option key={p.id} value={p.id}>{p.name} ({p.legalStatus})</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: isMobileView ? '13.5px' : '13px', fontWeight: 700, marginBottom: '6px' }}>
                            Clé API Secrète
                        </label>
                        <input
                            type="password"
                            className="form-input"
                            placeholder={isConnected ? "•••••••••••••••••••• (Inchangée)" : "Ex: test_6b8ad5be... ou live_..."}
                            value={apiKeyInput}
                            onChange={(e) => setApiKeyInput(e.target.value)}
                            style={{ width: '100%', padding: '11px 12px', fontSize: isMobileView ? '14px' : '13px', fontFamily: 'monospace', borderRadius: '10px' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: isMobileView ? '13.5px' : '13px', fontWeight: 700, marginBottom: '6px' }}>
                            Account ID (Optionnel)
                        </label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Auto-détecté si vide"
                            value={accountIdInput}
                            onChange={(e) => setAccountIdInput(e.target.value)}
                            style={{ width: '100%', padding: '11px 12px', fontSize: isMobileView ? '14px' : '13px', fontFamily: 'monospace', borderRadius: '10px' }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                        <button
                            type="button"
                            onClick={() => setShowConfigModal(false)}
                            style={{
                                flex: 1,
                                padding: isMobileView ? '13px' : '11px',
                                borderRadius: '12px',
                                border: '1px solid var(--border)',
                                backgroundColor: 'transparent',
                                fontWeight: 700,
                                fontSize: isMobileView ? '14.5px' : '13px',
                                cursor: 'pointer'
                            }}
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            style={{
                                flex: 1.2,
                                padding: isMobileView ? '13px' : '11px',
                                borderRadius: '12px',
                                border: 'none',
                                backgroundColor: 'var(--sidebar-primary)',
                                color: '#fff',
                                fontWeight: 800,
                                fontSize: isMobileView ? '14.5px' : '13px',
                                cursor: saving ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {saving ? <Loader2 size={16} className="spin-loader" /> : "Enregistrer"}
                        </button>
                    </div>
                </form>
            </BottomSheetModal>

            {/* Modal / Bottom Sheet Guide de Connexion / Tutoriel */}
            <BottomSheetModal
                isOpen={!!guideModalProvider}
                onClose={() => setGuideModalProvider(null)}
                maxWidth="560px"
                isMobile={isMobileView}
            >
                {guideModalProvider && (() => {
                    const guide = PROVIDER_GUIDES[guideModalProvider] || PROVIDER_GUIDES.B2BROUTER;
                    return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                        <span style={{
                                            fontSize: isMobileView ? '11px' : '10px',
                                            fontWeight: 800,
                                            backgroundColor: 'rgba(37, 99, 235, 0.15)',
                                            color: '#2563EB',
                                            padding: '3px 9px',
                                            borderRadius: '12px'
                                        }}>
                                            {guide.badge}
                                        </span>
                                    </div>
                                    <h3 style={{ margin: 0, fontSize: isMobileView ? '18px' : '18px', fontWeight: 800, color: 'var(--foreground)' }}>
                                        {guide.title}
                                    </h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setGuideModalProvider(null)}
                                    style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer', padding: '6px' }}
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Direct external link button */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '12px 14px',
                                borderRadius: '12px',
                                backgroundColor: 'var(--accent)',
                                border: '1px solid var(--border)'
                            }}>
                                <div>
                                    <div style={{ fontSize: isMobileView ? '13.5px' : '12px', fontWeight: 700 }}>Portail officiel {guide.name}</div>
                                    <div style={{ fontSize: isMobileView ? '11.5px' : '10px', color: 'var(--muted-foreground)', marginTop: '2px' }}>{guide.directUrl}</div>
                                </div>
                                <a
                                    href={guide.directUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        padding: isMobileView ? '8px 14px' : '6px 12px',
                                        borderRadius: '8px',
                                        backgroundColor: '#2563EB',
                                        color: '#fff',
                                        textDecoration: 'none',
                                        fontSize: isMobileView ? '12.5px' : '11px',
                                        fontWeight: 700
                                    }}
                                >
                                    Ouvrir <ExternalLink size={13} />
                                </a>
                            </div>

                            {/* Steps list */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {guide.steps.map((s, idx) => (
                                    <div key={idx} style={{
                                        padding: '12px 14px',
                                        borderRadius: '10px',
                                        border: '1px solid var(--border)',
                                        backgroundColor: 'var(--background)'
                                    }}>
                                        <div style={{ fontSize: isMobileView ? '13.5px' : '12px', fontWeight: 800, color: '#2563EB', marginBottom: '4px' }}>
                                            {s.title}
                                        </div>
                                        <div style={{ fontSize: isMobileView ? '12.5px' : '11px', color: 'var(--muted-foreground)', lineHeight: 1.45 }}>
                                            {s.desc}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Tip */}
                            {guide.tip && (
                                <div style={{
                                    padding: '12px 14px',
                                    borderRadius: '10px',
                                    backgroundColor: 'rgba(16, 185, 129, 0.08)',
                                    border: '1px solid rgba(16, 185, 129, 0.25)',
                                    fontSize: isMobileView ? '12.5px' : '11px',
                                    color: 'var(--foreground)',
                                    lineHeight: 1.4
                                }}>
                                    💡 <strong>Astuce :</strong> {guide.tip}
                                </div>
                            )}

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                                <button
                                    type="button"
                                    onClick={() => setGuideModalProvider(null)}
                                    style={{
                                        flex: 1,
                                        padding: isMobileView ? '13px' : '11px',
                                        borderRadius: '12px',
                                        border: '1px solid var(--border)',
                                        backgroundColor: 'transparent',
                                        fontWeight: 700,
                                        fontSize: isMobileView ? '14.5px' : '13px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Fermer
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedProvider(guideModalProvider);
                                        setGuideModalProvider(null);
                                        setShowConfigModal(true);
                                    }}
                                    style={{
                                        flex: 1.3,
                                        padding: isMobileView ? '13px' : '11px',
                                        borderRadius: '12px',
                                        border: 'none',
                                        backgroundColor: '#2563EB',
                                        color: '#fff',
                                        fontWeight: 800,
                                        fontSize: isMobileView ? '14.5px' : '13px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    J'ai ma clé, configurer
                                </button>
                            </div>
                        </div>
                    );
                })()}
            </BottomSheetModal>
        </div>
    );
}
