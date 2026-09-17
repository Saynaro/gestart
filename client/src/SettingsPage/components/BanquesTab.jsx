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
    Landmark
} from "lucide-react";
import { apiFetch } from "../../utils/api";
import { FRENCH_BANKS, formatIBAN, formatBIC, validateIBAN, validateBIC } from "../../utils/bankValidator";

export default function BanquesTab({ isMobileView, triggerToast }) {
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

    // Powens Open Banking State
    const [bankingStatus, setBankingStatus] = useState({
        isConnected: false,
        connection: null,
        accounts: []
    });
    const [syncingBanking, setSyncingBanking] = useState(false);
    const [disconnectingBanking, setDisconnectingBanking] = useState(false);

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

    // Handle Powens Callback redirect params if present
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const bankingCode = params.get("code");
        const connectionId = params.get("connection_id");
        const bankingErr = params.get("error");

        if (bankingErr) {
            if (triggerToast) triggerToast(`Erreur Powens: ${params.get("error_description") || bankingErr}`, true);
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
                    if (triggerToast) triggerToast(res?.message || "Connexion bancaire Powens établie avec succès !");
                    await loadBankingStatus();
                } catch (e) {
                    console.error("Banking callback error:", e);
                    if (triggerToast) triggerToast(e.message || "Erreur lors de la synchronisation Powens", true);
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Formulaire IBAN / BIC Principal */}
            <form onSubmit={handleSave} style={{ border: '1px solid var(--border)', borderRadius: '16px', padding: isMobileView ? '16px' : '24px', backgroundColor: 'var(--card)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(85,107,47,0.12)', color: '#556B2F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Building size={18} />
                            </span>
                            Coordonnées Bancaires Officielles (RIB Devis & Factures)
                        </h3>
                        <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: 'var(--muted-foreground)' }}>
                            Ces informations sont automatiquement imprimées sur vos devis et factures PDF pour permettre à vos clients de vous régler par virement bancaire.
                        </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#22C55E', fontWeight: 700, backgroundColor: 'rgba(34, 197, 94, 0.1)', padding: '4px 10px', borderRadius: '50px' }}>
                        <Shield size={14} /> Chiffrement SSL 256-bit
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
                    {/* Établissement Bancaire Selector with Logos */}
                    <div style={{ gridColumn: '1 / -1', position: 'relative' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Établissement Bancaire
                        </label>

                        <div
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '10px 14px',
                                border: '1px solid var(--border)',
                                borderRadius: '10px',
                                backgroundColor: 'var(--background)',
                                cursor: 'pointer',
                                transition: 'border 0.15s'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    width: '32px', height: '32px', borderRadius: '8px',
                                    backgroundColor: selectedBank.bgColor,
                                    color: selectedBank.textColor,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: 800, fontSize: '11px', flexShrink: 0,
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                                }}>
                                    {selectedBank.logoLetter}
                                </div>
                                <div>
                                    <span style={{ fontWeight: 700, fontSize: '14px', display: 'block', color: 'var(--foreground)' }}>
                                        {selectedBank.id === "other" ? (customBankName || "Autre établissement bancaire") : selectedBank.name}
                                    </span>
                                    {selectedBank.bic && (
                                        <span style={{ fontSize: '11.5px', color: 'var(--muted-foreground)' }}>
                                            BIC par défaut : {selectedBank.bic}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <ChevronDown size={18} style={{ color: 'var(--muted-foreground)', transform: isDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
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
                                maxHeight: '320px',
                                display: 'flex',
                                flexDirection: 'column'
                            }}>
                                {/* Search filter */}
                                <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--background)' }}>
                                    <Search size={16} style={{ color: 'var(--muted-foreground)' }} />
                                    <input
                                        type="text"
                                        placeholder="Rechercher une banque (ex: Bourso, Postale, BNP, Qonto)..."
                                        value={bankSearch}
                                        onChange={(e) => setBankSearch(e.target.value)}
                                        autoFocus
                                        style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '13px', color: 'var(--foreground)' }}
                                    />
                                </div>

                                {/* List of Banks */}
                                <div style={{ overflowY: 'auto', padding: '6px' }}>
                                    {filteredBanks.map((b) => (
                                        <div
                                            key={b.id}
                                            onClick={() => handleSelectBank(b)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '8px 12px',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                backgroundColor: selectedBankId === b.id ? 'rgba(85,107,47,0.12)' : 'transparent',
                                                transition: 'background-color 0.12s'
                                            }}
                                            onMouseEnter={(e) => { if (selectedBankId !== b.id) e.currentTarget.style.backgroundColor = 'var(--background)'; }}
                                            onMouseLeave={(e) => { if (selectedBankId !== b.id) e.currentTarget.style.backgroundColor = 'transparent'; }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{
                                                    width: '28px', height: '28px', borderRadius: '6px',
                                                    backgroundColor: b.bgColor,
                                                    color: b.textColor,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontWeight: 800, fontSize: '10px', flexShrink: 0
                                                }}>
                                                    {b.logoLetter}
                                                </div>
                                                <span style={{ fontSize: '13.5px', fontWeight: selectedBankId === b.id ? 700 : 500 }}>
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
                            <div style={{ marginTop: '10px' }}>
                                <input
                                    type="text"
                                    placeholder="Saisissez le nom complet de votre banque"
                                    value={customBankName}
                                    onChange={(e) => setCustomBankName(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px 14px',
                                        backgroundColor: 'var(--background)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '10px',
                                        color: 'var(--foreground)',
                                        fontSize: '13.5px',
                                        outline: 'none',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    {/* Titulaire du compte */}
                    <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Titulaire du compte (Nom de la Société ou Entrepreneur)
                        </label>
                        <input
                            type="text"
                            placeholder="ex: Dupont Climatisation SAS ou Jean Dupont"
                            value={accountOwner}
                            onChange={(e) => setAccountOwner(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '11px 14px',
                                backgroundColor: 'var(--background)',
                                border: '1px solid var(--border)',
                                borderRadius: '10px',
                                color: 'var(--foreground)',
                                fontSize: '14px',
                                outline: 'none',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    {/* IBAN Input with Live ISO Checksum Validation */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                IBAN (Format Français ou International)
                            </label>
                            {iban.length > 0 && (
                                <span style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    color: ibanStatus.valid ? '#22C55E' : '#EF4444',
                                    display: 'flex', alignItems: 'center', gap: '4px'
                                }}>
                                    {ibanStatus.valid ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                                    {ibanStatus.valid ? "IBAN Validé" : "IBAN Incomplet / Invalide"}
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
                                padding: '11px 14px',
                                backgroundColor: 'var(--background)',
                                border: iban.length === 0 ? '1px solid var(--border)' : ibanStatus.valid ? '1px solid #22C55E' : '1px solid #EF4444',
                                borderRadius: '10px',
                                color: 'var(--foreground)',
                                fontSize: '14px',
                                fontFamily: 'monospace',
                                fontWeight: 700,
                                letterSpacing: '0.5px',
                                outline: 'none',
                                boxSizing: 'border-box',
                                transition: 'border-color 0.15s'
                            }}
                            required
                        />
                        {iban.length > 0 && !ibanStatus.valid && (
                            <span style={{ fontSize: '11.5px', color: '#EF4444', marginTop: '4px', display: 'block' }}>
                                {ibanStatus.message}
                            </span>
                        )}
                    </div>

                    {/* Code BIC / SWIFT */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Code BIC / SWIFT
                            </label>
                            {bic.length > 0 && (
                                <span style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    color: bicStatus.valid ? '#22C55E' : '#EF4444',
                                    display: 'flex', alignItems: 'center', gap: '4px'
                                }}>
                                    {bicStatus.valid ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                                    {bicStatus.valid ? "BIC Validé" : "Format Invalide"}
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
                                padding: '11px 14px',
                                backgroundColor: 'var(--background)',
                                border: bic.length === 0 ? '1px solid var(--border)' : bicStatus.valid ? '1px solid #22C55E' : '1px solid #EF4444',
                                borderRadius: '10px',
                                color: 'var(--foreground)',
                                fontSize: '14px',
                                fontFamily: 'monospace',
                                fontWeight: 700,
                                outline: 'none',
                                boxSizing: 'border-box',
                                transition: 'border-color 0.15s'
                            }}
                            required
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                    <button
                        type="submit"
                        disabled={saving}
                        style={{
                            padding: '11px 24px',
                            background: '#556B2F',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '10px',
                            fontWeight: 700,
                            fontSize: '13.5px',
                            cursor: saving ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 4px 14px rgba(85,107,47,0.3)',
                            transition: 'all 0.15s'
                        }}
                    >
                        {saving ? <><Loader2 size={16} className="spin-loader" /> Enregistrement...</> : <><CheckCircle2 size={16} /> Enregistrer l'IBAN</>}
                    </button>
                </div>
            </form>

            {/* Rapprochement bancaire automatique (Open Banking Powens) */}
            <div style={{
                border: "1px solid var(--border)",
                borderRadius: "16px",
                padding: isMobileView ? "16px" : "24px",
                backgroundColor: "var(--card)"
            }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, display: "flex", alignItems: "center", gap: "10px" }}>
                            <span style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(85,107,47,0.12)', color: '#556B2F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Building2 size={18} />
                            </span>
                            Rapprochement bancaire automatique
                            <span style={{
                                fontSize: "11px",
                                fontWeight: 700,
                                padding: "2px 8px",
                                borderRadius: "6px",
                                backgroundColor: "rgba(85, 107, 47, 0.15)",
                                color: "var(--primary)",
                                border: "1px solid rgba(85, 107, 47, 0.3)"
                            }}>
                                Powens
                            </span>
                        </h3>
                        <p style={{ color: "var(--muted-foreground)", fontSize: "13px", margin: "4px 0 0 0" }}>
                            Connectez votre compte bancaire pour détecter automatiquement les virements reçus et les lettrer avec vos factures impayées.
                        </p>
                    </div>
                </div>

                <div style={{
                    border: "1px solid var(--border)",
                    borderRadius: "10px",
                    padding: "16px",
                    backgroundColor: "var(--background)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "12px"
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{
                            width: "38px",
                            height: "38px",
                            borderRadius: "8px",
                            backgroundColor: "rgba(85, 107, 47, 0.15)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "var(--primary)"
                        }}>
                            <ShieldCheck size={20} />
                        </div>
                        <div>
                            <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--foreground)" }}>
                                {bankingStatus.isConnected ? "Compte bancaire synchronisé" : "Aucun compte bancaire synchronisé"}
                            </div>
                            <div style={{ fontSize: "12.5px", color: "var(--muted-foreground)" }}>
                                Connexion chiffrée DSP2 sécurisée via l'API Powens (Budget Insight).
                            </div>
                        </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {bankingStatus.isConnected ? (
                            <>
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
                                        padding: "8px 14px",
                                        borderRadius: "8px",
                                        border: "1px solid var(--border)",
                                        backgroundColor: "var(--card)",
                                        color: "var(--foreground)",
                                        fontSize: "12.5px",
                                        fontWeight: 600,
                                        cursor: syncingBanking ? "not-allowed" : "pointer",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "6px"
                                    }}
                                >
                                    <RefreshCw size={14} style={{ animation: syncingBanking ? "spin 1s linear infinite" : "none" }} />
                                    {syncingBanking ? "Synchronisation..." : "Synchroniser"}
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
                                        padding: "8px 14px",
                                        borderRadius: "8px",
                                        border: "1px solid rgba(239, 68, 68, 0.2)",
                                        backgroundColor: "rgba(239, 68, 68, 0.08)",
                                        color: "#ef4444",
                                        fontSize: "12.5px",
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
                                onClick={async () => {
                                    try {
                                        const res = await apiFetch("/v1/banking/connect", { method: "POST" });
                                        if (res.data?.connectUrl) {
                                            window.location.href = res.data.connectUrl;
                                        } else {
                                            if (triggerToast) triggerToast(res.data?.message || "Module Open Banking prêt. En attente de configuration des clés Powens Sandbox.", false);
                                        }
                                    } catch (e) {
                                        if (triggerToast) triggerToast(e.message || "Erreur Open Banking.", true);
                                    }
                                }}
                                style={{
                                    padding: "9px 18px",
                                    borderRadius: "8px",
                                    border: "1px solid var(--border)",
                                    backgroundColor: "var(--card)",
                                    color: "var(--foreground)",
                                    fontSize: "13px",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "6px"
                                }}
                            >
                                <ExternalLink size={14} />
                                Connecter mon compte bancaire
                            </button>
                        )}
                    </div>
                </div>

                {/* Liste des comptes bancaires synchronisés */}
                {bankingStatus.isConnected && bankingStatus.accounts?.length > 0 && (
                    <div style={{ marginTop: "14px", display: "grid", gap: "10px" }}>
                        {bankingStatus.accounts.map((acc) => (
                            <div
                                key={acc.id}
                                style={{
                                    border: "1px solid var(--border)",
                                    borderRadius: "10px",
                                    padding: "14px 16px",
                                    backgroundColor: "var(--card)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    flexWrap: "wrap",
                                    gap: "10px"
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                    <div style={{
                                        width: "34px",
                                        height: "34px",
                                        borderRadius: "8px",
                                        backgroundColor: "rgba(85, 107, 47, 0.12)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        color: "var(--primary)"
                                    }}>
                                        <Landmark size={18} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--foreground)" }}>
                                            {acc.accountName || "Compte principal"}
                                        </div>
                                        <div style={{ fontSize: "12px", color: "var(--muted-foreground)", fontFamily: "monospace" }}>
                                            {acc.iban ? formatIBAN(acc.iban) : `ID: ${acc.externalId}`}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ textAlign: "right" }}>
                                    <div style={{ fontSize: "14.5px", fontWeight: 700, color: "var(--foreground)" }}>
                                        {typeof acc.balance === "number" ? `${acc.balance.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €` : "—"}
                                    </div>
                                    <span style={{
                                        fontSize: "11px",
                                        color: "#16a34a",
                                        fontWeight: 600,
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "4px"
                                    }}>
                                        <CheckCircle2 size={12} /> Synchronisé
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
