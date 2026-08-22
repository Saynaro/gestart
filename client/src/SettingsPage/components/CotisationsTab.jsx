import React, { useState, useEffect, useMemo } from "react";
import { Percent, Calendar, CheckCircle2, AlertCircle, FileText, Loader2, Calculator, ShieldCheck, Sparkles } from "lucide-react";
import { apiFetch } from "../../utils/api";

export default function CotisationsTab({ isMobileView, triggerToast }) {
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

                if (fp.legalStatus) setLegalStatus(fp.legalStatus);
                if (fp.activityType) setActivityType(fp.activityType);
                if (fp.periodicity) setDeclarationPeriodicity(fp.periodicity);
                if (fp.hasAcre !== undefined) setIsAcreBeneficiary(!!fp.hasAcre);
                if (fp.versementLiberatoire !== undefined) setHasVersementLiberatoire(!!fp.versementLiberatoire);
                if (fp.isTvaAssujetti !== undefined) setIsTvaAssujetti(!!fp.isTvaAssujetti);
                if (fp.customUrssafRate !== undefined) setCustomUrssafRate(fp.customUrssafRate);

                const comp = compRes?.data?.company || compRes?.company;
                if (comp) {
                    if (comp.isTvaFranchise !== undefined) {
                        setIsTvaAssujetti(!comp.isTvaFranchise);
                    }
                }
            } catch (err) {
                console.warn("Could not load fiscal data:", err.message);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    // Calculate real quarter CA from paid invoices in DB
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

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setSaving(true);
        try {
            const fiscalProfile = {
                legalStatus,
                activityType,
                urssafRate: baseRate,
                effectiveUrssafRate,
                hasAcre: isAcreBeneficiary,
                cfpRate,
                versementLiberatoire: hasVersementLiberatoire,
                versementLiberatoireRate: hasVersementLiberatoire ? rateMap[activityType]?.vlRate : 0,
                isTvaAssujetti,
                periodicity: declarationPeriodicity,
                customUrssafRate: customUrssafRate !== "" ? Number(customUrssafRate) : null,
                totalTaxRate
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
                        isTvaFranchise: !isTvaAssujetti
                    }
                })
            ]);

            triggerToast("Profil fiscal et cotisations enregistrés dans la base de données !");
        } catch (err) {
            triggerToast(err.message || "Erreur lors de l'enregistrement", true);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                <Loader2 className="animate-spin" size={24} style={{ color: 'var(--sidebar-primary)' }} />
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Header / Summary Card */}
            <div style={{ backgroundColor: 'rgba(85, 107, 47, 0.06)', border: '1.5px solid rgba(85, 107, 47, 0.2)', borderRadius: '14px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '46px', height: '46px', borderRadius: '10px', backgroundColor: '#556B2F', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Calculator size={24} />
                    </div>
                    <div>
                        <span style={{ fontSize: '12px', color: 'var(--muted-foreground)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Estimation en direct • Taux global : <strong>{totalTaxRate}%</strong>
                        </span>
                        <h4 style={{ margin: '3px 0 0 0', fontSize: '18px', fontWeight: 800 }}>
                            {currentDue.toLocaleString("fr-FR")} € à régler <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--muted-foreground)' }}>(sur {activeQuarterCA.toLocaleString("fr-FR")} € HT encaissés ce trimestre)</span>
                        </h4>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => window.open("https://www.autoentrepreneur.urssaf.fr", "_blank")}
                    style={{ padding: '10px 18px', backgroundColor: '#556B2F', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                >
                    Accéder à Urssaf.fr ↗
                </button>
            </div>

            {/* SECTION 1: STATUT JURIDIQUE & TVA */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '22px', backgroundColor: 'var(--card)' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck size={18} style={{ color: '#556B2F' }} />
                    1. Statut juridique & Régime fiscal
                </h3>

                <div className="profile-form-grid">
                    <div className="form-field">
                        <label className="form-label">Forme juridique</label>
                        <select className="form-input" value={legalStatus} onChange={(e) => setLegalStatus(e.target.value)}>
                            <option value="MICRO">Micro-entreprise (Auto-entrepreneur)</option>
                            <option value="SASU">SASU / SAS (Président assimilé salarié)</option>
                            <option value="SARL">SARL / EURL (Gérant majoritaire TNS)</option>
                            <option value="EI">Entreprise Individuelle (EI Réel)</option>
                        </select>
                    </div>

                    <div className="form-field">
                        <label className="form-label">Régime de TVA</label>
                        <select className="form-input" value={isTvaAssujetti ? "ASSUJETTI" : "FRANCHISE"} onChange={(e) => setIsTvaAssujetti(e.target.value === "ASSUJETTI")}>
                            <option value="FRANCHISE">Franchise en base de TVA (Art. 293 B CGI — Pas de TVA jusqu'à 37 500 €)</option>
                            <option value="ASSUJETTI">Assujetti à la TVA (Facturation avec TVA 20% / 10% / 5.5%)</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* SECTION 2: OPTIONS URSSAF & IMPÔTS */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '22px', backgroundColor: 'var(--card)' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Percent size={18} style={{ color: '#556B2F' }} />
                    2. Taux de cotisations sociales & Impôts (URSSAF)
                </h3>

                <div className="profile-form-grid">
                    <div className="form-field form-group-full">
                        <label className="form-label">Type d'activité principale</label>
                        <select className="form-input" value={activityType} onChange={(e) => setActivityType(e.target.value)}>
                            <option value="BIC">Prestation de services BIC (Artisans, Climatisation, BTP, Dépannage) — Taux base : 21,2%</option>
                            <option value="BNC">Prestation de services BNC (Professions libérales, Études) — Taux base : 21,1%</option>
                            <option value="VENTE">Vente de marchandises (Achat / Revente matériel sans pose) — Taux base : 12,3%</option>
                        </select>
                    </div>

                    <div className="form-field">
                        <label className="form-label">Périodicité des déclarations URSSAF</label>
                        <select className="form-input" value={declarationPeriodicity} onChange={(e) => setDeclarationPeriodicity(e.target.value)}>
                            <option value="TRIMESTRIELLE">Trimestrielle (Janvier, Avril, Juillet, Octobre)</option>
                            <option value="MENSUELLE">Mensuelle (Chaque fin de mois)</option>
                        </select>
                    </div>

                    <div className="form-field">
                        <label className="form-label">Taux URSSAF personnalisé (optionnel)</label>
                        <input
                            type="number"
                            step="0.1"
                            placeholder={`Taux légal par défaut : ${rateMap[activityType]?.rate}%`}
                            className="form-input"
                            value={customUrssafRate}
                            onChange={(e) => setCustomUrssafRate(e.target.value)}
                        />
                    </div>
                </div>

                {/* Toggles ACRE & Versement libératoire */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobileView ? '1fr' : '1fr 1fr', gap: '16px', marginTop: '18px' }}>

                    {/* ACRE */}
                    <div style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '16px', backgroundColor: isAcreBeneficiary ? 'rgba(85, 107, 47, 0.05)' : 'var(--background)', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        <input
                            type="checkbox"
                            id="acre-checkbox"
                            checked={isAcreBeneficiary}
                            onChange={(e) => setIsAcreBeneficiary(e.target.checked)}
                            style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: '#556B2F', cursor: 'pointer' }}
                        />
                        <label htmlFor="acre-checkbox" style={{ cursor: 'pointer' }}>
                            <span style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--foreground)', display: 'block' }}>
                                Bénéficiaire de l'ACRE (1ère année)
                            </span>
                            <span style={{ fontSize: '12px', color: 'var(--muted-foreground)', display: 'block', marginTop: '2px' }}>
                                Réduction de 50% sur vos cotisations sociales (Taux appliqué : <strong>{effectiveUrssafRate}%</strong>).
                            </span>
                        </label>
                    </div>

                    {/* Versement Libératoire */}
                    <div style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '16px', backgroundColor: hasVersementLiberatoire ? 'rgba(85, 107, 47, 0.05)' : 'var(--background)', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        <input
                            type="checkbox"
                            id="vl-checkbox"
                            checked={hasVersementLiberatoire}
                            onChange={(e) => setHasVersementLiberatoire(e.target.checked)}
                            style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: '#556B2F', cursor: 'pointer' }}
                        />
                        <label htmlFor="vl-checkbox" style={{ cursor: 'pointer' }}>
                            <span style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--foreground)', display: 'block' }}>
                                Versement Libératoire de l'IR (+{rateMap[activityType]?.vlRate}%)
                            </span>
                            <span style={{ fontSize: '12px', color: 'var(--muted-foreground)', display: 'block', marginTop: '2px' }}>
                                Vous payez l'impôt sur le revenu directement avec chaque déclaration URSSAF.
                            </span>
                        </label>
                    </div>

                </div>
            </div>

            {/* SECTION 3: SIMULATEUR EN DIRECT (REVENU NET DANS LA POCHE) */}
            <div style={{ border: '1px solid rgba(85, 107, 47, 0.3)', borderRadius: '12px', padding: '22px', backgroundColor: 'var(--card)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Sparkles size={18} style={{ color: '#556B2F' }} />
                        Simulateur : Combien vous reste-t-il dans la poche ?
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>Chiffre d'Affaires test :</span>
                        <input
                            type="number"
                            value={simulatedCA}
                            onChange={(e) => setSimulatedCA(e.target.value)}
                            style={{ width: '100px', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)', fontWeight: 700, fontSize: '14px' }}
                        />
                        <span style={{ fontWeight: 700 }}>€ HT</span>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobileView ? '1fr' : 'repeat(4, 1fr)', gap: '12px' }}>
                    <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: 'var(--muted)' }}>
                        <span style={{ fontSize: '11.5px', color: 'var(--muted-foreground)', fontWeight: 600 }}>Cotisations URSSAF ({effectiveUrssafRate}%)</span>
                        <h4 style={{ margin: '4px 0 0 0', fontSize: '16px', fontWeight: 700, color: '#e11d48' }}>- {simUrssaf.toLocaleString("fr-FR")} €</h4>
                    </div>

                    <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: 'var(--muted)' }}>
                        <span style={{ fontSize: '11.5px', color: 'var(--muted-foreground)', fontWeight: 600 }}>Formation CFP ({cfpRate}%)</span>
                        <h4 style={{ margin: '4px 0 0 0', fontSize: '16px', fontWeight: 700, color: '#e11d48' }}>- {simCfp.toLocaleString("fr-FR")} €</h4>
                    </div>

                    <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: 'var(--muted)' }}>
                        <span style={{ fontSize: '11.5px', color: 'var(--muted-foreground)', fontWeight: 600 }}>Impôt Libératoire ({vlRate}%)</span>
                        <h4 style={{ margin: '4px 0 0 0', fontSize: '16px', fontWeight: 700, color: hasVersementLiberatoire ? '#e11d48' : 'var(--muted-foreground)' }}>
                            {hasVersementLiberatoire ? `- ${simVl.toLocaleString("fr-FR")} €` : "Non applicable"}
                        </h4>
                    </div>

                    <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                        <span style={{ fontSize: '11.5px', color: '#166534', fontWeight: 700 }}>Revenu Net en poche</span>
                        <h4 style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: 800, color: '#16a34a' }}>
                            {simNet.toLocaleString("fr-FR")} € <span style={{ fontSize: '11.5px', fontWeight: 600 }}>({simNetPercent}%)</span>
                        </h4>
                    </div>
                </div>
            </div>

            {/* BOUTON ENREGISTRER */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                    type="submit"
                    disabled={saving}
                    style={{
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
                    {saving ? "Enregistrement dans la base..." : "Enregistrer les paramètres fiscaux"}
                </button>
            </div>

        </form>
    );
}
