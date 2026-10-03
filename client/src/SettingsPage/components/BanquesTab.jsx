import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
    Building,
    Building2,
    CheckCircle2,
    AlertCircle,
    Shield,
    ChevronDown,
    Search,
    Loader2,
    ShieldCheck,
    RefreshCw,
    Trash2,
    ExternalLink,
    Landmark,
    Lock,
    Plus,
    Crown,
    X
} from "lucide-react";
import { apiFetch } from "../../utils/api";
import { useSubscription } from "../../utils/useSubscription";
import { FRENCH_BANKS, formatIBAN, formatBIC, validateIBAN, validateBIC } from "../../utils/bankValidator";

export default function BanquesTab({ isMobileView, triggerToast }) {
    const { isStarter, isPro, isUnlimited, isExpired, refreshSubscription } = useSubscription();

    // Form States
    const [selectedBankId, setSelectedBankId] = useState("bourso");
    const [customBankName, setCustomBankName] = useState("");
    const [accountOwner, setAccountOwner] = useState("");
    const [iban, setIban] = useState("");
    const [bic, setBic] = useState("");

    // UI Dropdown & Search state
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [bankSearch, setBankSearch] = useState("");
    const [saving, setSaving] = useState(false);
    const [loadingInitial, setLoadingInitial] = useState(true);

    // Open Banking State
    const [bankingStatus, setBankingStatus] = useState({
        isConnected: false,
        connection: null,
        accounts: []
    });
    const [syncingBanking, setSyncingBanking] = useState(false);
    const [disconnectingBanking, setDisconnectingBanking] = useState(false);
    const [showExtraBankModal, setShowExtraBankModal] = useState(false);
    const [extraBankLoading, setExtraBankLoading] = useState(false);

    const loadBankingStatus = useCallback(async () => {
        try {
            const res = await apiFetch("/v1/banking/accounts");
            if (res?.data) {
                setBankingStatus(res.data);
            }
        } catch (err) {
            console.warn("Could not fetch banking status:", err.message);
        }
    }, []);

    const handleConnectBanking = async () => {
        if (isExpired) {
            window.dispatchEvent(new CustomEvent('subscription_expired', {
                detail: { message: "Abonnement expiré. Renouvelez votre offre pour connecter votre compte bancaire." }
            }));
            if (triggerToast) triggerToast("Abonnement expiré. Veuillez renouveler votre offre.", true);
            return;
        }
        if (isStarter) {
            if (triggerToast) triggerToast("La synchronisation bancaire automatique est réservée aux forfaits Pro et Unlimited.", true);
            return;
        }
        try {
            const res = await apiFetch("/v1/banking/connect", { method: "POST" });
            if (res.data?.connectUrl) {
                window.location.href = res.data.connectUrl;
            } else {
                if (triggerToast) triggerToast(res.data?.message || "Module Open Banking prêt.", false);
            }
        } catch (e) {
            if (e.code === "EXTRA_BANK_REQUIRED") {
                setShowExtraBankModal(true);
            } else if (e.code === "STARTER_LOCK") {
                if (triggerToast) triggerToast(e.message, true);
            } else if (e.code === "SUBSCRIPTION_EXPIRED") {
                window.dispatchEvent(new CustomEvent('subscription_expired', {
                    detail: { message: e.message || "Abonnement expiré. Veuillez renouveler votre offre." }
                }));
                if (triggerToast) triggerToast(e.message || "Abonnement expiré.", true);
            } else {
                if (triggerToast) triggerToast(e.message || "Erreur Open Banking.", true);
            }
        }
    };

    const handleConfirmExtraBankAddon = async () => {
        setExtraBankLoading(true);
        try {
            await apiFetch("/v1/subscription/extra-bank", { method: "POST" });
            if (triggerToast) triggerToast("Option compte bancaire supplémentaire activée (+7,00 € HT/mois) !");
            setShowExtraBankModal(false);
            if (refreshSubscription) refreshSubscription();
            const res = await apiFetch("/v1/banking/connect", { method: "POST" });
            if (res.data?.connectUrl) {
                window.location.href = res.data.connectUrl;
            }
        } catch (err) {
            if (triggerToast) triggerToast(err.message || "Erreur lors de l'activation de l'option.", true);
        } finally {
            setExtraBankLoading(false);
        }
    };

    // Fetch initial company bank settings & banking status
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const [settingsRes, bankingRes] = await Promise.allSettled([
                    apiFetch("/v1/company/settings"),
                    apiFetch("/v1/banking/accounts")
                ]);

                if (settingsRes.status === "fulfilled") {
                    const s = settingsRes.value?.data?.settings || settingsRes.value?.settings;
                    if (s) {
                        if (s.bankIban) setIban(formatIBAN(s.bankIban));
                        if (s.bankBic) setBic(s.bankBic);
                        if (s.bankAccountOwner) setAccountOwner(s.bankAccountOwner);

                        if (s.bankName) {
                            const matchedBank = FRENCH_BANKS.find(
                                b => b.name.toLowerCase() === s.bankName.toLowerCase() || b.id === s.bankName.toLowerCase()
                            );
                            if (matchedBank) {
                                setSelectedBankId(matchedBank.id);
                            } else {
                                setSelectedBankId("other");
                                setCustomBankName(s.bankName);
                            }
                        }
                    }
                }

                if (bankingRes.status === "fulfilled" && bankingRes.value?.data) {
                    setBankingStatus(bankingRes.value.data);
                }
            } catch (err) {
                console.warn("Could not fetch bank data:", err.message);
            } finally {
                setLoadingInitial(false);
            }
        };

        fetchSettings();
    }, []);

    // Handle Banking Callback redirect params if present
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const bankingCode = params.get("code") || params.get("token");
        const connectionId = params.get("connection_id") || params.get("connectionId") || params.get("id");
        const bankingErr = params.get("error") || params.get("detail");

        if (bankingErr) {
            if (triggerToast) triggerToast(`Erreur bancaire: ${params.get("error_description") || bankingErr}`, true);
            window.history.replaceState({}, document.title, window.location.pathname);
        } else if (bankingCode || connectionId) {
            const finishConnect = async () => {
                try {
                    const res = await apiFetch("/v1/banking/callback", {
                        method: "POST",
                        body: JSON.stringify({
                            code: bankingCode,
                            connection_id: connectionId,
                            state: params.get("state")
                        })
                    });
                    if (triggerToast) triggerToast(res?.message || "Connexion bancaire DSP2 établie avec succès !");
                    await loadBankingStatus();
                } catch (e) {
                    console.error("Banking callback error:", e);
                    if (triggerToast) triggerToast(e.message || "Erreur lors de la synchronisation bancaire", true);
                } finally {
                    window.history.replaceState({}, document.title, window.location.pathname);
                }
            };
            finishConnect();
        }
    }, [loadBankingStatus, triggerToast]);

    // Current bank object
    const selectedBank = useMemo(() => {
        return FRENCH_BANKS.find(b => b.id === selectedBankId) || FRENCH_BANKS[0];
    }, [selectedBankId]);

    // Live IBAN & BIC Validations
    const ibanStatus = useMemo(() => {
        if (!iban || iban.trim().length === 0) return { valid: false, message: "" };
        return validateIBAN(iban);
    }, [iban]);

    const bicStatus = useMemo(() => {
        if (!bic || bic.trim().length === 0) return { valid: false, message: "" };
        return validateBIC(bic);
    }, [bic]);

    // Filter banks in search dropdown
    const filteredBanks = useMemo(() => {
        if (!bankSearch.trim()) return FRENCH_BANKS;
        const q = bankSearch.toLowerCase();
        return FRENCH_BANKS.filter(
            b => b.name.toLowerCase().includes(q) || b.shortName.toLowerCase().includes(q) || b.bic.toLowerCase().includes(q)
        );
    }, [bankSearch]);

    // Display all active synchronized bank accounts
    const displayAccounts = useMemo(() => {
        return bankingStatus.accounts || [];
    }, [bankingStatus.accounts]);

    // Handle bank selection from list
    const handleSelectBank = (bank) => {
        setSelectedBankId(bank.id);
        setIsDropdownOpen(false);
        setBankSearch("");

        if (bank.id !== "other" && bank.bic) {
            setBic(bank.bic);
        }
    };

    // Auto-format IBAN on typing
    const handleIbanChange = (e) => {
        const formatted = formatIBAN(e.target.value);
        setIban(formatted);

        // Auto-detect bank from French bank code if valid length
        const clean = formatted.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
        if (clean.startsWith("FR") && clean.length >= 9) {
            const codeBanque = clean.substring(4, 9);
            const foundBank = FRENCH_BANKS.find(b => b.bankCode === codeBanque);
            if (foundBank && foundBank.id !== selectedBankId) {
                setSelectedBankId(foundBank.id);
                if (foundBank.bic && (!bic || bic.length === 0 || bic.includes("XXX"))) {
                    setBic(foundBank.bic);
                }
            }
        }
    };

    // Save Bank Coordinates to API
    const handleSave = async (e) => {
        if (e) e.preventDefault();

        if (isExpired) {
            window.dispatchEvent(new CustomEvent('subscription_expired', {
                detail: { message: "Abonnement expiré. Renouvelez votre offre pour modifier vos coordonnées bancaires." }
            }));
            return;
        }

        if (iban && !ibanStatus.valid) {
            if (triggerToast) triggerToast(ibanStatus.message || "IBAN invalide. Veuillez vérifier votre saisie.", true);
            return;
        }

        if (bic && !bicStatus.valid) {
            if (triggerToast) triggerToast(bicStatus.message || "BIC invalide.", true);
            return;
        }

        setSaving(true);
        try {
            const effectiveBankName = selectedBankId === "other" ? (customBankName || "Établissement bancaire") : selectedBank.name;

            await apiFetch("/v1/company/settings", {
                method: "PATCH",
                body: JSON.stringify({
                    bankName: effectiveBankName,
                    bankIban: iban.replace(/\s/g, ""),
                    bankBic: bic.trim().toUpperCase(),
                    bankAccountOwner: accountOwner
                })
            });

            if (triggerToast) triggerToast("Coordonnées bancaires officielles enregistrées pour vos devis & factures !");
        } catch (err) {
            if (triggerToast) triggerToast(err.message || "Erreur lors de l'enregistrement de l'IBAN.", true);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobileView ? '16px' : '24px' }}>
            {/* Formulaire IBAN / BIC Principal */}
            <form onSubmit={handleSave} style={{
                border: '1px solid var(--border)',
                borderRadius: isMobileView ? '14px' : '16px',
                padding: isMobileView ? '16px' : '24px',
                backgroundColor: 'var(--card)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: isMobileView ? '14px' : '20px', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: isMobileView ? '15px' : '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                                width: isMobileView ? '30px' : '32px',
                                height: isMobileView ? '30px' : '32px',
                                borderRadius: '8px',
                                background: 'rgba(85,107,47,0.12)',
                                color: '#556B2F',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                <Building size={isMobileView ? 17 : 18} />
                            </span>
                            <span>Coordonnées Bancaires (RIB)</span>
                        </h3>
                        <p style={{ margin: '4px 0 0 0', fontSize: isMobileView ? '12px' : '12.5px', color: 'var(--muted-foreground)', lineHeight: 1.35 }}>
                            Imprimées sur vos devis et factures PDF pour permettre le règlement par virement.
                        </p>
                    </div>

                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: isMobileView ? '11px' : '12px',
                        color: '#22C55E',
                        fontWeight: 700,
                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                        padding: isMobileView ? '4px 10px' : '4px 10px',
                        borderRadius: '50px'
                    }}>
                        <Shield size={isMobileView ? 13 : 14} /> Chiffrement SSL 256-bit
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobileView ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))', gap: isMobileView ? '12px' : '18px' }}>
                    {/* Établissement Bancaire Selector with Logos */}
                    <div style={{ gridColumn: '1 / -1', position: 'relative' }}>
                        <label style={{ display: 'block', fontSize: isMobileView ? '12px' : '12px', fontWeight: 700, marginBottom: '5px', color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                            Établissement Bancaire
                        </label>

                        <div
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: isMobileView ? '10px 12px' : '10px 14px',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                backgroundColor: 'var(--background)',
                                cursor: 'pointer',
                                transition: 'border 0.15s'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: isMobileView ? '10px' : '12px', minWidth: 0 }}>
                                <div style={{
                                    width: isMobileView ? '30px' : '32px',
                                    height: isMobileView ? '30px' : '32px',
                                    borderRadius: '6px',
                                    backgroundColor: selectedBank.bgColor,
                                    color: selectedBank.textColor,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: 800, fontSize: isMobileView ? '10.5px' : '11px', flexShrink: 0,
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                                }}>
                                    {selectedBank.logoLetter}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <span style={{ fontWeight: 700, fontSize: isMobileView ? '13.5px' : '14px', display: 'block', color: 'var(--foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {selectedBank.id === "other" ? (customBankName || "Autre établissement bancaire") : selectedBank.name}
                                    </span>
                                    {selectedBank.bic && (
                                        <span style={{ fontSize: isMobileView ? '11px' : '11.5px', color: 'var(--muted-foreground)', display: 'block' }}>
                                            BIC : {selectedBank.bic}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <ChevronDown size={16} style={{ color: 'var(--muted-foreground)', transform: isDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
                        </div>

                        {/* Searchable Bank Dropdown Menu */}
                        {isDropdownOpen && (
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                zIndex: 50,
                                marginTop: '6px',
                                backgroundColor: 'var(--card)',
                                border: '1px solid var(--border)',
                                borderRadius: '12px',
                                boxShadow: '0 16px 36px rgba(0,0,0,0.25)',
                                overflow: 'hidden',
                                maxHeight: '300px',
                                display: 'flex',
                                flexDirection: 'column'
                            }}>
                                {/* Search filter */}
                                <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--background)' }}>
                                    <Search size={15} style={{ color: 'var(--muted-foreground)' }} />
                                    <input
                                        type="text"
                                        placeholder="Rechercher une banque (Bourso, BNP, Qonto)..."
                                        value={bankSearch}
                                        onChange={(e) => setBankSearch(e.target.value)}
                                        style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '13px', color: 'var(--foreground)' }}
                                    />
                                </div>

                                {/* List of Banks */}
                                <div style={{ overflowY: 'auto', padding: '4px' }}>
                                    {filteredBanks.map((b) => (
                                        <div
                                            key={b.id}
                                            onClick={() => handleSelectBank(b)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '8px 10px',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                backgroundColor: selectedBankId === b.id ? 'rgba(85,107,47,0.12)' : 'transparent',
                                                transition: 'background-color 0.12s'
                                            }}
                                            onMouseEnter={(e) => { if (selectedBankId !== b.id) e.currentTarget.style.backgroundColor = 'var(--background)'; }}
                                            onMouseLeave={(e) => { if (selectedBankId !== b.id) e.currentTarget.style.backgroundColor = 'transparent'; }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{
                                                    width: '28px', height: '28px', borderRadius: '5px',
                                                    backgroundColor: b.bgColor,
                                                    color: b.textColor,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontWeight: 800, fontSize: '10px', flexShrink: 0
                                                }}>
                                                    {b.logoLetter}
                                                </div>
                                                <span style={{ fontSize: isMobileView ? '13px' : '13.5px', fontWeight: selectedBankId === b.id ? 700 : 500 }}>
                                                    {b.name}
                                                </span>
                                            </div>

                                            {b.bic && (
                                                <span style={{ fontSize: '11px', color: 'var(--muted-foreground)', fontFamily: 'monospace', fontWeight: 600 }}>
                                                    {b.bic}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Custom Bank Name if "Other" selected */}
                        {selectedBankId === "other" && (
                            <div style={{ marginTop: '8px' }}>
                                <input
                                    type="text"
                                    placeholder="Saisissez le nom complet de votre banque"
                                    value={customBankName}
                                    onChange={(e) => setCustomBankName(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: isMobileView ? '10px 12px' : '10px 14px',
                                        backgroundColor: 'var(--background)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '8px',
                                        color: 'var(--foreground)',
                                        fontSize: isMobileView ? '13.5px' : '13.5px',
                                        outline: 'none',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    {/* Titulaire du compte */}
                    <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ display: 'block', fontSize: isMobileView ? '12px' : '12px', fontWeight: 700, marginBottom: '5px', color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                            Titulaire du compte (Société ou Nom)
                        </label>
                        <input
                            type="text"
                            placeholder="ex: Dupont Climatisation SAS ou Jean Dupont"
                            value={accountOwner}
                            onChange={(e) => setAccountOwner(e.target.value)}
                            style={{
                                width: '100%',
                                padding: isMobileView ? '10px 12px' : '11px 14px',
                                backgroundColor: 'var(--background)',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                color: 'var(--foreground)',
                                fontSize: isMobileView ? '13.5px' : '14px',
                                outline: 'none',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    {/* IBAN Input with Live ISO Checksum Validation */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                            <label style={{ fontSize: isMobileView ? '12px' : '12px', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                IBAN (FR ou International)
                            </label>
                            {iban.length > 0 && (
                                <span style={{
                                    fontSize: isMobileView ? '11px' : '11px',
                                    fontWeight: 700,
                                    color: ibanStatus.valid ? '#22C55E' : '#EF4444',
                                    display: 'flex', alignItems: 'center', gap: '3px'
                                }}>
                                    {ibanStatus.valid ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                                    {ibanStatus.valid ? "IBAN Validé" : "IBAN Invalide"}
                                </span>
                            )}
                        </div>

                        <input
                            type="text"
                            placeholder="FR76 3000 3020 5001 2345 6789 012"
                            value={iban}
                            onChange={handleIbanChange}
                            maxLength={39}
                            style={{
                                width: '100%',
                                padding: isMobileView ? '10px 8px' : '10px 14px',
                                backgroundColor: 'var(--background)',
                                border: iban.length === 0 ? '1px solid var(--border)' : ibanStatus.valid ? '1px solid #22C55E' : '1px solid #EF4444',
                                borderRadius: '8px',
                                color: 'var(--foreground)',
                                fontSize: isMobileView ? '11px' : '12.5px',
                                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                                fontVariantNumeric: 'tabular-nums',
                                fontWeight: 600,
                                letterSpacing: isMobileView ? '-0.2px' : '0.2px',
                                outline: 'none',
                                boxSizing: 'border-box',
                                transition: 'border-color 0.15s'
                            }}
                            required
                        />
                        {iban.length > 0 && !ibanStatus.valid && (
                            <span style={{ fontSize: '11px', color: '#EF4444', marginTop: '4px', display: 'block' }}>
                                {ibanStatus.message}
                            </span>
                        )}
                    </div>

                    {/* Code BIC / SWIFT */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                            <label style={{ fontSize: isMobileView ? '12px' : '12px', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                Code BIC / SWIFT
                            </label>
                            {bic.length > 0 && (
                                <span style={{
                                    fontSize: isMobileView ? '11px' : '11px',
                                    fontWeight: 700,
                                    color: bicStatus.valid ? '#22C55E' : '#EF4444',
                                    display: 'flex', alignItems: 'center', gap: '3px'
                                }}>
                                    {bicStatus.valid ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                                    {bicStatus.valid ? "BIC Validé" : "Invalide"}
                                </span>
                            )}
                        </div>

                        <input
                            type="text"
                            placeholder="BOUSFRPPXXX"
                            value={bic}
                            onChange={(e) => setBic(formatBIC(e.target.value))}
                            maxLength={11}
                            style={{
                                width: '100%',
                                padding: isMobileView ? '10px 8px' : '10px 14px',
                                backgroundColor: 'var(--background)',
                                border: bic.length === 0 ? '1px solid var(--border)' : bicStatus.valid ? '1px solid #22C55E' : '1px solid #EF4444',
                                borderRadius: '8px',
                                color: 'var(--foreground)',
                                fontSize: isMobileView ? '11.5px' : '12.5px',
                                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                                fontVariantNumeric: 'tabular-nums',
                                fontWeight: 600,
                                letterSpacing: '0.2px',
                                outline: 'none',
                                boxSizing: 'border-box',
                                transition: 'border-color 0.15s'
                            }}
                            required
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: isMobileView ? 'stretch' : 'flex-end', marginTop: isMobileView ? '16px' : '20px' }}>
                    <button
                        type="submit"
                        disabled={saving}
                        style={{
                            width: isMobileView ? '100%' : 'auto',
                            justifyContent: 'center',
                            padding: isMobileView ? '12px 16px' : '11px 24px',
                            background: '#556B2F',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 700,
                            fontSize: isMobileView ? '14px' : '13.5px',
                            cursor: saving ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            opacity: isExpired ? 0.85 : 1,
                            boxShadow: '0 4px 14px rgba(85,107,47,0.3)',
                            transition: 'all 0.15s'
                        }}
                    >
                        {isExpired && <Lock size={15} />}
                        {saving ? <><Loader2 size={16} className="spin-loader" /> Enregistrement...</> : "Enregistrer l'IBAN"}
                    </button>
                </div>
            </form>

            {/* Rapprochement bancaire automatique (Open Banking DSP2) */}
            <div style={{
                border: "1px solid var(--border)",
                borderRadius: isMobileView ? "14px" : "16px",
                padding: isMobileView ? "16px" : "24px",
                backgroundColor: "var(--card)"
            }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: isMobileView ? "12px" : "14px" }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: isMobileView ? "15px" : "16px", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                            <span style={{
                                width: isMobileView ? '30px' : '32px',
                                height: isMobileView ? '30px' : '32px',
                                borderRadius: '8px',
                                background: 'rgba(85,107,47,0.12)',
                                color: '#556B2F',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                <Building2 size={isMobileView ? 17 : 18} />
                            </span>
                            <span>Rapprochement bancaire</span>
                            <span style={{
                                fontSize: "10.5px",
                                fontWeight: 700,
                                padding: "2px 7px",
                                borderRadius: "4px",
                                backgroundColor: "rgba(85, 107, 47, 0.15)",
                                color: "var(--primary)",
                                border: "1px solid rgba(85, 107, 47, 0.3)"
                            }}>
                                DSP2
                            </span>
                        </h3>
                        <p style={{ color: "var(--muted-foreground)", fontSize: isMobileView ? "12px" : "13px", margin: "4px 0 0 0", lineHeight: 1.35 }}>
                            Connectez votre compte pour lettrer automatiquement les règlements avec vos factures.
                        </p>
                    </div>
                </div>

                {isStarter || isExpired ? (
                    <div style={{
                        padding: isMobileView ? "16px" : "20px",
                        borderRadius: "10px",
                        backgroundColor: "rgba(85, 107, 47, 0.06)",
                        border: "1px dashed rgba(85, 107, 47, 0.3)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: "14px"
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", maxWidth: "550px" }}>
                            <div style={{
                                width: "40px",
                                height: "40px",
                                borderRadius: "10px",
                                backgroundColor: "rgba(85, 107, 47, 0.12)",
                                color: "#556B2F",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0
                            }}>
                                <Lock size={20} />
                            </div>
                            <div>
                                <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--foreground)" }}>
                                    {isExpired ? "Abonnement expiré" : "Synchronisation automatique réservée à l'offre Pro"}
                                </div>
                                <div style={{ fontSize: "12.5px", color: "var(--muted-foreground)", marginTop: "2px" }}>
                                    {isExpired
                                        ? "Renouvelez votre abonnement pour synchroniser vos comptes bancaires et automatiser le lettrage de vos factures."
                                        : "Connectez vos comptes bancaires et automatisez le lettrage de vos factures avec le forfait Pro (69,90 €/mois)."}
                                </div>
                            </div>
                        </div>
                        <a
                            href="/settings?tab=abonnement"
                            style={{
                                padding: "9px 18px",
                                backgroundColor: "#556B2F",
                                color: "#FFFFFF",
                                borderRadius: "8px",
                                fontSize: "13px",
                                fontWeight: 700,
                                textDecoration: "none",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px"
                            }}
                        >
                            <Crown size={14} /> {isExpired ? "Renouveler mon offre" : "Passer à l'offre Pro"}
                        </a>
                    </div>
                ) : (
                    <>
                        <div style={{
                            border: "1px solid var(--border)",
                            borderRadius: "10px",
                            padding: isMobileView ? "14px" : "16px",
                            backgroundColor: "var(--background)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            flexWrap: "wrap",
                            gap: isMobileView ? "12px" : "12px"
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <div style={{
                                    width: isMobileView ? "36px" : "38px",
                                    height: isMobileView ? "36px" : "38px",
                                    borderRadius: "8px",
                                    backgroundColor: "rgba(85, 107, 47, 0.15)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "var(--primary)",
                                    flexShrink: 0
                                }}>
                                    <ShieldCheck size={isMobileView ? 19 : 20} />
                                </div>
                                <div>
                                    <div style={{ fontSize: isMobileView ? "13.5px" : "14px", fontWeight: 700, color: "var(--foreground)" }}>
                                        {bankingStatus.isConnected ? `${displayAccounts.length} compte(s) bancaire(s) synchronisé(s)` : "Aucun compte synchronisé"}
                                    </div>
                                    <div style={{ fontSize: isMobileView ? "12px" : "12.5px", color: "var(--muted-foreground)" }}>
                                        Connexion DSP2 chiffrée et sécurisée.
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "8px", width: isMobileView ? "100%" : "auto", flexWrap: "wrap" }}>
                                {bankingStatus.isConnected ? (
                                    <>
                                        <button
                                            type="button"
                                            onClick={handleConnectBanking}
                                            style={{
                                                flex: isMobileView ? 1 : undefined,
                                                justifyContent: 'center',
                                                padding: isMobileView ? "9px 14px" : "8px 14px",
                                                borderRadius: "8px",
                                                border: "1px solid var(--border)",
                                                backgroundColor: "var(--card)",
                                                color: "var(--foreground)",
                                                fontSize: isMobileView ? "13px" : "12.5px",
                                                fontWeight: 600,
                                                cursor: "pointer",
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: "6px"
                                            }}
                                        >
                                            <Plus size={14} />
                                            Ajouter un compte
                                        </button>

                                        <button
                                            type="button"
                                            disabled={syncingBanking}
                                            onClick={async () => {
                                                setSyncingBanking(true);
                                                try {
                                                    const res = await apiFetch("/v1/banking/transactions/refresh", { method: "POST" });
                                                    if (triggerToast) triggerToast(res?.message || "Synchronisation bancaire terminée.", false);
                                                    await loadBankingStatus();
                                                } catch (e) {
                                                    if (triggerToast) triggerToast(e.message || "Erreur de synchronisation", true);
                                                } finally {
                                                    setSyncingBanking(false);
                                                }
                                            }}
                                            style={{
                                                flex: isMobileView ? 1 : undefined,
                                                justifyContent: 'center',
                                                padding: isMobileView ? "9px 14px" : "8px 14px",
                                                borderRadius: "8px",
                                                border: "1px solid var(--border)",
                                                backgroundColor: "var(--card)",
                                                color: "var(--foreground)",
                                                fontSize: isMobileView ? "13px" : "12.5px",
                                                fontWeight: 600,
                                                cursor: syncingBanking ? "not-allowed" : "pointer",
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: "6px"
                                            }}
                                        >
                                            <RefreshCw size={14} style={{ animation: syncingBanking ? "spin 1s linear infinite" : "none" }} />
                                            {syncingBanking ? "Sync..." : "Synchroniser"}
                                        </button>

                                        <button
                                            type="button"
                                            disabled={disconnectingBanking}
                                            onClick={async () => {
                                                if (!window.confirm("Voulez-vous vraiment déconnecter votre compte bancaire ?")) return;
                                                setDisconnectingBanking(true);
                                                try {
                                                    await apiFetch("/v1/banking/disconnect", { method: "POST" });
                                                    if (triggerToast) triggerToast("Compte bancaire déconnecté.", false);
                                                    await loadBankingStatus();
                                                } catch (e) {
                                                    if (triggerToast) triggerToast(e.message || "Erreur lors de la déconnexion", true);
                                                } finally {
                                                    setDisconnectingBanking(false);
                                                }
                                            }}
                                            style={{
                                                flex: isMobileView ? 1 : undefined,
                                                justifyContent: 'center',
                                                padding: isMobileView ? "9px 14px" : "8px 14px",
                                                borderRadius: "8px",
                                                border: "1px solid var(--border)",
                                                backgroundColor: "var(--card)",
                                                color: "#ef4444",
                                                fontSize: isMobileView ? "13px" : "12.5px",
                                                fontWeight: 600,
                                                cursor: disconnectingBanking ? "not-allowed" : "pointer",
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: "6px"
                                            }}
                                        >
                                            <Trash2 size={14} />
                                            {disconnectingBanking ? "Déconnexion..." : "Déconnecter"}
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleConnectBanking}
                                        style={{
                                            width: isMobileView ? "100%" : "auto",
                                            justifyContent: "center",
                                            padding: isMobileView ? "10px 16px" : "9px 18px",
                                            borderRadius: "8px",
                                            border: "1px solid var(--border)",
                                            backgroundColor: "var(--card)",
                                            color: "var(--foreground)",
                                            fontSize: isMobileView ? "13.5px" : "13px",
                                            fontWeight: 600,
                                            cursor: "pointer",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "8px"
                                        }}
                                    >
                                        <ExternalLink size={15} />
                                        Connecter mon compte bancaire
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Liste des comptes bancaires synchronisés */}
                        {bankingStatus.isConnected && displayAccounts.length > 0 && (
                            <div style={{ marginTop: "12px", display: "grid", gap: "10px" }}>
                                {displayAccounts.map((acc) => (
                                    <div
                                        key={acc.id}
                                        style={{
                                            border: "1px solid var(--border)",
                                            borderRadius: "10px",
                                            padding: isMobileView ? "12px 14px" : "14px 16px",
                                            backgroundColor: "var(--card)",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            flexWrap: "wrap",
                                            gap: "10px"
                                        }}
                                    >
                                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                            <div style={{
                                                width: isMobileView ? "32px" : "34px",
                                                height: isMobileView ? "32px" : "34px",
                                                borderRadius: "6px",
                                                backgroundColor: "rgba(85, 107, 47, 0.12)",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                color: "var(--primary)",
                                                flexShrink: 0
                                            }}>
                                                <Landmark size={isMobileView ? 16 : 18} />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: isMobileView ? "13.5px" : "13.5px", fontWeight: 700, color: "var(--foreground)" }}>
                                                    {acc.accountName || "Compte principal"}
                                                </div>
                                                <div style={{ fontSize: isMobileView ? "12px" : "12px", color: "var(--muted-foreground)", fontFamily: "monospace" }}>
                                                    {acc.iban ? formatIBAN(acc.iban) : `ID: ${acc.externalId}`}
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ textAlign: "right" }}>
                                            <div style={{ fontSize: isMobileView ? "14.5px" : "14.5px", fontWeight: 700, color: "var(--foreground)" }}>
                                                {typeof acc.balance === "number" ? `${acc.balance.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €` : "—"}
                                            </div>
                                            <span style={{
                                                fontSize: "11px",
                                                color: "#16a34a",
                                                fontWeight: 600,
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: "3px"
                                            }}>
                                                <CheckCircle2 size={12} /> Synchronisé
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Modal Option Compte Bancaire Supplémentaire (+7 € / mois) */}
            {showExtraBankModal && (
                <div style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: "rgba(0, 0, 0, 0.65)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 9999,
                    padding: "16px"
                }}>
                    <div style={{
                        maxWidth: "480px",
                        width: "100%",
                        backgroundColor: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: "16px",
                        padding: "24px",
                        boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
                        position: "relative"
                    }}>
                        <button
                            type="button"
                            onClick={() => setShowExtraBankModal(false)}
                            style={{
                                position: "absolute",
                                top: "16px",
                                right: "16px",
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                color: "var(--muted-foreground)"
                            }}
                        >
                            <X size={18} />
                        </button>

                        <div style={{
                            width: "44px",
                            height: "44px",
                            borderRadius: "12px",
                            backgroundColor: "rgba(85, 107, 47, 0.12)",
                            color: "#556B2F",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            marginBottom: "16px"
                        }}>
                            <Building2 size={22} />
                        </div>

                        <h3 style={{ fontSize: "17px", fontWeight: 700, margin: "0 0 8px 0", color: "var(--foreground)" }}>
                            Compte bancaire supplémentaire
                        </h3>

                        <p style={{ fontSize: "13.5px", color: "var(--muted-foreground)", lineHeight: 1.5, margin: "0 0 20px 0" }}>
                            {isPro
                                ? "Votre forfait Pro inclut 1 compte bancaire synchronisé. L'ajout d'un 2ème compte coûte +7,00 € HT / mois (facturé directement sur votre abonnement Stripe), ou vous pouvez passer au forfait Unlimited (3 comptes inclus)."
                                : "Votre forfait Unlimited inclut 3 comptes bancaires synchronisés. L'ajout d'un compte supplémentaire coûte +7,00 € HT / mois (facturé directement sur votre abonnement Stripe)."}
                        </p>

                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            <button
                                type="button"
                                disabled={extraBankLoading}
                                onClick={handleConfirmExtraBankAddon}
                                style={{
                                    padding: "12px 18px",
                                    backgroundColor: "#556B2F",
                                    color: "#FFFFFF",
                                    border: "none",
                                    borderRadius: "10px",
                                    fontWeight: 700,
                                    fontSize: "13.5px",
                                    cursor: extraBankLoading ? "not-allowed" : "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "8px"
                                }}
                            >
                                {extraBankLoading ? <><Loader2 size={16} className="spin-loader" /> Activation...</> : "Activer l'option (+7,00 € HT / mois)"}
                            </button>

                            {isPro && (
                                <a
                                    href="/settings?tab=abonnement"
                                    style={{
                                        padding: "10px 16px",
                                        backgroundColor: "transparent",
                                        border: "1px solid var(--border)",
                                        borderRadius: "10px",
                                        color: "var(--foreground)",
                                        fontSize: "13px",
                                        fontWeight: 600,
                                        textDecoration: "none",
                                        textAlign: "center"
                                    }}
                                >
                                    Passer au forfait Unlimited (3 comptes inclus)
                                </a>
                            )}

                            <button
                                type="button"
                                onClick={() => setShowExtraBankModal(false)}
                                style={{
                                    padding: "8px",
                                    background: "none",
                                    border: "none",
                                    color: "var(--muted-foreground)",
                                    fontSize: "12.5px",
                                    cursor: "pointer"
                                }}
                            >
                                Annuler
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
