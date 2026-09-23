import React, { useState, useEffect, useRef } from "react";
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
    Wallet,
    Clock
} from "lucide-react";
import { apiFetch } from "../../utils/api";
import { formatIBAN, formatBIC } from "../../utils/bankValidator";
import { useSubscription } from "../../utils/useSubscription";

export default function PaiementsTab({ isMobileView, triggerToast }) {
    const { isExpired } = useSubscription();
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
    const autoSaveTimerRef = useRef(null);
    const savedPaymentRef = useRef(null);

    // Fetch payment settings and Stripe status
    const loadPaymentData = async () => {
        try {
            const [stripeRes, settingsRes] = await Promise.allSettled([
                apiFetch("/v1/stripe/connect/status"),
                apiFetch("/v1/company/settings")
            ]);

            let bTransfer = true, sPayment = false, sFee = "COMPANY", bIban = "", bBic = "", bOwner = "", bName = "";

            if (stripeRes.status === "fulfilled" && stripeRes.value?.data) {
                const d = stripeRes.value.data;
                setStripeStatus(d);
                if (d.bankTransferEnabled !== undefined) { bTransfer = d.bankTransferEnabled; setBankTransferEnabled(bTransfer); }
                if (d.stripePaymentEnabled !== undefined) { sPayment = d.stripePaymentEnabled; setStripePaymentEnabled(sPayment); }
                if (d.stripeFeeBearer) { sFee = d.stripeFeeBearer; setStripeFeeBearer(sFee); }
                if (d.bankIban) { bIban = formatIBAN(d.bankIban); setBankIban(bIban); }
                if (d.bankBic) { bBic = d.bankBic; setBankBic(bBic); }
                if (d.bankAccountOwner) { bOwner = d.bankAccountOwner; setBankAccountOwner(bOwner); }
                if (d.bankName) { bName = d.bankName; setBankName(bName); }
            }

            if (settingsRes.status === "fulfilled" && settingsRes.value?.data?.settings) {
                const s = settingsRes.value.data.settings;
                if (s.bankIban && !bIban) { bIban = formatIBAN(s.bankIban); setBankIban(bIban); }
                if (s.bankBic && !bBic) { bBic = s.bankBic; setBankBic(bBic); }
                if (s.bankAccountOwner && !bOwner) { bOwner = s.bankAccountOwner; setBankAccountOwner(bOwner); }
                if (s.bankName && !bName) { bName = s.bankName; setBankName(bName); }
                if (s.stripeFeeBearer) { sFee = s.stripeFeeBearer; setStripeFeeBearer(sFee); }
                if (s.bankTransferEnabled !== undefined) { bTransfer = s.bankTransferEnabled; setBankTransferEnabled(bTransfer); }
                if (s.stripePaymentEnabled !== undefined) { sPayment = s.stripePaymentEnabled; setStripePaymentEnabled(sPayment); }
            }

            savedPaymentRef.current = {
                bankTransferEnabled: bTransfer,
                stripePaymentEnabled: sPayment,
                stripeFeeBearer: sFee,
                bankIban: bIban,
                bankBic: bBic,
                bankAccountOwner: bOwner,
                bankName: bName
            };
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

    const handleDisconnectStripe = async () => {
        if (checkExpired()) return;

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
            if (triggerToast) triggerToast("Compte Stripe déconnecté avec succès.");
        } catch (err) {
            if (triggerToast) triggerToast(err.message || "Erreur lors de la déconnexion.", true);
        }
    };

    const checkExpired = () => {
        if (isExpired) {
            window.dispatchEvent(new CustomEvent('subscription_expired', {
                detail: { message: "Votre abonnement a expiré. Pour modifier vos paramètres de paiement, veuillez renouveler votre abonnement." }
            }));
            window.dispatchEvent(new CustomEvent('autoSaveStatus', { detail: { status: 'error' } }));
            return true;
        }
        return false;
    };

    const rollbackState = () => {
        if (!savedPaymentRef.current) return;
        const s = savedPaymentRef.current;
        setBankTransferEnabled(s.bankTransferEnabled);
        setStripePaymentEnabled(s.stripePaymentEnabled);
        setStripeFeeBearer(s.stripeFeeBearer);
        setBankIban(s.bankIban);
        setBankBic(s.bankBic);
        setBankAccountOwner(s.bankAccountOwner);
        setBankName(s.bankName);
    };

    // Sauvegarde automatique des paramètres de paiement
    const performAutoSave = async (overrideData = {}) => {
        if (checkExpired()) {
            rollbackState();
            return;
        }

        window.dispatchEvent(new CustomEvent('autoSaveStatus', { detail: { status: 'saving' } }));
        setSavingSettings(true);

        const bTransfer = overrideData.bankTransferEnabled !== undefined ? overrideData.bankTransferEnabled : bankTransferEnabled;
        const sPayment = overrideData.stripePaymentEnabled !== undefined ? overrideData.stripePaymentEnabled : stripePaymentEnabled;
        const sFeeBearer = overrideData.stripeFeeBearer !== undefined ? overrideData.stripeFeeBearer : stripeFeeBearer;
        const bIban = overrideData.bankIban !== undefined ? overrideData.bankIban : bankIban;
        const bBic = overrideData.bankBic !== undefined ? overrideData.bankBic : bankBic;
        const bOwner = overrideData.bankAccountOwner !== undefined ? overrideData.bankAccountOwner : bankAccountOwner;
        const bName = overrideData.bankName !== undefined ? overrideData.bankName : bankName;

        try {
            await Promise.all([
                apiFetch("/v1/stripe/connect/settings", {
                    method: "PUT",
                    body: JSON.stringify({
                        bankTransferEnabled: bTransfer,
                        stripePaymentEnabled: sPayment,
                        stripeFeeBearer: sFeeBearer,
                        bankIban: bIban,
                        bankBic: bBic,
                        bankAccountOwner: bOwner,
                        bankName: bName
                    })
                }),
                apiFetch("/v1/company/settings", {
                    method: "PATCH",
                    body: JSON.stringify({
                        bankIban: bIban,
                        bankBic: bBic,
                        bankAccountOwner: bOwner,
                        bankName: bName,
                        bankTransferEnabled: bTransfer,
                        stripePaymentEnabled: sPayment,
                        stripeFeeBearer: sFeeBearer
                    })
                })
            ]);

            savedPaymentRef.current = {
                bankTransferEnabled: bTransfer,
                stripePaymentEnabled: sPayment,
                stripeFeeBearer: sFeeBearer,
                bankIban: bIban,
                bankBic: bBic,
                bankAccountOwner: bOwner,
                bankName: bName
            };

            window.dispatchEvent(new CustomEvent('autoSaveStatus', { detail: { status: 'saved' } }));
        } catch (err) {
            console.error("Erreur auto-save paiements:", err);
            rollbackState();
            window.dispatchEvent(new CustomEvent('autoSaveStatus', { detail: { status: 'error' } }));
            if (triggerToast) triggerToast(err.message || "Erreur lors de l'enregistrement.", true);
        } finally {
            setSavingSettings(false);
        }
    };

    const queueAutoSave = (overrideData) => {
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = setTimeout(() => {
            performAutoSave(overrideData);
        }, 500);
    };

    const handleFormSubmit = async (e) => {
        if (e) e.preventDefault();
        await performAutoSave();
        if (triggerToast) triggerToast("Paramètres de paiement enregistrés avec succès !");
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

    const isStripeComplete = stripeStatus.onboardingStatus === "COMPLETE" || (stripeStatus.detailsSubmitted && stripeStatus.stripeAccountId && stripeStatus.onboardingStatus !== "REQUIRES_INFO");
    const isStripeInProgress = stripeStatus.onboardingStatus === "IN_PROGRESS" && !isStripeComplete;
    const isStripeRequiresInfo = stripeStatus.onboardingStatus === "REQUIRES_INFO";

    return (
        <form onSubmit={handleFormSubmit} style={{ display: "flex", flexDirection: "column", gap: isMobileView ? "14px" : "24px" }}>
            
            {/* ─────────────────────────────────────────────────────────────
                1. MÉTHODES DE PAIEMENT ACCEPTÉES
            ───────────────────────────────────────────────────────────── */}
            <div style={{
                border: "1px solid var(--border)",
                borderRadius: isMobileView ? "14px" : "14px",
                padding: isMobileView ? "14px 16px" : "24px",
                backgroundColor: "var(--card)"
            }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: isMobileView ? "14px" : "18px" }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: isMobileView ? "15px" : "16px", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px" }}>
                            <CreditCard size={isMobileView ? 18 : 20} style={{ color: "var(--primary)", flexShrink: 0 }} />
                            Méthodes de paiement acceptées sur les factures
                        </h3>
                        <p style={{ color: "var(--muted-foreground)", fontSize: isMobileView ? "12px" : "13px", margin: isMobileView ? "4px 0 0 0" : "4px 0 0 0", lineHeight: 1.35 }}>
                            Définissez les options de règlement proposées à vos clients par défaut.
                        </p>
                    </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: isMobileView ? "12px" : "16px" }}>
                    
                    {/* Option 1 : Virement bancaire */}
                    <div style={{
                        border: "1px solid var(--border)",
                        borderRadius: isMobileView ? "12px" : "12px",
                        padding: isMobileView ? "12px 14px" : "18px",
                        backgroundColor: "var(--card)",
                        transition: "all 0.2s ease"
                    }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <label style={{ display: "flex", alignItems: "center", gap: isMobileView ? "10px" : "12px", cursor: "pointer", fontWeight: 700, fontSize: isMobileView ? "14px" : "15px" }}>
                                <input
                                    type="checkbox"
                                    checked={bankTransferEnabled}
                                    onChange={(e) => {
                                        if (checkExpired()) return;
                                        const val = e.target.checked;
                                        setBankTransferEnabled(val);
                                        performAutoSave({ bankTransferEnabled: val });
                                    }}
                                    style={{ width: isMobileView ? "18px" : "18px", height: isMobileView ? "18px" : "18px", accentColor: "var(--primary)", cursor: "pointer" }}
                                />
                                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                    <Landmark size={isMobileView ? 16 : 18} style={{ color: "var(--primary)", flexShrink: 0 }} />
                                    Virement bancaire
                                </span>
                            </label>
                            {bankIban ? (
                                <span style={{ fontSize: isMobileView ? "11.5px" : "12px", color: "var(--primary)", fontWeight: 600, display: "flex", alignItems: "center", gap: "3px" }}>
                                    <Check size={isMobileView ? 13 : 14} /> IBAN configuré
                                </span>
                            ) : (
                                <span style={{ fontSize: isMobileView ? "11.5px" : "12px", color: "var(--muted-foreground)" }}>IBAN à renseigner</span>
                            )}
                        </div>

                        {bankTransferEnabled && (
                            <div style={{ marginTop: isMobileView ? "12px" : "16px", paddingTop: isMobileView ? "12px" : "16px", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: isMobileView ? "10px" : "14px" }}>
                                <div style={{ display: "grid", gridTemplateColumns: isMobileView ? "1fr" : "1fr 1fr", gap: isMobileView ? "10px" : "14px" }}>
                                    <div>
                                        <label style={{ display: "block", fontSize: isMobileView ? "12px" : "12.5px", fontWeight: 700, marginBottom: "4px", color: "var(--foreground)" }}>
                                            IBAN de l'entreprise
                                        </label>
                                        <div style={{ position: "relative" }}>
                                            <input
                                                type="text"
                                                placeholder="FR76 3000 3020 5001 2345 6789 012"
                                                value={bankIban}
                                                onChange={(e) => {
                                                    if (checkExpired()) return;
                                                    const val = formatIBAN(e.target.value);
                                                    setBankIban(val);
                                                    queueAutoSave({ bankIban: val });
                                                }}
                                                style={{
                                                    width: "100%",
                                                    height: isMobileView ? "42px" : "42px",
                                                    minHeight: isMobileView ? "42px" : "42px",
                                                    maxHeight: isMobileView ? "42px" : "42px",
                                                    padding: isMobileView ? "10px 32px 10px 8px" : "10px 38px 10px 12px",
                                                    borderRadius: "8px",
                                                    border: "1px solid var(--border)",
                                                    backgroundColor: "var(--background)",
                                                    color: "var(--foreground)",
                                                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                                                    fontVariantNumeric: "tabular-nums",
                                                    fontSize: isMobileView ? "11px" : "13.5px",
                                                    letterSpacing: isMobileView ? "-0.2px" : "0.2px",
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
                                                        color: ibanCopied ? "var(--primary)" : "var(--muted-foreground)",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        padding: "4px"
                                                    }}
                                                >
                                                    {ibanCopied ? <Check size={isMobileView ? 15 : 15} /> : <Copy size={isMobileView ? 15 : 15} />}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <label style={{ display: "block", fontSize: isMobileView ? "12px" : "12.5px", fontWeight: 700, marginBottom: "4px", color: "var(--foreground)" }}>
                                            BIC / SWIFT
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="BNPAFRPPXXX"
                                            value={bankBic}
                                            onChange={(e) => {
                                                if (checkExpired()) return;
                                                const val = formatBIC(e.target.value);
                                                setBankBic(val);
                                                queueAutoSave({ bankBic: val });
                                            }}
                                            style={{
                                                width: "100%",
                                                height: isMobileView ? "42px" : "42px",
                                                minHeight: isMobileView ? "42px" : "42px",
                                                maxHeight: isMobileView ? "42px" : "42px",
                                                padding: isMobileView ? "10px 12px" : "10px 12px",
                                                borderRadius: "8px",
                                                border: "1px solid var(--border)",
                                                backgroundColor: "var(--background)",
                                                color: "var(--foreground)",
                                                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                                                fontVariantNumeric: "tabular-nums",
                                                fontSize: isMobileView ? "13.5px" : "13.5px",
                                                boxSizing: "border-box"
                                            }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: isMobileView ? "1fr" : "1fr 1fr", gap: isMobileView ? "10px" : "14px" }}>
                                    <div>
                                        <label style={{ display: "block", fontSize: isMobileView ? "12px" : "12.5px", fontWeight: 700, marginBottom: "4px", color: "var(--foreground)" }}>
                                            Nom du titulaire du compte
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Ex : Dupont Climatisation SAS"
                                            value={bankAccountOwner}
                                            onChange={(e) => {
                                                if (checkExpired()) return;
                                                const val = e.target.value;
                                                setBankAccountOwner(val);
                                                queueAutoSave({ bankAccountOwner: val });
                                            }}
                                            style={{
                                                width: "100%",
                                                height: isMobileView ? "42px" : "42px",
                                                minHeight: isMobileView ? "42px" : "42px",
                                                maxHeight: isMobileView ? "42px" : "42px",
                                                padding: isMobileView ? "10px 12px" : "10px 12px",
                                                borderRadius: "8px",
                                                border: "1px solid var(--border)",
                                                backgroundColor: "var(--background)",
                                                color: "var(--foreground)",
                                                fontSize: isMobileView ? "13.5px" : "13.5px",
                                                boxSizing: "border-box"
                                            }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: "block", fontSize: isMobileView ? "12px" : "12.5px", fontWeight: 700, marginBottom: "4px", color: "var(--foreground)" }}>
                                            Nom de la banque
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Ex : BNP Paribas, BoursoBank..."
                                            value={bankName}
                                            onChange={(e) => {
                                                if (checkExpired()) return;
                                                const val = e.target.value;
                                                setBankName(val);
                                                queueAutoSave({ bankName: val });
                                            }}
                                            style={{
                                                width: "100%",
                                                height: isMobileView ? "42px" : "42px",
                                                minHeight: isMobileView ? "42px" : "42px",
                                                maxHeight: isMobileView ? "42px" : "42px",
                                                padding: isMobileView ? "10px 12px" : "10px 12px",
                                                borderRadius: "8px",
                                                border: "1px solid var(--border)",
                                                backgroundColor: "var(--background)",
                                                color: "var(--foreground)",
                                                fontSize: isMobileView ? "13.5px" : "13.5px",
                                                boxSizing: "border-box"
                                            }}
                                        />
                                    </div>
                                </div>

                                <div style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    fontSize: isMobileView ? "12px" : "12px",
                                    color: "var(--muted-foreground)",
                                    backgroundColor: "var(--background)",
                                    padding: isMobileView ? "10px 12px" : "10px 14px",
                                    borderRadius: "8px",
                                    border: "1px solid var(--border)",
                                    lineHeight: 1.4
                                }}>
                                    <Info size={isMobileView ? 15 : 15} style={{ color: "var(--primary)", flexShrink: 0 }} />
                                    <span>
                                        <strong>Référence auto :</strong> Le n° de facture (ex: <em>INV-2026-001</em>) est indiqué au client comme référence de virement.
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Option 2 : Paiement en ligne Stripe Connect */}
                    <div style={{
                        border: "1px solid var(--border)",
                        borderRadius: isMobileView ? "12px" : "12px",
                        padding: isMobileView ? "12px 14px" : "18px",
                        backgroundColor: "var(--card)",
                        transition: "all 0.2s ease"
                    }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                            <label style={{ display: "flex", alignItems: "center", gap: isMobileView ? "10px" : "12px", cursor: isStripeComplete ? "pointer" : "default", fontWeight: 700, fontSize: isMobileView ? "14px" : "15px" }}>
                                <input
                                    type="checkbox"
                                    checked={stripePaymentEnabled && isStripeComplete}
                                    disabled={!isStripeComplete}
                                    onChange={(e) => {
                                        if (checkExpired()) return;
                                        const val = e.target.checked;
                                        setStripePaymentEnabled(val);
                                        performAutoSave({ stripePaymentEnabled: val });
                                    }}
                                    style={{ width: isMobileView ? "18px" : "18px", height: isMobileView ? "18px" : "18px", accentColor: "var(--primary)", cursor: isStripeComplete ? "pointer" : "not-allowed" }}
                                />
                                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                    <CreditCard size={isMobileView ? 16 : 18} style={{ color: "#635BFF", flexShrink: 0 }} />
                                    Paiement en ligne par carte (Stripe Connect)
                                </span>
                            </label>

                            {/* Badge statut Stripe */}
                            <div>
                                {isStripeComplete ? (
                                    <span style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "4px",
                                        padding: isMobileView ? "3px 9px" : "4px 10px",
                                        borderRadius: "20px",
                                        fontSize: isMobileView ? "11.5px" : "12px",
                                        fontWeight: 600,
                                        backgroundColor: "rgba(16, 185, 129, 0.15)",
                                        color: "#10B981",
                                        border: "1px solid rgba(16, 185, 129, 0.3)"
                                    }}>
                                        <CheckCircle2 size={isMobileView ? 12 : 12} /> Connecté
                                    </span>
                                ) : isStripeInProgress ? (
                                    <span style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "4px",
                                        padding: isMobileView ? "3px 9px" : "4px 10px",
                                        borderRadius: "20px",
                                        fontSize: isMobileView ? "11.5px" : "12px",
                                        fontWeight: 600,
                                        backgroundColor: "rgba(245, 158, 11, 0.15)",
                                        color: "#F59E0B",
                                        border: "1px solid rgba(245, 158, 11, 0.3)"
                                    }}>
                                        <Clock size={isMobileView ? 12 : 12} /> En cours
                                    </span>
                                ) : isStripeRequiresInfo ? (
                                    <span style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "4px",
                                        padding: isMobileView ? "3px 9px" : "4px 10px",
                                        borderRadius: "20px",
                                        fontSize: isMobileView ? "11.5px" : "12px",
                                        fontWeight: 600,
                                        backgroundColor: "rgba(239, 68, 68, 0.15)",
                                        color: "#EF4444",
                                        border: "1px solid rgba(239, 68, 68, 0.3)"
                                    }}>
                                        <AlertCircle size={isMobileView ? 12 : 12} /> Infos requises
                                    </span>
                                ) : (
                                    <span style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "4px",
                                        padding: isMobileView ? "3px 9px" : "4px 10px",
                                        borderRadius: "20px",
                                        fontSize: isMobileView ? "11.5px" : "12px",
                                        fontWeight: 600,
                                        backgroundColor: "rgba(148, 163, 184, 0.15)",
                                        color: "#94A3B8",
                                        border: "1px solid rgba(148, 163, 184, 0.3)"
                                    }}>
                                        Non activé
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Bloc action et détails Stripe Connect */}
                        <div style={{ marginTop: isMobileView ? "12px" : "14px", paddingTop: isMobileView ? "12px" : "14px", borderTop: "1px solid var(--border)" }}>
                            <p style={{ color: "var(--muted-foreground)", fontSize: isMobileView ? "12.5px" : "13px", margin: isMobileView ? "0 0 10px 0" : "0 0 14px 0", lineHeight: 1.4 }}>
                                Vos clients peuvent régler leurs factures en ligne par carte. Les fonds sont versés <strong>directement sur votre compte</strong> via Stripe Express.
                            </p>

                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", width: isMobileView ? "100%" : "auto" }}>
                                    {!isStripeComplete ? (
                                        <div style={{ display: "flex", gap: "8px", flexDirection: isMobileView ? "column" : "row", width: isMobileView ? "100%" : "auto" }}>
                                            <button
                                                type="button"
                                                onClick={handleStartOnboarding}
                                                disabled={onboardingLoading}
                                                style={{
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    gap: "8px",
                                                    padding: isMobileView ? "11px 16px" : "10px 20px",
                                                    borderRadius: "8px",
                                                    backgroundColor: "#635BFF",
                                                    color: "#FFFFFF",
                                                    border: "none",
                                                    fontWeight: 700,
                                                    fontSize: isMobileView ? "13.5px" : "13.5px",
                                                    cursor: onboardingLoading ? "not-allowed" : "pointer",
                                                    boxShadow: "0 2px 8px rgba(99, 91, 255, 0.3)",
                                                    transition: "all 0.2s ease",
                                                    width: isMobileView ? "100%" : "auto"
                                                }}
                                            >
                                                {onboardingLoading ? (
                                                    <Loader2 size={16} className="animate-spin" />
                                                ) : (
                                                    <ExternalLink size={16} />
                                                )}
                                                {isStripeInProgress ? "Continuer la config Stripe" : (isStripeRequiresInfo ? "Compléter les infos Stripe" : "Activer le paiement en ligne (Stripe)")}
                                            </button>
                                        </div>
                                    ) : (
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", width: isMobileView ? "100%" : "auto" }}>
                                            <span style={{ fontSize: isMobileView ? "12px" : "13px", color: "var(--foreground)", fontFamily: "monospace" }}>
                                                ID : {stripeStatus.stripeAccountId}
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
                                                    padding: isMobileView ? "6px 12px" : "5px 10px",
                                                    borderRadius: "6px",
                                                    border: "1px solid var(--border)",
                                                    backgroundColor: "var(--background)",
                                                    color: "var(--foreground)",
                                                    fontSize: isMobileView ? "12px" : "12px",
                                                    fontWeight: 600,
                                                    cursor: "pointer"
                                                }}
                                            >
                                                <RefreshCw size={12} className={syncingStripe ? "animate-spin" : ""} />
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
                                            padding: isMobileView ? "8px 12px" : "6px 14px",
                                            borderRadius: "6px",
                                            border: "1px solid var(--border)",
                                            backgroundColor: "var(--card)",
                                            color: "#EF4444",
                                            fontSize: isMobileView ? "12px" : "12px",
                                            fontWeight: 600,
                                            cursor: "pointer",
                                            width: isMobileView ? "100%" : "auto",
                                            marginTop: isMobileView ? "6px" : 0,
                                            transition: "all 0.15s ease",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            justifyContent: "center"
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
                borderRadius: isMobileView ? "14px" : "14px",
                padding: isMobileView ? "14px 16px" : "24px",
                backgroundColor: "var(--card)"
            }}>
                <div style={{ marginBottom: isMobileView ? "12px" : "16px" }}>
                    <h3 style={{ margin: 0, fontSize: isMobileView ? "15px" : "16px", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px" }}>
                        <Percent size={isMobileView ? 18 : 20} style={{ color: "var(--primary)", flexShrink: 0 }} />
                        Frais de paiement en ligne (Stripe)
                    </h3>
                    <p style={{ color: "var(--muted-foreground)", fontSize: isMobileView ? "12px" : "13px", margin: isMobileView ? "4px 0 0 0" : "4px 0 0 0", lineHeight: 1.35 }}>
                        Choisissez qui prend en charge les frais de traitement bancaire par carte.
                    </p>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: isMobileView ? "1fr" : "1fr 1fr", gap: isMobileView ? "10px" : "14px" }}>
                    
                    {/* Mode A : Frais à la charge de l'entreprise */}
                    <div
                        onClick={() => {
                            if (checkExpired()) return;
                            setStripeFeeBearer("COMPANY");
                            performAutoSave({ stripeFeeBearer: "COMPANY" });
                        }}
                        style={{
                            border: "1px solid var(--border)",
                            borderRadius: isMobileView ? "10px" : "12px",
                            padding: isMobileView ? "12px 14px" : "16px",
                            backgroundColor: stripeFeeBearer === "COMPANY" ? "var(--accent)" : "transparent",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between"
                        }}
                    >
                        <div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                                <span style={{ fontWeight: 700, fontSize: isMobileView ? "13.5px" : "14.5px", color: "var(--foreground)" }}>
                                    À la charge de l'entreprise
                                </span>
                                <input
                                    type="radio"
                                    name="stripeFeeBearer"
                                    checked={stripeFeeBearer === "COMPANY"}
                                    onChange={() => {
                                        if (checkExpired()) return;
                                        setStripeFeeBearer("COMPANY");
                                        performAutoSave({ stripeFeeBearer: "COMPANY" });
                                    }}
                                    style={{ accentColor: "var(--primary)", cursor: "pointer", width: isMobileView ? "16px" : "16px", height: isMobileView ? "16px" : "16px" }}
                                />
                            </div>
                            <p style={{ margin: 0, fontSize: isMobileView ? "12px" : "13px", color: "var(--muted-foreground)", lineHeight: 1.35 }}>
                                Le client paie <strong>exactement le montant TTC</strong>. Les frais Stripe (~1,5% + 0,25€) sont déduits du versement.
                            </p>
                        </div>
                        <div style={{ marginTop: isMobileView ? "8px" : "12px", fontSize: isMobileView ? "11.5px" : "12px", color: "var(--primary)", fontWeight: 600 }}>
                            Recommandé pour une expérience client fluide
                        </div>
                    </div>

                    {/* Mode B : Frais à la charge du client */}
                    <div
                        onClick={() => {
                            if (checkExpired()) return;
                            setStripeFeeBearer("CLIENT");
                            performAutoSave({ stripeFeeBearer: "CLIENT" });
                        }}
                        style={{
                            border: "1px solid var(--border)",
                            borderRadius: isMobileView ? "10px" : "12px",
                            padding: isMobileView ? "12px 14px" : "16px",
                            backgroundColor: stripeFeeBearer === "CLIENT" ? "var(--accent)" : "transparent",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between"
                        }}
                    >
                        <div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                                <span style={{ fontWeight: 700, fontSize: isMobileView ? "13.5px" : "14.5px", color: "var(--foreground)" }}>
                                    À la charge du client
                                </span>
                                <input
                                    type="radio"
                                    name="stripeFeeBearer"
                                    checked={stripeFeeBearer === "CLIENT"}
                                    onChange={() => {
                                        if (checkExpired()) return;
                                        setStripeFeeBearer("CLIENT");
                                        performAutoSave({ stripeFeeBearer: "CLIENT" });
                                    }}
                                    style={{ accentColor: "var(--primary)", cursor: "pointer", width: isMobileView ? "16px" : "16px", height: isMobileView ? "16px" : "16px" }}
                                />
                            </div>
                            <p style={{ margin: 0, fontSize: isMobileView ? "12px" : "13px", color: "var(--muted-foreground)", lineHeight: 1.35 }}>
                                Le client règle le montant <strong>majoré des frais Stripe</strong>. Vous percevez l'intégralité de votre facture.
                            </p>
                        </div>
                        <div style={{ marginTop: isMobileView ? "8px" : "12px", fontSize: isMobileView ? "11.5px" : "12px", color: "var(--muted-foreground)" }}>
                            Calculé automatiquement avec formule inversée
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
                            marginTop: isMobileView ? "12px" : "16px",
                            backgroundColor: "var(--background)",
                            border: "1px solid var(--border)",
                            borderRadius: isMobileView ? "10px" : "12px",
                            padding: isMobileView ? "12px 14px" : "16px 20px"
                        }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: isMobileView ? "8px" : "10px", marginBottom: isMobileView ? "10px" : "14px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                    <Calculator size={isMobileView ? 15 : 16} style={{ color: "var(--primary)", flexShrink: 0 }} />
                                    <span style={{ fontSize: isMobileView ? "13px" : "14px", fontWeight: 700, color: "var(--foreground)" }}>
                                        Exemple de calcul :
                                    </span>
                                    <span style={{ fontSize: isMobileView ? "11px" : "12px", color: "var(--muted-foreground)" }}>
                                        (1,5% + 0,25 €)
                                    </span>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                    <span style={{ fontSize: isMobileView ? "12px" : "12.5px", color: "var(--muted-foreground)", fontWeight: 500 }}>Montant TTC :</span>
                                    <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                                        <input
                                            type="number"
                                            value={simAmount}
                                            onChange={(e) => setSimAmount(e.target.value)}
                                            min="1"
                                            step="10"
                                            style={{
                                                width: isMobileView ? "90px" : "110px",
                                                height: isMobileView ? "34px" : "auto",
                                                padding: isMobileView ? "4px 22px 4px 8px" : "6px 24px 6px 10px",
                                                borderRadius: "6px",
                                                border: "1px solid var(--border)",
                                                backgroundColor: "var(--card)",
                                                color: "var(--foreground)",
                                                fontWeight: 700,
                                                fontSize: isMobileView ? "13.5px" : "13.5px",
                                                textAlign: "right",
                                                boxSizing: "border-box"
                                            }}
                                        />
                                        <span style={{ position: "absolute", right: "7px", fontSize: isMobileView ? "12px" : "13px", color: "var(--muted-foreground)", pointerEvents: "none" }}>€</span>
                                    </div>
                                </div>
                            </div>

                            {/* Cartes de décomposition de l'exemple */}
                            <div style={{ display: "grid", gridTemplateColumns: isMobileView ? "1fr" : "1fr 1fr 1fr", gap: isMobileView ? "8px" : "12px" }}>
                                
                                {/* Facture / Paiement Client */}
                                <div style={{
                                    backgroundColor: "var(--card)",
                                    padding: isMobileView ? "10px 12px" : "12px 14px",
                                    borderRadius: "8px",
                                    border: "1px solid var(--border)",
                                    display: isMobileView ? "flex" : "block",
                                    alignItems: isMobileView ? "center" : undefined,
                                    justifyContent: isMobileView ? "space-between" : undefined
                                }}>
                                    <div>
                                        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: isMobileView ? "11.5px" : "11.5px", color: "var(--muted-foreground)", marginBottom: isMobileView ? 0 : "4px" }}>
                                            <User size={13} style={{ color: "var(--muted-foreground)" }} />
                                            Le client paie
                                        </span>
                                        {!isMobileView && (
                                            <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--foreground)" }}>
                                                {clientPays.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                                            </div>
                                        )}
                                        <span style={{ display: "block", fontSize: isMobileView ? "11px" : "9px", color: stripeFeeBearer === "CLIENT" ? "#F59E0B" : "var(--muted-foreground)" }}>
                                            {stripeFeeBearer === "CLIENT" ? `(+ ${stripeFee.toFixed(2)} € frais)` : "(Montant exact)"}
                                        </span>
                                    </div>
                                    {isMobileView && (
                                        <div style={{ fontSize: "14.5px", fontWeight: 800, color: "var(--foreground)" }}>
                                            {clientPays.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                                        </div>
                                    )}
                                </div>

                                {/* Frais Stripe */}
                                <div style={{
                                    backgroundColor: "var(--card)",
                                    padding: isMobileView ? "10px 12px" : "12px 14px",
                                    borderRadius: "8px",
                                    border: "1px solid var(--border)",
                                    display: isMobileView ? "flex" : "block",
                                    alignItems: isMobileView ? "center" : undefined,
                                    justifyContent: isMobileView ? "space-between" : undefined
                                }}>
                                    <div>
                                        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: isMobileView ? "11.5px" : "11.5px", color: "var(--muted-foreground)", marginBottom: isMobileView ? 0 : "4px" }}>
                                            <CreditCard size={13} style={{ color: "#635BFF" }} />
                                            Frais Stripe
                                        </span>
                                        {!isMobileView && (
                                            <div style={{ fontSize: "18px", fontWeight: 800, color: "#635BFF" }}>
                                                {stripeFee.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                                            </div>
                                        )}
                                        <span style={{ display: "block", fontSize: isMobileView ? "11px" : "9px", color: "var(--muted-foreground)" }}>
                                            {stripeFeeBearer === "CLIENT" ? "Payés par le client" : "Déduits du versement"}
                                        </span>
                                    </div>
                                    {isMobileView && (
                                        <div style={{ fontSize: "14.5px", fontWeight: 800, color: "#635BFF" }}>
                                            {stripeFee.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                                        </div>
                                    )}
                                </div>

                                {/* Ce que reçoit l'entreprise */}
                                <div style={{
                                    backgroundColor: "var(--accent)",
                                    padding: isMobileView ? "10px 12px" : "12px 14px",
                                    borderRadius: "8px",
                                    border: "1px solid var(--border)",
                                    display: isMobileView ? "flex" : "block",
                                    alignItems: isMobileView ? "center" : undefined,
                                    justifyContent: isMobileView ? "space-between" : undefined
                                }}>
                                    <div>
                                        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: isMobileView ? "11.5px" : "11.5px", color: "var(--primary)", fontWeight: 700, marginBottom: isMobileView ? 0 : "4px" }}>
                                            <Building2 size={13} style={{ color: "var(--primary)" }} />
                                            Vous percevez (Net)
                                        </span>
                                        {!isMobileView && (
                                            <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--primary)" }}>
                                                {companyReceives.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                                            </div>
                                        )}
                                        <span style={{ display: "block", fontSize: isMobileView ? "11px" : "9px", color: stripeFeeBearer === "CLIENT" ? "var(--primary)" : "var(--muted-foreground)", fontWeight: stripeFeeBearer === "CLIENT" ? 600 : 400 }}>
                                            {stripeFeeBearer === "CLIENT" ? "✓ 100% de la facture" : "Versé sur votre compte"}
                                        </span>
                                    </div>
                                    {isMobileView && (
                                        <div style={{ fontSize: "14.5px", fontWeight: 800, color: "var(--primary)" }}>
                                            {companyReceives.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                                        </div>
                                    )}
                                </div>

                            </div>
                        </div>
                    );
                })()}
            </div>

            {/* Bouton de sauvegarde global (Desktop only) */}
            {!isMobileView && (
                <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: "8px" }}>
                    <button
                        type="submit"
                        disabled={savingSettings}
                        style={{
                            width: "auto",
                            justifyContent: "center",
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
                            gap: "6px",
                            boxShadow: "0 4px 14px rgba(85, 107, 47, 0.3)"
                        }}
                    >
                        {savingSettings ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                        Enregistrer les paramètres de paiement
                    </button>
                </div>
            )}
        </form>
    );
}
