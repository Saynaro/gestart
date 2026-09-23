import React, { useState, useEffect, useMemo, useRef } from "react";
import { Percent, Calendar, CheckCircle2, AlertCircle, FileText, Loader2, Calculator, ShieldCheck, Sparkles } from "lucide-react";
import { apiFetch } from "../../utils/api";
import { useSubscription } from "../../utils/useSubscription";

export default function CotisationsTab({ isMobileView, triggerToast }) {
    const { isExpired } = useSubscription();
    const [legalStatus, setLegalStatus] = useState("MICRO"); // "MICRO" | "SASU" | "SARL" | "EURL" | "EI"
    const [activityType, setActivityType] = useState("BIC"); // "BIC" | "BNC" | "VENTE"
    const [declarationPeriodicity, setDeclarationPeriodicity] = useState("TRIMESTRIELLE");
    const [isAcreBeneficiary, setIsAcreBeneficiary] = useState(false);
    const [hasVersementLiberatoire, setHasVersementLiberatoire] = useState(false);
    const [isTvaAssujetti, setIsTvaAssujetti] = useState(false);
    const [customUrssafRate, setCustomUrssafRate] = useState("");
    const [simulatedCA, setSimulatedCA] = useState(3000);

    const [invoices, setInvoices] = useState([]);
    const [settingsDoc, setSettingsDoc] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const autoSaveTimerRef = useRef(null);

    // Taux cotisations sociales auto-entrepreneur 2026 selon CGI
    const rateMap = {
        BIC: { rate: 21.2, name: "Prestation de services BIC (Artisans, BTP, Climatisation)", vlRate: 1.7, cfp: 0.3 },
        BNC: { rate: 21.1, name: "Prestation de services BNC (Professions libérales)", vlRate: 2.2, cfp: 0.2 },
        VENTE: { rate: 12.3, name: "Vente de marchandises (Achat / Revente matériel)", vlRate: 1.0, cfp: 0.1 }
    };

    const baseRate = customUrssafRate !== "" && !isNaN(Number(customUrssafRate))
        ? Number(customUrssafRate)
        : rateMap[activityType]?.rate || 21.2;

    const effectiveUrssafRate = isAcreBeneficiary ? Math.round((baseRate / 2) * 10) / 10 : baseRate;
    const cfpRate = rateMap[activityType]?.cfp || 0.3;
    const vlRate = hasVersementLiberatoire ? (rateMap[activityType]?.vlRate || 1.7) : 0;
    const totalTaxRate = Math.round((effectiveUrssafRate + cfpRate + vlRate) * 10) / 10;

    const savedStateRef = useRef(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [invRes, setRes, compRes] = await Promise.all([
                    apiFetch('/v1/invoices').catch(() => null),
                    apiFetch('/v1/company/settings').catch(() => null),
                    apiFetch('/v1/company').catch(() => null)
                ]);

                const invList = invRes?.data?.invoices || invRes?.invoices || (Array.isArray(invRes) ? invRes : []);
                setInvoices(invList);

                const settings = setRes?.data?.settings || setRes?.settings;
                setSettingsDoc(settings);

                const custom = settings?.documentCustomization || {};
                const fp = custom.fiscalProfile || {};

                let lStat = "MICRO", aType = "BIC", dPer = "TRIMESTRIELLE", acre = false, vl = false, tva = false, cRate = "";

                if (fp.legalStatus) { lStat = fp.legalStatus; setLegalStatus(lStat); }
                if (fp.activityType) { aType = fp.activityType; setActivityType(aType); }
                if (fp.periodicity) { dPer = fp.periodicity; setDeclarationPeriodicity(dPer); }
                if (fp.hasAcre !== undefined) { acre = !!fp.hasAcre; setIsAcreBeneficiary(acre); }
                if (fp.versementLiberatoire !== undefined) { vl = !!fp.versementLiberatoire; setHasVersementLiberatoire(vl); }
                if (fp.isTvaAssujetti !== undefined) { tva = !!fp.isTvaAssujetti; setIsTvaAssujetti(tva); }
                if (fp.customUrssafRate !== undefined) { cRate = fp.customUrssafRate; setCustomUrssafRate(cRate); }

                const comp = compRes?.data?.company || compRes?.company;
                if (comp) {
                    if (comp.isTvaFranchise !== undefined) {
                        tva = !comp.isTvaFranchise;
                        setIsTvaAssujetti(tva);
                    }
                }

                savedStateRef.current = { legalStatus: lStat, activityType: aType, declarationPeriodicity: dPer, isAcreBeneficiary: acre, hasVersementLiberatoire: vl, isTvaAssujetti: tva, customUrssafRate: cRate };
            } catch (err) {
                console.warn("Could not load fiscal data:", err.message);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    // Real quarter CA calculation
    const { t1CA, t2CA, t3CA, t4CA, totalYearCA } = useMemo(() => {
        let t1 = 0, t2 = 0, t3 = 0, t4 = 0;
        invoices.forEach(inv => {
            if (inv.status === "PAID" || inv.status === "paid") {
                const amt = Number(inv.amountHT || inv.totalHt || inv.subtotalHt || inv.amountTTC || 0);
                const d = new Date(inv.paidAt || inv.date || inv.createdAt);
                const m = d.getMonth();
                if (m >= 0 && m <= 2) t1 += amt;
                else if (m >= 3 && m <= 5) t2 += amt;
                else if (m >= 6 && m <= 8) t3 += amt;
                else t4 += amt;
            }
        });
        return { t1CA: t1, t2CA: t2, t3CA: t3, t4CA: t4, totalYearCA: t1 + t2 + t3 + t4 };
    }, [invoices]);

    const currentMonth = new Date().getMonth();
    const activeQuarterCA = currentMonth <= 2 ? t1CA : currentMonth <= 5 ? t2CA : currentMonth <= 8 ? t3CA : t4CA;
    const currentDue = Math.round(activeQuarterCA * (totalTaxRate / 100));

    // Simulator computations
    const simCA = Number(simulatedCA) || 0;
    const simUrssaf = Math.round(simCA * (effectiveUrssafRate / 100) * 100) / 100;
    const simCfp = Math.round(simCA * (cfpRate / 100) * 100) / 100;
    const simVl = Math.round(simCA * (vlRate / 100) * 100) / 100;
    const simTotalCharges = Math.round((simUrssaf + simCfp + simVl) * 100) / 100;
    const simNet = Math.round((simCA - simTotalCharges) * 100) / 100;
    const simNetPercent = simCA > 0 ? ((simNet / simCA) * 100).toFixed(1) : 0;

    const checkExpired = () => {
        if (isExpired) {
            window.dispatchEvent(new CustomEvent('subscription_expired', {
                detail: { message: "Votre abonnement a expiré. Pour modifier vos paramètres fiscaux, veuillez renouveler votre abonnement." }
            }));
            window.dispatchEvent(new CustomEvent('autoSaveStatus', { detail: { status: 'error' } }));
            return true;
        }
        return false;
    };

    const rollbackState = () => {
        if (!savedStateRef.current) return;
        const s = savedStateRef.current;
        setLegalStatus(s.legalStatus);
        setActivityType(s.activityType);
        setDeclarationPeriodicity(s.declarationPeriodicity);
        setIsAcreBeneficiary(s.isAcreBeneficiary);
        setHasVersementLiberatoire(s.hasVersementLiberatoire);
        setIsTvaAssujetti(s.isTvaAssujetti);
        setCustomUrssafRate(s.customUrssafRate);
    };

    const performSave = async (overrideData = {}) => {
        if (checkExpired()) {
            rollbackState();
            return;
        }

        window.dispatchEvent(new CustomEvent('autoSaveStatus', { detail: { status: 'saving' } }));
        setSaving(true);
        try {
            const lStatus = overrideData.legalStatus !== undefined ? overrideData.legalStatus : legalStatus;
            const aType = overrideData.activityType !== undefined ? overrideData.activityType : activityType;
            const dPeriod = overrideData.declarationPeriodicity !== undefined ? overrideData.declarationPeriodicity : declarationPeriodicity;
            const acre = overrideData.isAcreBeneficiary !== undefined ? overrideData.isAcreBeneficiary : isAcreBeneficiary;
            const vl = overrideData.hasVersementLiberatoire !== undefined ? overrideData.hasVersementLiberatoire : hasVersementLiberatoire;
            const tva = overrideData.isTvaAssujetti !== undefined ? overrideData.isTvaAssujetti : isTvaAssujetti;
            const cRate = overrideData.customUrssafRate !== undefined ? overrideData.customUrssafRate : customUrssafRate;

            const bRate = cRate !== "" && !isNaN(Number(cRate)) ? Number(cRate) : (rateMap[aType]?.rate || 21.2);
            const effUrssafRate = acre ? Math.round((bRate / 2) * 10) / 10 : bRate;
            const cfRate = rateMap[aType]?.cfp || 0.3;
            const vRate = vl ? (rateMap[aType]?.vlRate || 1.7) : 0;
            const totTaxRate = Math.round((effUrssafRate + cfRate + vRate) * 10) / 10;

            const fiscalProfile = {
                legalStatus: lStatus,
                activityType: aType,
                urssafRate: bRate,
                effectiveUrssafRate: effUrssafRate,
                hasAcre: acre,
                cfpRate: cfRate,
                versementLiberatoire: vl,
                versementLiberatoireRate: vRate,
                isTvaAssujetti: tva,
                periodicity: dPeriod,
                customUrssafRate: cRate !== "" ? Number(cRate) : null,
                totalTaxRate: totTaxRate
            };

            const existingCustom = settingsDoc?.documentCustomization || {};

            await Promise.all([
                apiFetch('/v1/company/settings', {
                    method: 'PATCH',
                    body: {
                        documentCustomization: {
                            ...existingCustom,
                            fiscalProfile
                        }
                    }
                }),
                apiFetch('/v1/company', {
                    method: 'PATCH',
                    body: {
                        isTvaFranchise: !tva
                    }
                })
            ]);

            savedStateRef.current = {
                legalStatus: lStatus,
                activityType: aType,
                declarationPeriodicity: dPeriod,
                isAcreBeneficiary: acre,
                hasVersementLiberatoire: vl,
                isTvaAssujetti: tva,
                customUrssafRate: cRate
            };

            window.dispatchEvent(new CustomEvent('autoSaveStatus', { detail: { status: 'saved' } }));
        } catch (err) {
            console.error("Fiscal profile save error:", err);
            rollbackState();
            window.dispatchEvent(new CustomEvent('autoSaveStatus', { detail: { status: 'error' } }));
            if (triggerToast) triggerToast(err.message || "Erreur lors de l'enregistrement", true);
        } finally {
            setSaving(false);
        }
    };

    const queueAutoSave = (overrideData) => {
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = setTimeout(() => {
            performSave(overrideData);
        }, 500);
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        await performSave();
        if (triggerToast) triggerToast("Profil fiscal et cotisations enregistrés avec succès !");
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                <Loader2 className="animate-spin" size={24} style={{ color: 'var(--sidebar-primary)' }} />
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: isMobileView ? '14px' : '20px' }}>

            {/* Header / Summary Card */}
            <div style={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: isMobileView ? '14px' : '14px',
                padding: isMobileView ? '14px 16px' : '18px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: isMobileView ? 'stretch' : 'center',
                flexDirection: isMobileView ? 'column' : 'row',
                gap: isMobileView ? '12px' : '16px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: isMobileView ? '12px' : '14px' }}>
                    <div style={{
                        width: isMobileView ? '40px' : '44px',
                        height: isMobileView ? '40px' : '44px',
                        minWidth: isMobileView ? '40px' : '44px',
                        borderRadius: isMobileView ? '10px' : '10px',
                        backgroundColor: 'var(--muted)',
                        color: 'var(--sidebar-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Calculator size={isMobileView ? 20 : 22} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                        <span style={{
                            fontSize: isMobileView ? '11px' : '11.5px',
                            color: 'var(--muted-foreground)',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.4px',
                            display: 'block'
                        }}>
                            Estimation en direct • Taux global : <strong style={{ color: 'var(--foreground)' }}>{totalTaxRate}%</strong>
                        </span>
                        <h4 style={{
                            margin: '2px 0 0 0',
                            fontSize: isMobileView ? '16px' : '17px',
                            fontWeight: 800,
                            lineHeight: 1.25,
                            color: 'var(--foreground)'
                        }}>
                            {currentDue.toLocaleString("fr-FR")} € à régler <span style={{ fontSize: isMobileView ? '12px' : '12.5px', fontWeight: 500, color: 'var(--muted-foreground)' }}>(sur {activeQuarterCA.toLocaleString("fr-FR")} € HT ce trimestre)</span>
                        </h4>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => window.open("https://www.autoentrepreneur.urssaf.fr", "_blank")}
                    style={{
                        padding: isMobileView ? '10px 14px' : '9px 16px',
                        backgroundColor: 'var(--muted)',
                        color: 'var(--foreground)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        fontWeight: 600,
                        fontSize: isMobileView ? '13px' : '13px',
                        cursor: 'pointer',
                        textAlign: 'center',
                        alignSelf: isMobileView ? 'stretch' : 'center'
                    }}
                >
                    Accéder à Urssaf.fr ↗
                </button>
            </div>

            {/* SECTION 1: STATUT JURIDIQUE & TVA */}
            <div style={{
                border: '1px solid var(--border)',
                borderRadius: isMobileView ? '14px' : '14px',
                padding: isMobileView ? '14px 16px' : '20px',
                backgroundColor: 'var(--card)'
            }}>
                <h3 style={{
                    margin: isMobileView ? '0 0 12px 0' : '0 0 16px 0',
                    fontSize: isMobileView ? '15px' : '15px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <ShieldCheck size={isMobileView ? 18 : 18} style={{ color: '#556B2F' }} />
                    1. Statut juridique & Régime fiscal
                </h3>

                <div className="profile-form-grid" style={{ gap: isMobileView ? '10px' : '14px' }}>
                    <div className="form-field">
                        <label className="form-label" style={{ fontSize: isMobileView ? '12px' : '12.5px', fontWeight: 700, marginBottom: '4px' }}>Forme juridique</label>
                        <select
                            className="form-input"
                            style={{
                                fontSize: isMobileView ? '13.5px' : '13.5px',
                                padding: isMobileView ? '8px 12px' : '10px 12px',
                                height: isMobileView ? '42px' : '42px',
                                minHeight: isMobileView ? '42px' : '42px'
                            }}
                            value={legalStatus}
                            onChange={(e) => {
                                if (checkExpired()) return;
                                const val = e.target.value;
                                setLegalStatus(val);
                                performSave({ legalStatus: val });
                            }}
                        >
                            <option value="MICRO">Micro-entreprise (Auto-entrepreneur)</option>
                            <option value="SASU">SASU / SAS (Président assimilé salarié)</option>
                            <option value="SARL">SARL / EURL (Gérant majoritaire TNS)</option>
                            <option value="EI">Entreprise Individuelle (EI Réel)</option>
                        </select>
                    </div>

                    <div className="form-field">
                        <label className="form-label" style={{ fontSize: isMobileView ? '12px' : '12.5px', fontWeight: 700, marginBottom: '4px' }}>Régime de TVA</label>
                        <select
                            className="form-input"
                            style={{
                                fontSize: isMobileView ? '13.5px' : '13.5px',
                                padding: isMobileView ? '8px 12px' : '10px 12px',
                                height: isMobileView ? '42px' : '42px',
                                minHeight: isMobileView ? '42px' : '42px'
                            }}
                            value={isTvaAssujetti ? "ASSUJETTI" : "FRANCHISE"}
                            onChange={(e) => {
                                if (checkExpired()) return;
                                const val = e.target.value === "ASSUJETTI";
                                setIsTvaAssujetti(val);
                                performSave({ isTvaAssujetti: val });
                            }}
                        >
                            <option value="FRANCHISE">Franchise en base de TVA (Art. 293 B CGI)</option>
                            <option value="ASSUJETTI">Assujetti à la TVA (TVA 20% / 10% / 5.5%)</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* SECTION 2: OPTIONS URSSAF & IMPÔTS */}
            <div style={{
                border: '1px solid var(--border)',
                borderRadius: isMobileView ? '14px' : '14px',
                padding: isMobileView ? '14px 16px' : '20px',
                backgroundColor: 'var(--card)'
            }}>
                <h3 style={{
                    margin: isMobileView ? '0 0 12px 0' : '0 0 16px 0',
                    fontSize: isMobileView ? '15px' : '15px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <Percent size={isMobileView ? 18 : 18} style={{ color: '#556B2F' }} />
                    2. Taux de cotisations sociales & Impôts (URSSAF)
                </h3>

                <div className="profile-form-grid" style={{ gap: isMobileView ? '10px' : '14px' }}>
                    <div className="form-field form-group-full">
                        <label className="form-label" style={{ fontSize: isMobileView ? '12px' : '12.5px', fontWeight: 700, marginBottom: '4px' }}>Type d'activité principale</label>
                        <select
                            className="form-input"
                            style={{
                                fontSize: isMobileView ? '13.5px' : '13.5px',
                                padding: isMobileView ? '8px 12px' : '10px 12px',
                                height: isMobileView ? '42px' : '42px',
                                minHeight: isMobileView ? '42px' : '42px'
                            }}
                            value={activityType}
                            onChange={(e) => {
                                if (checkExpired()) return;
                                const val = e.target.value;
                                setActivityType(val);
                                performSave({ activityType: val });
                            }}
                        >
                            <option value="BIC">Prestation de services BIC (Artisans, Climatisation, BTP) — 21,2%</option>
                            <option value="BNC">Prestation de services BNC (Professions libérales, Études) — 21,1%</option>
                            <option value="VENTE">Vente de marchandises (Achat / Revente matériel) — 12,3%</option>
                        </select>
                    </div>

                    <div className="form-field">
                        <label className="form-label" style={{ fontSize: isMobileView ? '12px' : '12.5px', fontWeight: 700, marginBottom: '4px' }}>Périodicité des déclarations</label>
                        <select
                            className="form-input"
                            style={{
                                fontSize: isMobileView ? '13.5px' : '13.5px',
                                padding: isMobileView ? '8px 12px' : '10px 12px',
                                height: isMobileView ? '42px' : '42px',
                                minHeight: isMobileView ? '42px' : '42px'
                            }}
                            value={declarationPeriodicity}
                            onChange={(e) => {
                                if (checkExpired()) return;
                                const val = e.target.value;
                                setDeclarationPeriodicity(val);
                                performSave({ declarationPeriodicity: val });
                            }}
                        >
                            <option value="TRIMESTRIELLE">Trimestrielle (Jan, Avr, Juil, Oct)</option>
                            <option value="MENSUELLE">Mensuelle (Fin de mois)</option>
                        </select>
                    </div>

                    <div className="form-field">
                        <label className="form-label" style={{ fontSize: isMobileView ? '12px' : '12.5px', fontWeight: 700, marginBottom: '4px' }}>Taux URSSAF personnalisé (optionnel)</label>
                        <input
                            type="number"
                            step="0.1"
                            placeholder={`Défaut : ${rateMap[activityType]?.rate}%`}
                            className="form-input"
                            style={{
                                fontSize: isMobileView ? '13.5px' : '13.5px',
                                padding: isMobileView ? '8px 12px' : '10px 12px',
                                height: isMobileView ? '42px' : '42px',
                                minHeight: isMobileView ? '42px' : '42px'
                            }}
                            value={customUrssafRate}
                            onChange={(e) => {
                                if (checkExpired()) return;
                                const val = e.target.value;
                                setCustomUrssafRate(val);
                                queueAutoSave({ customUrssafRate: val });
                            }}
                        />
                    </div>
                </div>

                {/* Toggles ACRE & Versement libératoire */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobileView ? '1fr' : '1fr 1fr', gap: isMobileView ? '10px' : '14px', marginTop: isMobileView ? '12px' : '16px' }}>

                    {/* ACRE */}
                    <div style={{
                        border: '1px solid var(--border)',
                        borderRadius: isMobileView ? '10px' : '10px',
                        padding: isMobileView ? '12px 14px' : '14px',
                        backgroundColor: isAcreBeneficiary ? 'rgba(85, 107, 47, 0.05)' : 'var(--background)',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: isMobileView ? '12px' : '12px'
                    }}>
                        <input
                            type="checkbox"
                            id="acre-checkbox"
                            checked={isAcreBeneficiary}
                            onChange={(e) => {
                                if (checkExpired()) return;
                                const val = e.target.checked;
                                setIsAcreBeneficiary(val);
                                performSave({ isAcreBeneficiary: val });
                            }}
                            style={{ width: isMobileView ? '18px' : '18px', height: isMobileView ? '18px' : '18px', marginTop: '2px', accentColor: '#556B2F', cursor: 'pointer', flexShrink: 0 }}
                        />
                        <label htmlFor="acre-checkbox" style={{ cursor: 'pointer', minWidth: 0, flex: 1 }}>
                            <span style={{ fontWeight: 700, fontSize: isMobileView ? '13.5px' : '13.5px', color: 'var(--foreground)', display: 'block' }}>
                                Bénéficiaire de l'ACRE (1ère année)
                            </span>
                            <span style={{ fontSize: isMobileView ? '12px' : '12px', color: 'var(--muted-foreground)', display: 'block', marginTop: '2px' }}>
                                Réduction de 50% (Taux appliqué : <strong>{effectiveUrssafRate}%</strong>).
                            </span>
                        </label>
                    </div>

                    {/* Versement Libératoire */}
                    <div style={{
                        border: '1px solid var(--border)',
                        borderRadius: isMobileView ? '10px' : '10px',
                        padding: isMobileView ? '12px 14px' : '14px',
                        backgroundColor: hasVersementLiberatoire ? 'rgba(85, 107, 47, 0.05)' : 'var(--background)',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: isMobileView ? '12px' : '12px'
                    }}>
                        <input
                            type="checkbox"
                            id="vl-checkbox"
                            checked={hasVersementLiberatoire}
                            onChange={(e) => {
                                if (checkExpired()) return;
                                const val = e.target.checked;
                                setHasVersementLiberatoire(val);
                                performSave({ hasVersementLiberatoire: val });
                            }}
                            style={{ width: isMobileView ? '18px' : '18px', height: isMobileView ? '18px' : '18px', marginTop: '2px', accentColor: '#556B2F', cursor: 'pointer', flexShrink: 0 }}
                        />
                        <label htmlFor="vl-checkbox" style={{ cursor: 'pointer', minWidth: 0, flex: 1 }}>
                            <span style={{ fontWeight: 700, fontSize: isMobileView ? '13.5px' : '13.5px', color: 'var(--foreground)', display: 'block' }}>
                                Versement Libératoire IR (+{rateMap[activityType]?.vlRate}%)
                            </span>
                            <span style={{ fontSize: isMobileView ? '12px' : '12px', color: 'var(--muted-foreground)', display: 'block', marginTop: '2px' }}>
                                Impôt sur le revenu payé avec chaque déclaration.
                            </span>
                        </label>
                    </div>

                </div>
            </div>

            {/* SECTION 3: SIMULATEUR EN DIRECT */}
            <div style={{
                border: '1px solid var(--border)',
                borderRadius: isMobileView ? '14px' : '14px',
                padding: isMobileView ? '14px 16px' : '20px',
                backgroundColor: 'var(--card)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: isMobileView ? '8px' : '12px', marginBottom: isMobileView ? '12px' : '16px' }}>
                    <h3 style={{ margin: 0, fontSize: isMobileView ? '15px' : '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Sparkles size={isMobileView ? 18 : 18} style={{ color: '#556B2F' }} />
                        Simulateur : Revenu net en poche
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: isMobileView ? '12.5px' : '13px', color: 'var(--muted-foreground)' }}>CA test :</span>
                        <input
                            type="number"
                            value={simulatedCA}
                            onChange={(e) => setSimulatedCA(e.target.value)}
                            style={{
                                width: isMobileView ? '80px' : '90px',
                                height: isMobileView ? '34px' : 'auto',
                                padding: isMobileView ? '4px 8px' : '6px 10px',
                                borderRadius: '6px',
                                border: '1px solid var(--border)',
                                backgroundColor: 'var(--background)',
                                color: 'var(--foreground)',
                                fontWeight: 700,
                                fontSize: isMobileView ? '14px' : '14px'
                            }}
                        />
                        <span style={{ fontWeight: 700, fontSize: isMobileView ? '13px' : '13px' }}>€ HT</span>
                    </div>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobileView ? '1fr 1fr' : 'repeat(4, 1fr)',
                    gap: isMobileView ? '10px' : '12px'
                }}>
                    <div style={{ padding: isMobileView ? '10px 12px' : '12px 14px', borderRadius: '10px', backgroundColor: 'var(--muted)' }}>
                        <span style={{ fontSize: isMobileView ? '11px' : '11.5px', color: 'var(--muted-foreground)', fontWeight: 600, display: 'block' }}>URSSAF ({effectiveUrssafRate}%)</span>
                        <h4 style={{ margin: '4px 0 0 0', fontSize: isMobileView ? '14.5px' : '16px', fontWeight: 700, color: '#e11d48' }}>- {simUrssaf.toLocaleString("fr-FR")} €</h4>
                    </div>

                    <div style={{ padding: isMobileView ? '10px 12px' : '12px 14px', borderRadius: '10px', backgroundColor: 'var(--muted)' }}>
                        <span style={{ fontSize: isMobileView ? '11px' : '11.5px', color: 'var(--muted-foreground)', fontWeight: 600, display: 'block' }}>CFP ({cfpRate}%)</span>
                        <h4 style={{ margin: '4px 0 0 0', fontSize: isMobileView ? '14.5px' : '16px', fontWeight: 700, color: '#e11d48' }}>- {simCfp.toLocaleString("fr-FR")} €</h4>
                    </div>

                    <div style={{ padding: isMobileView ? '10px 12px' : '12px 14px', borderRadius: '10px', backgroundColor: 'var(--muted)' }}>
                        <span style={{ fontSize: isMobileView ? '11px' : '11.5px', color: 'var(--muted-foreground)', fontWeight: 600, display: 'block' }}>Impôt ({vlRate}%)</span>
                        <h4 style={{ margin: '4px 0 0 0', fontSize: isMobileView ? '14.5px' : '16px', fontWeight: 700, color: hasVersementLiberatoire ? '#e11d48' : 'var(--muted-foreground)' }}>
                            {hasVersementLiberatoire ? `- ${simVl.toLocaleString("fr-FR")} €` : "0 €"}
                        </h4>
                    </div>

                    <div style={{ padding: isMobileView ? '10px 12px' : '12px 14px', borderRadius: '10px', backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                        <span style={{ fontSize: isMobileView ? '11px' : '11.5px', color: '#166534', fontWeight: 700, display: 'block' }}>Net en poche</span>
                        <h4 style={{ margin: '4px 0 0 0', fontSize: isMobileView ? '15px' : '17px', fontWeight: 800, color: '#16a34a' }}>
                            {simNet.toLocaleString("fr-FR")} € <span style={{ fontSize: isMobileView ? '11px' : '11px', fontWeight: 600 }}>({simNetPercent}%)</span>
                        </h4>
                    </div>
                </div>
            </div>

            {/* BOUTON ENREGISTRER (Desktop only) */}
            {!isMobileView && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button
                        type="submit"
                        disabled={saving}
                        style={{
                            width: 'auto',
                            justifyContent: 'center',
                            padding: '12px 28px',
                            backgroundColor: '#556B2F',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 700,
                            fontSize: '14px',
                            cursor: saving ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            opacity: saving ? 0.7 : 1
                        }}
                    >
                        {saving && <Loader2 className="animate-spin" size={16} />}
                        {saving ? "Enregistrement..." : "Enregistrer les paramètres fiscaux"}
                    </button>
                </div>
            )}

        </form>
    );
}
