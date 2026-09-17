import React, { useState, useEffect } from "react";
import {
    CreditCard,
    Building2,
    CheckCircle2,
    AlertCircle,
    ArrowUpRight,
    RefreshCw,
    Lock,
    ExternalLink,
    Loader2,
    Info,
    Percent,
    Landmark,
    Check,
    Copy,
    Calculator,
    User,
    Wallet
} from "lucide-react";
import { apiFetch } from "../../utils/api";
import { formatIBAN, formatBIC } from "../../utils/bankValidator";

export default function PaiementsTab({ isMobileView, triggerToast }) {
    // Payment Methods State
    const [bankTransferEnabled, setBankTransferEnabled] = useState(true);
    const [stripePaymentEnabled, setStripePaymentEnabled] = useState(false);
    const [stripeFeeBearer, setStripeFeeBearer] = useState("COMPANY"); // 'COMPANY' | 'CLIENT'

    // Bank Details
    const [bankIban, setBankIban] = useState("");
    const [bankBic, setBankBic] = useState("");
    const [bankAccountOwner, setBankAccountOwner] = useState("");
    const [bankName, setBankName] = useState("");

    // Stripe Connect Status
    const [stripeStatus, setStripeStatus] = useState({
        stripeAccountId: null,
        onboardingStatus: "NOT_STARTED", // NOT_STARTED, IN_PROGRESS, COMPLETE, REQUIRES_INFO
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        onlinePaymentEnabled: false,
        requirements: []
    });

    // Loading & Action States
    const [loadingInitial, setLoadingInitial] = useState(true);
    const [savingSettings, setSavingSettings] = useState(false);
    const [onboardingLoading, setOnboardingLoading] = useState(false);
    const [syncingStripe, setSyncingStripe] = useState(false);
    const [ibanCopied, setIbanCopied] = useState(false);
    const [simAmount, setSimAmount] = useState(1000);

    // Fetch payment settings and Stripe status
    const loadPaymentData = async () => {
        try {
            const [stripeRes, settingsRes] = await Promise.allSettled([
                apiFetch("/v1/stripe/connect/status"),
                apiFetch("/v1/company/settings")
            ]);

            if (stripeRes.status === "fulfilled" && stripeRes.value?.data) {
                const d = stripeRes.value.data;
                setStripeStatus(d);
                if (d.bankTransferEnabled !== undefined) setBankTransferEnabled(d.bankTransferEnabled);
                if (d.stripePaymentEnabled !== undefined) setStripePaymentEnabled(d.stripePaymentEnabled);
                if (d.stripeFeeBearer) setStripeFeeBearer(d.stripeFeeBearer);
                if (d.bankIban) setBankIban(formatIBAN(d.bankIban));
                if (d.bankBic) setBankBic(d.bankBic);
                if (d.bankAccountOwner) setBankAccountOwner(d.bankAccountOwner);
                if (d.bankName) setBankName(d.bankName);
            }

            if (settingsRes.status === "fulfilled" && settingsRes.value?.data?.settings) {
                const s = settingsRes.value.data.settings;
                if (s.bankIban && !bankIban) setBankIban(formatIBAN(s.bankIban));
                if (s.bankBic && !bankBic) setBankBic(s.bankBic);
                if (s.bankAccountOwner && !bankAccountOwner) setBankAccountOwner(s.bankAccountOwner);
                if (s.bankName && !bankName) setBankName(s.bankName);
                if (s.stripeFeeBearer) setStripeFeeBearer(s.stripeFeeBearer);
            }
        } catch (err) {
            console.error("Erreur chargement paramètres paiements:", err);
        } finally {
            setLoadingInitial(false);
        }
    };

    useEffect(() => {
        loadPaymentData();

        // Vérification des query params (Stripe)
        const params = new URLSearchParams(window.location.search);
        if (params.get("stripe") === "success") {
            handleSyncStripe(true);
        }
    }, []);

    // Déclenche l'onboarding Stripe Connect Express
    const handleStartOnboarding = async () => {
        setOnboardingLoading(true);
        try {
            const res = await apiFetch("/v1/stripe/connect/onboard", {
                method: "POST",
                body: JSON.stringify({
                    returnUrl: `${window.location.origin}/settings?tab=paiements&stripe=success`,
                    refreshUrl: `${window.location.origin}/settings?tab=paiements&stripe=refresh`
                })
            });

            if (res.data?.onboardingUrl) {
                window.location.href = res.data.onboardingUrl;
                return;
            }
            triggerToast(res.message || "Lien Stripe généré.", false);
        } catch (err) {
            console.error("Erreur Onboarding Stripe:", err);
            triggerToast(err.message || "Impossible de lancer Stripe Connect.", true);
        } finally {
            setOnboardingLoading(false);
        }
    };

    // Synchronisation forcée avec l'API Stripe
    const handleSyncStripe = async (silent = false) => {
        setSyncingStripe(true);
        try {
            const res = await apiFetch("/v1/stripe/connect/sync", { method: "POST" });
            if (res.data) {
                setStripeStatus(prev => ({ ...prev, ...res.data }));
                if (!silent) triggerToast("Statut Stripe synchronisé avec succès !");
            }
        } catch (err) {
            if (!silent) triggerToast(err.message || "Erreur de synchronisation Stripe.", true);
        } finally {
            setSyncingStripe(false);
        }
    };

    // Déconnexion de Stripe
    // Simulation en mode test local
    const handleSimulateTestOnboarding = async () => {
        setOnboardingLoading(true);
        try {
            const res = await apiFetch("/v1/stripe/connect/test-simulate", { method: "POST" });
            setStripeStatus({
                stripeAccountId: res.data?.stripeAccountId || "acct_test_mock",
                onboardingStatus: "COMPLETE",
                chargesEnabled: true,
                payoutsEnabled: true,
                detailsSubmitted: true,
                onlinePaymentEnabled: true
            });
            setStripePaymentEnabled(true);
            triggerToast("Stripe Connect activé en mode Test ! Vous pouvez tester les paiements.");
        } catch (err) {
            triggerToast(err.message || "Erreur simulation", true);
        } finally {
            setOnboardingLoading(false);
        }
    };

    const handleDisconnectStripe = async () => {
        if (!window.confirm("Êtes-vous sûr de vouloir déconnecter votre compte Stripe ? Vos clients ne pourront plus payer en ligne.")) {
            return;
        }

        try {
            await apiFetch("/v1/stripe/connect", { method: "DELETE" });
            setStripeStatus({
                stripeAccountId: null,
                onboardingStatus: "NOT_STARTED",
                chargesEnabled: false,
                payoutsEnabled: false,
                detailsSubmitted: false,
                onlinePaymentEnabled: false
            });
            setStripePaymentEnabled(false);
            triggerToast("Compte Stripe déconnecté avec succès.");
        } catch (err) {
            triggerToast(err.message || "Erreur lors de la déconnexion.", true);
        }
    };

    // Sauvegarde des paramètres de paiement
    const handleSaveSettings = async (e) => {
        if (e) e.preventDefault();
        setSavingSettings(true);

        try {
            await apiFetch("/v1/stripe/connect/settings", {
                method: "PUT",
                body: JSON.stringify({
                    bankTransferEnabled,
                    stripePaymentEnabled,
                    stripeFeeBearer,
                    bankIban,
                    bankBic,
                    bankAccountOwner,
                    bankName
                })
            });

            // Met également à jour les coordonnées bancaires dans settings classiques
            await apiFetch("/v1/company/settings", {
                method: "PATCH",
                body: JSON.stringify({
                    bankIban,
                    bankBic,
                    bankAccountOwner,
                    bankName,
                    bankTransferEnabled,
                    stripePaymentEnabled,
                    stripeFeeBearer
                })
            });

            triggerToast("Paramètres de paiement enregistrés avec succès !");
        } catch (err) {
            triggerToast(err.message || "Erreur lors de l'enregistrement.", true);
        } finally {
            setSavingSettings(false);
        }
    };

    const handleCopyIban = () => {
        if (!bankIban) return;
        navigator.clipboard.writeText(bankIban);
        setIbanCopied(true);
        setTimeout(() => setIbanCopied(false), 2000);
    };

    if (loadingInitial) {
        return (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "60px 0" }}>
                <Loader2 className="animate-spin" size={32} style={{ color: "var(--primary)" }} />
            </div>
        );
    }

    const isStripeComplete = stripeStatus.onboardingStatus === "COMPLETE" && stripeStatus.chargesEnabled;
    const isStripeInProgress = stripeStatus.onboardingStatus === "IN_PROGRESS";
    const isStripeRequiresInfo = stripeStatus.onboardingStatus === "REQUIRES_INFO";

    return (
        <form onSubmit={handleSaveSettings} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            
            {/* ─────────────────────────────────────────────────────────────
                1. MÉTHODES DE PAIEMENT ACCEPTÉES
            ───────────────────────────────────────────────────────────── */}
            <div style={{
                border: "1px solid var(--border)",
                borderRadius: "14px",
                padding: isMobileView ? "16px" : "24px",
                backgroundColor: "var(--card)"
            }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, display: "flex", alignItems: "center", gap: "10px" }}>
                            <CreditCard size={20} style={{ color: "var(--primary)" }} />
                            Méthodes de paiement acceptées sur les factures
                        </h3>
                        <p style={{ color: "var(--muted-foreground)", fontSize: "13px", margin: "4px 0 0 0" }}>
                            Définissez les options de règlement proposées à vos clients par défaut.
                        </p>
                    </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    
                    {/* Option 1 : Virement bancaire */}
                    <div style={{
                        border: `1px solid ${bankTransferEnabled ? "rgba(85, 107, 47, 0.4)" : "var(--border)"}`,
                        borderRadius: "12px",
                        padding: "18px",
                        backgroundColor: bankTransferEnabled ? "rgba(85, 107, 47, 0.05)" : "transparent",
                        transition: "all 0.2s ease"
                    }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <label style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", fontWeight: 600, fontSize: "15px" }}>
                                <input
                                    type="checkbox"
                                    checked={bankTransferEnabled}
                                    onChange={(e) => setBankTransferEnabled(e.target.checked)}
                                    style={{ width: "18px", height: "18px", accentColor: "var(--primary)", cursor: "pointer" }}
                                />
                                <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <Landmark size={18} style={{ color: "var(--primary)" }} />
                                    Virement bancaire
                                </span>
                            </label>
                            {bankIban ? (
                                <span style={{ fontSize: "12px", color: "var(--primary)", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
                                    <Check size={14} /> IBAN configuré
                                </span>
                            ) : (
                                <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>IBAN à renseigner</span>
                            )}
                        </div>

                        {bankTransferEnabled && (
                            <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "14px" }}>
                                <div style={{ display: "grid", gridTemplateColumns: isMobileView ? "1fr" : "1fr 1fr", gap: "14px" }}>
                                    <div>
                                        <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, marginBottom: "6px", color: "var(--foreground)" }}>
                                            IBAN de l'entreprise
                                        </label>
                                        <div style={{ position: "relative" }}>
                                            <input
                                                type="text"
                                                placeholder="FR76 3000 3020 5001 2345 6789 012"
                                                value={bankIban}
                                                onChange={(e) => setBankIban(formatIBAN(e.target.value))}
                                                style={{
                                                    width: "100%",
                                                    padding: "10px 38px 10px 12px",
                                                    borderRadius: "8px",
                                                    border: "1px solid var(--border)",
                                                    backgroundColor: "var(--background)",
                                                    color: "var(--foreground)",
                                                    fontFamily: "monospace",
                                                    fontSize: "13.5px",
                                                    boxSizing: "border-box"
                                                }}
                                            />
                                            {bankIban && (
                                                <button
                                                    type="button"
                                                    onClick={handleCopyIban}
                                                    title="Copier l'IBAN"
                                                    style={{
                                                        position: "absolute",
                                                        right: "8px",
                                                        top: "50%",
                                                        transform: "translateY(-50%)",
                                                        background: "none",
                                                        border: "none",
                                                        cursor: "pointer",
                                                        color: ibanCopied ? "var(--primary)" : "var(--muted-foreground)"
                                                    }}
                                                >
                                                    {ibanCopied ? <Check size={16} /> : <Copy size={16} />}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, marginBottom: "6px", color: "var(--foreground)" }}>
                                            BIC / SWIFT
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="BNPAFRPPXXX"
                                            value={bankBic}
                                            onChange={(e) => setBankBic(formatBIC(e.target.value))}
                                            style={{
                                                width: "100%",
                                                padding: "10px 12px",
                                                borderRadius: "8px",
                                                border: "1px solid var(--border)",
                                                backgroundColor: "var(--background)",
                                                color: "var(--foreground)",
                                                fontFamily: "monospace",
                                                fontSize: "13.5px",
                                                boxSizing: "border-box"
                                            }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: isMobileView ? "1fr" : "1fr 1fr", gap: "14px" }}>
                                    <div>
                                        <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, marginBottom: "6px", color: "var(--foreground)" }}>
                                            Nom du titulaire du compte
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Ex : Dupont Climatisation SAS"
                                            value={bankAccountOwner}
                                            onChange={(e) => setBankAccountOwner(e.target.value)}
                                            style={{
                                                width: "100%",
                                                padding: "10px 12px",
                                                borderRadius: "8px",
                                                border: "1px solid var(--border)",
                                                backgroundColor: "var(--background)",
                                                color: "var(--foreground)",
                                                fontSize: "13.5px",
                                                boxSizing: "border-box"
                                            }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, marginBottom: "6px", color: "var(--foreground)" }}>
                                            Nom de la banque
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Ex : BNP Paribas, BoursoBank..."
                                            value={bankName}
                                            onChange={(e) => setBankName(e.target.value)}
                                            style={{
                                                width: "100%",
                                                padding: "10px 12px",
                                                borderRadius: "8px",
                                                border: "1px solid var(--border)",
                                                backgroundColor: "var(--background)",
                                                color: "var(--foreground)",
                                                fontSize: "13.5px",
                                                boxSizing: "border-box"
                                            }}
                                        />
                                    </div>
                                </div>

                                <div style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    fontSize: "12px",
                                    color: "var(--muted-foreground)",
                                    backgroundColor: "var(--background)",
                                    padding: "10px 14px",
                                    borderRadius: "8px",
                                    border: "1px solid var(--border)"
                                }}>
                                    <Info size={16} style={{ color: "var(--primary)", flexShrink: 0 }} />
                                    <span>
                                        <strong>Référence automatique :</strong> Le numéro de facture (ex: <em>INV-2026-001</em>) est automatiquement indiqué au client comme référence de virement obligatoire.
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Option 2 : Paiement en ligne Stripe Connect */}
                    <div style={{
                        border: `1px solid ${isStripeComplete ? "rgba(85, 107, 47, 0.4)" : "var(--border)"}`,
                        borderRadius: "12px",
                        padding: "18px",
                        backgroundColor: isStripeComplete ? "rgba(85, 107, 47, 0.05)" : "transparent",
                        transition: "all 0.2s ease"
                    }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
                            <label style={{ display: "flex", alignItems: "center", gap: "12px", cursor: isStripeComplete ? "pointer" : "default", fontWeight: 600, fontSize: "15px" }}>
                                <input
                                    type="checkbox"
                                    checked={stripePaymentEnabled && isStripeComplete}
                                    disabled={!isStripeComplete}
                                    onChange={(e) => setStripePaymentEnabled(e.target.checked)}
                                    style={{ width: "18px", height: "18px", accentColor: "var(--primary)", cursor: isStripeComplete ? "pointer" : "not-allowed" }}
                                />
                                <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <CreditCard size={18} style={{ color: "#635BFF" }} />
                                    Paiement en ligne par carte (Stripe Connect)
                                </span>
                            </label>

                            {/* Badge statut Stripe */}
                            <div>
                                {isStripeComplete ? (
                                    <span style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        padding: "4px 10px",
                                        borderRadius: "20px",
                                        fontSize: "12px",
                                        fontWeight: 600,
                                        backgroundColor: "rgba(16, 185, 129, 0.15)",
                                        color: "#10B981",
                                        border: "1px solid rgba(16, 185, 129, 0.3)"
                                    }}>
                                        <CheckCircle2 size={13} /> Stripe Connecté & Prêt
                                    </span>
                                ) : isStripeInProgress ? (
                                    <span style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        padding: "4px 10px",
                                        borderRadius: "20px",
                                        fontSize: "12px",
                                        fontWeight: 600,
                                        backgroundColor: "rgba(245, 158, 11, 0.15)",
                                        color: "#F59E0B",
                                        border: "1px solid rgba(245, 158, 11, 0.3)"
                                    }}>
                                        <RefreshCw size={13} className="animate-spin" /> Configuration en cours
                                    </span>
                                ) : isStripeRequiresInfo ? (
                                    <span style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        padding: "4px 10px",
                                        borderRadius: "20px",
                                        fontSize: "12px",
                                        fontWeight: 600,
                                        backgroundColor: "rgba(239, 68, 68, 0.15)",
                                        color: "#EF4444",
                                        border: "1px solid rgba(239, 68, 68, 0.3)"
                                    }}>
                                        <AlertCircle size={13} /> Informations requises
                                    </span>
                                ) : (
                                    <span style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        padding: "4px 10px",
                                        borderRadius: "20px",
                                        fontSize: "12px",
                                        fontWeight: 600,
                                        backgroundColor: "rgba(148, 163, 184, 0.15)",
                                        color: "#94A3B8",
                                        border: "1px solid rgba(148, 163, 184, 0.3)"
                                    }}>
                                        🔴 Non activé
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Bloc action et détails Stripe Connect */}
                        <div style={{ marginTop: "14px", paddingTop: "14px", borderTop: "1px solid var(--border)" }}>
                            <p style={{ color: "var(--muted-foreground)", fontSize: "13px", margin: "0 0 14px 0", lineHeight: 1.5 }}>
                                Vos clients peuvent régler leurs factures en ligne par carte bancaire. Les fonds sont versés <strong>directement sur votre compte bancaire</strong> via Stripe Express.
                            </p>

                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                    {!isStripeComplete ? (
                                        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                                            <button
                                                type="button"
                                                onClick={handleStartOnboarding}
                                                disabled={onboardingLoading}
                                                style={{
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    gap: "8px",
                                                    padding: "10px 20px",
                                                    borderRadius: "8px",
                                                    backgroundColor: "#635BFF",
                                                    color: "#FFFFFF",
                                                    border: "none",
                                                    fontWeight: 600,
                                                    fontSize: "13.5px",
                                                    cursor: onboardingLoading ? "not-allowed" : "pointer",
                                                    boxShadow: "0 2px 8px rgba(99, 91, 255, 0.3)",
                                                    transition: "all 0.2s ease"
                                                }}
                                            >
                                                {onboardingLoading ? (
                                                    <Loader2 size={16} className="animate-spin" />
                                                ) : (
                                                    <ExternalLink size={16} />
                                                )}
                                                {isStripeInProgress ? "Continuer la configuration Stripe" : (isStripeRequiresInfo ? "Compléter les informations Stripe" : "Activer le paiement en ligne (Stripe)")}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={handleSimulateTestOnboarding}
                                                disabled={onboardingLoading}
                                                title="Activer directement en mode test sans attendre la validation de profil Stripe"
                                                style={{
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    gap: "6px",
                                                    padding: "10px 14px",
                                                    borderRadius: "8px",
                                                    backgroundColor: "var(--muted)",
                                                    color: "var(--foreground)",
                                                    border: "1px dashed var(--border)",
                                                    fontWeight: 600,
                                                    fontSize: "13px",
                                                    cursor: onboardingLoading ? "not-allowed" : "pointer"
                                                }}
                                            >
                                                ⚡ Simuler l'activation (Test Dev)
                                            </button>
                                        </div>
                                    ) : (
                                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                            <span style={{ fontSize: "13px", color: "var(--foreground)", fontFamily: "monospace" }}>
                                                ID Compte : {stripeStatus.stripeAccountId}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => handleSyncStripe(false)}
                                                disabled={syncingStripe}
                                                title="Vérifier le statut auprès de Stripe"
                                                style={{
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    gap: "6px",
                                                    padding: "6px 12px",
                                                    borderRadius: "6px",
                                                    border: "1px solid var(--border)",
                                                    backgroundColor: "var(--background)",
                                                    color: "var(--foreground)",
                                                    fontSize: "12px",
                                                    cursor: "pointer"
                                                }}
                                            >
                                                <RefreshCw size={13} className={syncingStripe ? "animate-spin" : ""} />
                                                Synchroniser
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {stripeStatus.stripeAccountId && (
                                    <button
                                        type="button"
                                        onClick={handleDisconnectStripe}
                                        style={{
                                            padding: "6px 12px",
                                            borderRadius: "6px",
                                            border: "1px solid rgba(239, 68, 68, 0.3)",
                                            backgroundColor: "rgba(239, 68, 68, 0.08)",
                                            color: "#EF4444",
                                            fontSize: "12px",
                                            fontWeight: 500,
                                            cursor: "pointer"
                                        }}
                                    >
                                        Déconnecter Stripe
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─────────────────────────────────────────────────────────────
                2. FRAIS DE PAIEMENT EN LIGNE (STRIPE FEES CONFIGURATION)
            ───────────────────────────────────────────────────────────── */}
            <div style={{
                border: "1px solid var(--border)",
                borderRadius: "14px",
                padding: isMobileView ? "16px" : "24px",
                backgroundColor: "var(--card)"
            }}>
                <div style={{ marginBottom: "16px" }}>
                    <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, display: "flex", alignItems: "center", gap: "10px" }}>
                        <Percent size={20} style={{ color: "var(--primary)" }} />
                        Frais de paiement en ligne (Stripe)
                    </h3>
                    <p style={{ color: "var(--muted-foreground)", fontSize: "13px", margin: "4px 0 0 0" }}>
                        Choisissez qui prend en charge les frais de traitement bancaire par carte.
                    </p>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: isMobileView ? "1fr" : "1fr 1fr", gap: "14px" }}>
                    
                    {/* Mode A : Frais à la charge de l'entreprise */}
                    <div
                        onClick={() => setStripeFeeBearer("COMPANY")}
                        style={{
                            border: `2px solid ${stripeFeeBearer === "COMPANY" ? "var(--primary)" : "var(--border)"}`,
                            borderRadius: "12px",
                            padding: "16px",
                            backgroundColor: stripeFeeBearer === "COMPANY" ? "rgba(85, 107, 47, 0.06)" : "transparent",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between"
                        }}
                    >
                        <div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                                <span style={{ fontWeight: 700, fontSize: "14.5px", color: "var(--foreground)" }}>
                                    À la charge de l'entreprise
                                </span>
                                <input
                                    type="radio"
                                    name="stripeFeeBearer"
                                    checked={stripeFeeBearer === "COMPANY"}
                                    onChange={() => setStripeFeeBearer("COMPANY")}
                                    style={{ accentColor: "var(--primary)", cursor: "pointer" }}
                                />
                            </div>
                            <p style={{ margin: 0, fontSize: "13px", color: "var(--muted-foreground)", lineHeight: 1.45 }}>
                                Le client paie <strong>exactement le montant TTC de la facture</strong>. Les frais Stripe (~1,5% + 0,25€) sont déduits du versement reçu.
                            </p>
                        </div>
                        <div style={{ marginTop: "12px", fontSize: "12px", color: "var(--primary)", fontWeight: 600 }}>
                            Recommandé pour une expérience client fluide
                        </div>
                    </div>

                    {/* Mode B : Frais à la charge du client */}
                    <div
                        onClick={() => setStripeFeeBearer("CLIENT")}
                        style={{
                            border: `2px solid ${stripeFeeBearer === "CLIENT" ? "var(--primary)" : "var(--border)"}`,
                            borderRadius: "12px",
                            padding: "16px",
                            backgroundColor: stripeFeeBearer === "CLIENT" ? "rgba(85, 107, 47, 0.06)" : "transparent",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between"
                        }}
                    >
                        <div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                                <span style={{ fontWeight: 700, fontSize: "14.5px", color: "var(--foreground)" }}>
                                    À la charge du client
                                </span>
                                <input
                                    type="radio"
                                    name="stripeFeeBearer"
                                    checked={stripeFeeBearer === "CLIENT"}
                                    onChange={() => setStripeFeeBearer("CLIENT")}
                                    style={{ accentColor: "var(--primary)", cursor: "pointer" }}
                                />
                            </div>
                            <p style={{ margin: 0, fontSize: "13px", color: "var(--muted-foreground)", lineHeight: 1.45 }}>
                                Le client règle le montant de la facture <strong>majoré des frais Stripe</strong>. Vous percevez l'intégralité du montant de votre facture.
                            </p>
                        </div>
                        <div style={{ marginTop: "12px", fontSize: "12px", color: "var(--muted-foreground)" }}>
                            Calculé automatiquement avec formule Stripe inversée
                        </div>
                    </div>
                </div>

                {/* ── SIMULATION INTERACTIVE DES FRAIS ── */}
                {(() => {
                    const numSim = Number(simAmount) || 0;
                    const stripePercent = 0.015;
                    const stripeFixed = 0.25;

                    let clientPays = numSim;
                    let stripeFee = 0;
                    let companyReceives = numSim;

                    if (numSim > 0) {
                        if (stripeFeeBearer === "CLIENT") {
                            clientPays = Math.round(((numSim + stripeFixed) / (1 - stripePercent)) * 100) / 100;
                            stripeFee = Math.round((clientPays - numSim) * 100) / 100;
                            companyReceives = numSim;
                        } else {
                            clientPays = numSim;
                            stripeFee = Math.round(((numSim * stripePercent) + stripeFixed) * 100) / 100;
                            companyReceives = Math.max(0, Math.round((numSim - stripeFee) * 100) / 100);
                        }
                    }

                    return (
                        <div style={{
                            marginTop: "16px",
                            backgroundColor: "var(--background)",
                            border: "1px solid var(--border)",
                            borderRadius: "12px",
                            padding: "16px 20px"
                        }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "14px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <Calculator size={16} style={{ color: "var(--primary)" }} />
                                    <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--foreground)" }}>
                                        Exemple de calcul en direct :
                                    </span>
                                    <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
                                        (Tarif indicatif carte UE : 1,5% + 0,25 €)
                                    </span>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <span style={{ fontSize: "12.5px", color: "var(--muted-foreground)", fontWeight: 500 }}>Montant facture TTC :</span>
                                    <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                                        <input
                                            type="number"
                                            value={simAmount}
                                            onChange={(e) => setSimAmount(e.target.value)}
                                            min="1"
                                            step="10"
                                            style={{
                                                width: "110px",
                                                padding: "6px 24px 6px 10px",
                                                borderRadius: "6px",
                                                border: "1px solid var(--border)",
                                                backgroundColor: "var(--card)",
                                                color: "var(--foreground)",
                                                fontWeight: 700,
                                                fontSize: "13.5px",
                                                textAlign: "right"
                                            }}
                                        />
                                        <span style={{ position: "absolute", right: "8px", fontSize: "13px", color: "var(--muted-foreground)", pointerEvents: "none" }}>€</span>
                                    </div>
                                </div>
                            </div>

                            {/* Cartes de décomposition de l'exemple */}
                            <div style={{ display: "grid", gridTemplateColumns: isMobileView ? "1fr" : "1fr 1fr 1fr", gap: "12px" }}>
                                
                                {/* Facture / Paiement Client */}
                                <div style={{
                                    backgroundColor: "var(--card)",
                                    padding: "12px 14px",
                                    borderRadius: "8px",
                                    border: "1px solid var(--border)"
                                }}>
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "11.5px", color: "var(--muted-foreground)", marginBottom: "4px" }}>
                                        <User size={13} style={{ color: "var(--muted-foreground)" }} />
                                        Le client paie
                                    </span>
                                    <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--foreground)" }}>
                                        {clientPays.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                                    </div>
                                    <span style={{ fontSize: "11px", color: stripeFeeBearer === "CLIENT" ? "#F59E0B" : "var(--muted-foreground)" }}>
                                        {stripeFeeBearer === "CLIENT" ? `(Facture ${numSim.toFixed(2)} € + ${stripeFee.toFixed(2)} € frais)` : "(Montant exact de la facture)"}
                                    </span>
                                </div>

                                {/* Frais Stripe */}
                                <div style={{
                                    backgroundColor: "var(--card)",
                                    padding: "12px 14px",
                                    borderRadius: "8px",
                                    border: "1px solid var(--border)"
                                }}>
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "11.5px", color: "var(--muted-foreground)", marginBottom: "4px" }}>
                                        <CreditCard size={13} style={{ color: "#635BFF" }} />
                                        Frais Stripe prélevés
                                    </span>
                                    <div style={{ fontSize: "18px", fontWeight: 800, color: "#635BFF" }}>
                                        {stripeFee.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                                    </div>
                                    <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                                        {stripeFeeBearer === "CLIENT" ? "Pris en charge par le client" : "Déduits de votre versement"}
                                    </span>
                                </div>

                                {/* Ce que reçoit l'entreprise */}
                                <div style={{
                                    backgroundColor: "rgba(85, 107, 47, 0.08)",
                                    padding: "12px 14px",
                                    borderRadius: "8px",
                                    border: "1px solid rgba(85, 107, 47, 0.3)"
                                }}>
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "11.5px", color: "var(--primary)", fontWeight: 600, marginBottom: "4px" }}>
                                        <Building2 size={13} style={{ color: "var(--primary)" }} />
                                        Vous percevez (Net)
                                    </span>
                                    <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--primary)" }}>
                                        {companyReceives.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                                    </div>
                                    <span style={{ fontSize: "11px", color: stripeFeeBearer === "CLIENT" ? "var(--primary)" : "var(--muted-foreground)", fontWeight: stripeFeeBearer === "CLIENT" ? 600 : 400 }}>
                                        {stripeFeeBearer === "CLIENT" ? "✓ 100% du montant de votre facture" : "Versé sur votre compte bancaire"}
                                    </span>
                                </div>

                            </div>
                        </div>
                    );
                })()}
            </div>

            {/* Bouton de sauvegarde global */}
            <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: "8px" }}>
                <button
                    type="submit"
                    disabled={savingSettings}
                    style={{
                        padding: "12px 28px",
                        borderRadius: "8px",
                        backgroundColor: "var(--primary)",
                        color: "#FFFFFF",
                        border: "none",
                        fontWeight: 700,
                        fontSize: "14px",
                        cursor: savingSettings ? "not-allowed" : "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        boxShadow: "0 4px 14px rgba(85, 107, 47, 0.3)"
                    }}
                >
                    {savingSettings ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                    Enregistrer les paramètres de paiement
                </button>
            </div>
        </form>
    );
}
