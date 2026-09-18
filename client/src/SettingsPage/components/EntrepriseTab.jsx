import React, { useState, useEffect, useRef } from "react";
import { Building, Camera, Search, FileText, CheckCircle, PenTool, Trash2, Upload, RefreshCw, Lock } from "lucide-react";
import { apiFetch } from "../../utils/api";
import { formatIBAN, formatBIC } from "../../utils/bankValidator";
import AddressAutocomplete from "../../components/AddressAutocomplete";
import CompanyAutocomplete, { formatNafCode } from "../../components/CompanyAutocomplete";
import SignaturePadModal from "../../components/SignaturePadModal";
import PhoneInput from "../../components/PhoneInput";
import { useSubscription } from "../../utils/useSubscription";

export default function EntrepriseTab({ isMobileView, triggerToast, triggerConfirm }) {
    const { isExpired } = useSubscription();
    const [companyName, setCompanyName] = useState("KHALID SAINARO");
    const [legalForm, setLegalForm] = useState("EI"); // SARL / SAS / EI / Auto-entrepreneur / EURL
    const [siret, setSiret] = useState("94408772500015");
    const [rcs, setRcs] = useState("RCS Nice B 944 087 725");
    const [capital, setCapital] = useState("1000");
    const [address, setAddress] = useState("23 RUE PAGANINI");
    const [postalCode, setPostalCode] = useState("06000");
    const [city, setCity] = useState("NICE");
    const [nafCode, setNafCode] = useState("53.20Z - Autres activités de poste et de courrier");
    const [logoUrl, setLogoUrl] = useState(null);
    const [signatureUrl, setSignatureUrl] = useState(null);
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const [website, setWebsite] = useState("");
    const [companyEmail, setCompanyEmail] = useState("support.gestart@gmail.com");
    const [companyPhone, setCompanyPhone] = useState("06 51 60 43 16");
    const [iban, setIban] = useState("");
    const [bic, setBIC] = useState("");
    const [isSearchingSirene, setIsSearchingSirene] = useState(false);

    useEffect(() => {
        const fetchCompany = async () => {
            try {
                const data = await apiFetch('/v1/company');
                const company = data.data?.company || data.company || data;
                if (company) {
                    if (company.name) setCompanyName(company.name);
                    if (company.legalForm) setLegalForm(company.legalForm);
                    if (company.siret) setSiret(company.siret);
                    if (company.rcsNumber) setRcs(company.rcsNumber);
                    if (company.shareCapital) setCapital(company.shareCapital);
                    if (company.nafCode) setNafCode(company.nafCode);
                    if (company.address) setAddress(company.address);
                    if (company.postalCode) setPostalCode(company.postalCode);
                    if (company.city) setCity(company.city);
                    if (company.email) setCompanyEmail(company.email);
                    if (company.phone) setCompanyPhone(company.phone);
                    if (company.website) setWebsite(company.website);
                    if (company.logoUrl) setLogoUrl(company.logoUrl);
                    if (company.signatureUrl) setSignatureUrl(company.signatureUrl);
                    if (company.settings?.bankIban || company.bankIban || company.iban) {
                        setIban(formatIBAN(company.settings?.bankIban || company.bankIban || company.iban));
                    }
                    if (company.settings?.bankBic || company.bankBic || company.bic) {
                        setBIC(formatBIC(company.settings?.bankBic || company.bankBic || company.bic));
                    }
                }
            } catch (err) {
                console.warn("API company non disponible:", err.message);
            }
        };

        fetchCompany();
    }, []);

    // State for top banner auto-fill search
    const [autoFillSearch, setAutoFillSearch] = useState("");
    const saveTimerRef = useRef(null);

    // Auto-calculate SIREN (9 digits)
    const cleanSiret = siret.replace(/\s+/g, '');
    const siren = cleanSiret.substring(0, 9);

    // Auto-calculate French intra-community TVA number: FR + (12 + 3 * (SIREN % 97)) % 97 + SIREN
    const computeTvaNumber = (sirenStr) => {
        if (!/^\d{9}$/.test(sirenStr)) return "Non calculable";
        const sirenNum = parseInt(sirenStr, 10);
        const tvaKey = (12 + 3 * (sirenNum % 97)) % 97;
        const keyFormatted = tvaKey < 10 ? `0${tvaKey}` : `${tvaKey}`;
        return `FR${keyFormatted}${sirenStr}`;
    };

    const tvaNumber = computeTvaNumber(siren);

    const performSave = async (overrideData = {}) => {
        window.dispatchEvent(new CustomEvent('autoSaveStatus', { detail: { status: 'saving' } }));

        const cName = overrideData.companyName !== undefined ? overrideData.companyName : companyName;
        const lForm = overrideData.legalForm !== undefined ? overrideData.legalForm : legalForm;
        const sSiret = overrideData.siret !== undefined ? overrideData.siret : siret;
        const sSiren = (sSiret || "").replace(/\s+/g, '').substring(0, 9);
        const sTva = computeTvaNumber(sSiren);
        const sRcs = overrideData.rcs !== undefined ? overrideData.rcs : rcs;
        const sCapital = overrideData.capital !== undefined ? overrideData.capital : capital;
        const sNaf = overrideData.nafCode !== undefined ? overrideData.nafCode : nafCode;
        const sAddress = overrideData.address !== undefined ? overrideData.address : address;
        const sPostalCode = overrideData.postalCode !== undefined ? overrideData.postalCode : postalCode;
        const sCity = overrideData.city !== undefined ? overrideData.city : city;
        const sEmail = overrideData.companyEmail !== undefined ? overrideData.companyEmail : companyEmail;
        const sPhone = overrideData.companyPhone !== undefined ? overrideData.companyPhone : companyPhone;
        const sWebsite = overrideData.website !== undefined ? overrideData.website : website;
        const sIban = overrideData.iban !== undefined ? overrideData.iban : iban;
        const sBic = overrideData.bic !== undefined ? overrideData.bic : bic;

        try {
            await apiFetch('/v1/company', {
                method: 'PATCH',
                body: JSON.stringify({
                    name: cName,
                    legalForm: lForm,
                    siret: sSiret,
                    siren: sSiren,
                    tvaNumber: sTva,
                    rcsNumber: sRcs,
                    shareCapital: sCapital,
                    nafCode: sNaf,
                    address: sAddress,
                    postalCode: sPostalCode,
                    city: sCity,
                    email: sEmail,
                    phone: sPhone,
                    website: sWebsite,
                    bankIban: sIban,
                    bankBic: sBic,
                    iban: sIban,
                    bic: sBic
                })
            });

            window.dispatchEvent(new CustomEvent('companyUpdated', { 
                detail: { 
                    name: cName, 
                    logoUrl, 
                    signatureUrl,
                    bankIban: sIban,
                    bankBic: sBic,
                    iban: sIban,
                    bic: sBic,
                    settings: { bankIban: sIban, bankBic: sBic }
                } 
            }));

            window.dispatchEvent(new CustomEvent('autoSaveStatus', { detail: { status: 'saved' } }));
        } catch (err) {
            console.error("Auto-save company error:", err);
            window.dispatchEvent(new CustomEvent('autoSaveStatus', { detail: { status: 'error' } }));
        }
    };

    const queueAutoSave = (overrideData) => {
        window.dispatchEvent(new CustomEvent('autoSaveStatus', { detail: { status: 'saving' } }));
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
            performSave(overrideData);
        }, 700);
    };

    const handleAddressSelect = (selected) => {
        const streetOnly = selected.street || (selected.postcode ? selected.label.split(selected.postcode)[0].replace(/,\s*$/, '').trim() : selected.label);
        setAddress(streetOnly);
        if (selected.postcode) setPostalCode(selected.postcode);
        if (selected.city) setCity(selected.city);

        performSave({
            address: streetOnly,
            postalCode: selected.postcode || postalCode,
            city: selected.city || city
        });
    };

    const handleCompanyAutoFillSelect = (company) => {
        let newName = companyName;
        let newSiret = siret;
        let newAddress = address;
        let newPostalCode = postalCode;
        let newCity = city;
        let newNaf = nafCode;
        let newRcs = rcs;
        let newForm = legalForm;

        if (company.nom) { setCompanyName(company.nom); newName = company.nom; }
        if (company.siret) { setSiret(company.siret); newSiret = company.siret; }
        if (company.adresse) { setAddress(company.adresse); newAddress = company.adresse; }
        if (company.code_postal) { setPostalCode(company.code_postal); newPostalCode = company.code_postal; }
        if (company.ville) { setCity(company.ville); newCity = company.ville; }
        
        // Auto-fill Code NAF / APE
        const formattedNaf = company.naf_formate || formatNafCode(company.code_ape, company.libelle_ape);
        if (formattedNaf) { setNafCode(formattedNaf); newNaf = formattedNaf; }

        // Auto-fill RCS
        if (company.ville && company.siren) {
            const sirenFormatted = company.siren.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
            const rcsVal = `RCS ${company.ville} B ${sirenFormatted}`;
            setRcs(rcsVal);
            newRcs = rcsVal;
        }

        // Auto-fill Forme Juridique
        if (company.form_juridique) {
            const form = company.form_juridique.toUpperCase();
            if (form.includes("SASU")) newForm = "SASU";
            else if (form.includes("SAS")) newForm = "SAS";
            else if (form.includes("SARL")) newForm = "SARL";
            else if (form.includes("EURL")) newForm = "EURL";
            else if (form.includes("INDIVIDU") || form.includes("EI") || form.includes("PHYSIQUE")) newForm = "EI";
            else if (form.includes("MICRO") || form.includes("AUTO")) newForm = "Auto-entrepreneur";
            else if (form.includes("SA")) newForm = "SA";
            setLegalForm(newForm);
        }

        performSave({
            companyName: newName,
            siret: newSiret,
            address: newAddress,
            postalCode: newPostalCode,
            city: newCity,
            nafCode: newNaf,
            rcs: newRcs,
            legalForm: newForm
        });

        triggerToast(`Entreprise "${newName}" enregistrée avec succès !`);
    };

    // Auto-fetch SIRENE data from SIRET/SIREN
    const handleFetchSireneBySiret = async (termToLookup) => {
        const queryTerm = (termToLookup || siret || siren).replace(/\s+/g, '');
        if (!queryTerm || queryTerm.length < 9) {
            triggerToast("Veuillez saisir un numéro SIREN (9 chiffres) ou SIRET (14 chiffres) valide", true);
            return;
        }

        setIsSearchingSirene(true);
        try {
            const url = `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(queryTerm)}&per_page=1`;
            const response = await fetch(url);
            if (!response.ok) throw new Error("Erreur API SIRENE");
            const data = await response.json();
            if (data.results && data.results.length > 0) {
                const comp = data.results[0];
                const siege = comp.siege || {};
                const apeCode = comp.activite_principale || siege.activite_principale || comp.matching_etablissements?.[0]?.activite_principale || '';
                const apeLib = comp.libelle_activite_principale || siege.libelle_activite_principale || comp.activite_principale_libelle || '';

                const formattedNaf = formatNafCode(apeCode, apeLib);
                let newNaf = nafCode;
                let newName = companyName;
                let newSiret = siret;
                let newAddress = address;
                let newPostalCode = postalCode;
                let newCity = city;
                let newForm = legalForm;
                let newRcs = rcs;

                if (formattedNaf) { setNafCode(formattedNaf); newNaf = formattedNaf; }

                if (comp.nom_complet || comp.nom_raison_sociale) {
                    const nm = comp.nom_complet || comp.nom_raison_sociale;
                    setCompanyName(nm);
                    newName = nm;
                }

                if (siege.siret || comp.matching_etablissements?.[0]?.siret) {
                    const st = siege.siret || comp.matching_etablissements?.[0]?.siret;
                    setSiret(st);
                    newSiret = st;
                }

                const streetOnly = siege.numero_voie || siege.type_voie || siege.libelle_voie
                    ? [siege.numero_voie, siege.type_voie, siege.libelle_voie].filter(Boolean).join(' ')
                    : (siege.adresse || '');
                if (streetOnly) { setAddress(streetOnly); newAddress = streetOnly; }
                if (siege.code_postal) { setPostalCode(siege.code_postal); newPostalCode = siege.code_postal; }
                if (siege.libelle_commune) { setCity(siege.libelle_commune); newCity = siege.libelle_commune; }

                if (comp.nature_juridique_formate) {
                    const form = comp.nature_juridique_formate.toUpperCase();
                    if (form.includes("SASU")) newForm = "SASU";
                    else if (form.includes("SAS")) newForm = "SAS";
                    else if (form.includes("SARL")) newForm = "SARL";
                    else if (form.includes("EURL")) newForm = "EURL";
                    else if (form.includes("INDIVIDU") || form.includes("EI") || form.includes("PHYSIQUE")) newForm = "EI";
                    else if (form.includes("MICRO") || form.includes("AUTO")) newForm = "Auto-entrepreneur";
                    setLegalForm(newForm);
                }

                if (comp.siren && siege.libelle_commune) {
                    const sirenFormatted = comp.siren.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
                    const rc = `RCS ${siege.libelle_commune} B ${sirenFormatted}`;
                    setRcs(rc);
                    newRcs = rc;
                }

                performSave({
                    companyName: newName,
                    siret: newSiret,
                    address: newAddress,
                    postalCode: newPostalCode,
                    city: newCity,
                    nafCode: newNaf,
                    rcs: newRcs,
                    legalForm: newForm
                });

                triggerToast(`Données SIRENE synchronisées : Code NAF ${formattedNaf}`);
            } else {
                triggerToast("Aucune entreprise trouvée pour ce numéro SIREN / SIRET", true);
            }
        } catch (err) {
            console.error("Sirene fetch error:", err);
            triggerToast("Impossible de joindre le registre SIRENE", true);
        } finally {
            setIsSearchingSirene(false);
        }
    };

    const handleLogoUpload = (e) => {
        if (isExpired) {
            window.dispatchEvent(new CustomEvent('subscription_expired', {
                detail: { message: "Votre abonnement a expiré. Pour modifier le logo, veuillez renouveler votre abonnement." }
            }));
            return;
        }
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                triggerToast("L'image est trop volumineuse (max 5 Mo)", true);
                return;
            }
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64Data = reader.result;
                setLogoUrl(base64Data);
                window.dispatchEvent(new CustomEvent('autoSaveStatus', { detail: { status: 'saving' } }));
                try {
                    await apiFetch('/v1/company/logo', {
                        method: 'PATCH',
                        body: JSON.stringify({ logoUrl: base64Data })
                    });
                    window.dispatchEvent(new CustomEvent('companyUpdated', { detail: { logoUrl: base64Data } }));
                    window.dispatchEvent(new CustomEvent('autoSaveStatus', { detail: { status: 'saved' } }));
                    triggerToast("Logo de l'entreprise enregistré avec succès !");
                } catch (err) {
                    console.error("Logo upload error:", err);
                    window.dispatchEvent(new CustomEvent('autoSaveStatus', { detail: { status: 'error' } }));
                    triggerToast("Logo mis à jour");
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDeleteLogo = async () => {
        if (isExpired) {
            window.dispatchEvent(new CustomEvent('subscription_expired', {
                detail: { message: "Votre abonnement a expiré. Pour modifier le logo, veuillez renouveler votre abonnement." }
            }));
            return;
        }
        setLogoUrl(null);
        window.dispatchEvent(new CustomEvent('autoSaveStatus', { detail: { status: 'saving' } }));
        try {
            await apiFetch('/v1/company/logo', {
                method: 'PATCH',
                body: JSON.stringify({ logoUrl: null })
            });
            window.dispatchEvent(new CustomEvent('companyUpdated', { detail: { logoUrl: null } }));
            window.dispatchEvent(new CustomEvent('autoSaveStatus', { detail: { status: 'saved' } }));
            triggerToast("Logo de l'entreprise supprimé.");
        } catch (err) {
            console.error("Logo delete error:", err);
            window.dispatchEvent(new CustomEvent('autoSaveStatus', { detail: { status: 'error' } }));
            triggerToast("Logo supprimé.");
        }
    };

    const requestDeleteLogo = () => {
        if (triggerConfirm) {
            triggerConfirm({
                title: "Supprimer le logo ?",
                message: "Êtes-vous sûr de vouloir supprimer le logo de l'entreprise ? Il ne sera plus imprimé sur vos devis et factures PDF.",
                confirmText: "Supprimer",
                cancelText: "Annuler",
                type: "danger",
                onConfirm: handleDeleteLogo
            });
        } else {
            handleDeleteLogo();
        }
    };

    const handleSignatureSave = async (dataUrl) => {
        if (isExpired) {
            window.dispatchEvent(new CustomEvent('subscription_expired', {
                detail: { message: "Votre abonnement a expiré. Pour modifier la signature, veuillez renouveler votre abonnement." }
            }));
            return;
        }
        setSignatureUrl(dataUrl);
        window.dispatchEvent(new CustomEvent('autoSaveStatus', { detail: { status: 'saving' } }));
        try {
            await apiFetch('/v1/company/signature', {
                method: 'PATCH',
                body: JSON.stringify({ signatureUrl: dataUrl })
            });
            window.dispatchEvent(new CustomEvent('companyUpdated', { detail: { signatureUrl: dataUrl } }));
            window.dispatchEvent(new CustomEvent('autoSaveStatus', { detail: { status: 'saved' } }));
            triggerToast("Signature de l'entreprise enregistrée avec succès !");
        } catch (err) {
            console.error("Signature save error:", err);
            window.dispatchEvent(new CustomEvent('autoSaveStatus', { detail: { status: 'error' } }));
            triggerToast("Signature enregistrée");
        }
    };

    const handleSignatureUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                triggerToast("L'image est trop volumineuse (max 5 Mo)", true);
                return;
            }
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64Data = reader.result;
                handleSignatureSave(base64Data);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDeleteSignature = async () => {
        if (isExpired) {
            window.dispatchEvent(new CustomEvent('subscription_expired', {
                detail: { message: "Votre abonnement a expiré. Pour modifier la signature, veuillez renouveler votre abonnement." }
            }));
            return;
        }
        setSignatureUrl(null);
        window.dispatchEvent(new CustomEvent('autoSaveStatus', { detail: { status: 'saving' } }));
        try {
            await apiFetch('/v1/company/signature', {
                method: 'DELETE'
            });
            window.dispatchEvent(new CustomEvent('companyUpdated', { detail: { signatureUrl: null } }));
            window.dispatchEvent(new CustomEvent('autoSaveStatus', { detail: { status: 'saved' } }));
            triggerToast("Signature supprimée.");
        } catch (err) {
            console.error("Signature delete error:", err);
            window.dispatchEvent(new CustomEvent('autoSaveStatus', { detail: { status: 'error' } }));
            triggerToast("Signature supprimée.");
        }
    };

    const requestDeleteSignature = () => {
        if (triggerConfirm) {
            triggerConfirm({
                title: "Supprimer la signature ?",
                message: "Êtes-vous sûr de vouloir supprimer la signature de l'entreprise ? Elle ne sera plus affichée sur vos devis et factures.",
                confirmText: "Supprimer",
                cancelText: "Annuler",
                type: "danger",
                onConfirm: handleDeleteSignature
            });
        } else {
            handleDeleteSignature();
        }
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        if (isExpired) {
            window.dispatchEvent(new CustomEvent('subscription_expired', {
                detail: { message: "Votre abonnement a expiré. Pour modifier les coordonnées de l'entreprise, veuillez renouveler votre abonnement." }
            }));
            return;
        }
        try {
            await apiFetch('/v1/company', {
                method: 'PATCH',
                body: JSON.stringify({
                    name: companyName,
                    legalForm,
                    siret,
                    siren,
                    tvaNumber,
                    rcsNumber: rcs,
                    shareCapital: capital,
                    nafCode,
                    address,
                    postalCode,
                    city,
                    email: companyEmail,
                    phone: companyPhone,
                    website,
                    logoUrl,
                    signatureUrl,
                    bankIban: iban,
                    bankBic: bic,
                    iban,
                    bic
                })
            });
            window.dispatchEvent(new CustomEvent('companyUpdated', { 
                detail: { 
                    name: companyName, 
                    logoUrl, 
                    signatureUrl,
                    bankIban: iban,
                    bankBic: bic,
                    iban,
                    bic,
                    settings: { bankIban: iban, bankBic: bic }
                } 
            }));
            triggerToast("Informations d'entreprise & coordonnées bancaires enregistrées !");
        } catch (err) {
            triggerToast("Informations juridiques enregistrées !");
        }
    };

    if (isMobileView) {
        return (
            <div className="mobile-fields-stack">
                {/* 1. AUTO-REMPLISSAGE SIRET COMPACT */}
                <div className="mobile-group-section">
                    <h4 className="mobile-group-header">
                        <Search size={13} style={{ color: "#556B2F" }} />
                        <span>Remplissage automatique SIRET</span>
                    </h4>
                    <div style={{
                        backgroundColor: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: "14px",
                        padding: "10px 12px",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
                    }}>
                        <CompanyAutocomplete
                            value={autoFillSearch}
                            onChange={(val) => setAutoFillSearch(val)}
                            onCompanySelect={handleCompanyAutoFillSelect}
                            placeholder="Rechercher SIRET, SIREN ou nom..."
                        />
                    </div>
                </div>

                {/* 2. VISUELS (LOGO & SIGNATURE) */}
                <div className="mobile-group-section">
                    <h4 className="mobile-group-header">
                        <PenTool size={13} style={{ color: "#556B2F" }} />
                        <span>Logo & Signature (Devis / Factures)</span>
                    </h4>

                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {/* Logo Card */}
                        <div style={{
                            backgroundColor: "var(--card)",
                            border: "1px solid var(--border)",
                            borderRadius: "14px",
                            padding: "12px 14px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "12px"
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                <div style={{
                                    width: "48px",
                                    height: "48px",
                                    borderRadius: "10px",
                                    border: "1px solid var(--border)",
                                    backgroundColor: "#fff",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    overflow: "hidden",
                                    flexShrink: 0
                                }}>
                                    {logoUrl ? (
                                        <img src={logoUrl} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                                    ) : (
                                        <Building size={22} style={{ color: "#94a3b8" }} />
                                    )}
                                </div>
                                <div style={{ display: "flex", flexDirection: "column" }}>
                                    <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--foreground)" }}>Logo de l'entreprise</span>
                                    <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>Imprimé sur les PDF</span>
                                </div>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <label style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    padding: "7px 12px",
                                    borderRadius: "8px",
                                    backgroundColor: "var(--muted, #F4F3EF)",
                                    color: "var(--foreground)",
                                    border: "1px solid var(--border)",
                                    fontSize: "12.5px",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    margin: 0
                                }}>
                                    <Camera size={14} style={{ color: "var(--muted-foreground)" }} />
                                    <span>{logoUrl ? "Modifier" : "Ajouter"}</span>
                                    <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: "none" }} />
                                </label>

                                {logoUrl && (
                                    <button
                                        type="button"
                                        onClick={requestDeleteLogo}
                                        style={{
                                            padding: "7px 9px",
                                            borderRadius: "8px",
                                            backgroundColor: "transparent",
                                            color: "#ef4444",
                                            border: "1px solid var(--border)",
                                            cursor: "pointer",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            justifyContent: "center"
                                        }}
                                        title="Supprimer le logo"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Signature Card */}
                        <div style={{
                            backgroundColor: "var(--card)",
                            border: "1px solid var(--border)",
                            borderRadius: "14px",
                            padding: "12px 14px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "10px"
                        }}>
                            {/* Header: Title + Status + Delete */}
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                    <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--foreground)" }}>Signature</span>
                                    {signatureUrl ? (
                                        <span style={{ fontSize: "11px", fontWeight: 700, color: "#10B981", display: "inline-flex", alignItems: "center", gap: "2px" }}>
                                            <CheckCircle size={12} /> Active
                                        </span>
                                    ) : (
                                        <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>Non configurée</span>
                                    )}
                                </div>

                                {signatureUrl && (
                                    <button
                                        type="button"
                                        onClick={requestDeleteSignature}
                                        style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "4px",
                                            padding: "4px 8px",
                                            borderRadius: "7px",
                                            backgroundColor: "transparent",
                                            color: "#ef4444",
                                            border: "none",
                                            fontSize: "12px",
                                            fontWeight: 600,
                                            cursor: "pointer"
                                        }}
                                        title="Supprimer la signature"
                                    >
                                        <Trash2 size={12} />
                                        <span>Supprimer</span>
                                    </button>
                                )}
                            </div>

                            {/* Signature Preview Mini Box */}
                            <div
                                onClick={() => setShowSignatureModal(true)}
                                style={{
                                    width: "100%",
                                    height: "64px",
                                    borderRadius: "8px",
                                    border: "1px dashed var(--border)",
                                    backgroundColor: "#ffffff",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    overflow: "hidden",
                                    padding: "6px",
                                    cursor: "pointer"
                                }}
                            >
                                {signatureUrl ? (
                                    <img src={signatureUrl} alt="Signature" style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }} />
                                ) : (
                                    <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>Touchez pour dessiner une signature</span>
                                )}
                            </div>

                            {/* Action Buttons (2 equal columns) */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                                <button
                                    type="button"
                                    onClick={() => setShowSignatureModal(true)}
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: "6px",
                                        padding: "8px 10px",
                                        borderRadius: "8px",
                                        backgroundColor: "var(--muted, #F4F3EF)",
                                        color: "var(--foreground)",
                                        border: "1px solid var(--border)",
                                        fontSize: "12.5px",
                                        fontWeight: 600,
                                        cursor: "pointer"
                                    }}
                                >
                                    <PenTool size={13} style={{ color: "var(--muted-foreground)" }} />
                                    <span>{signatureUrl ? "Modifier" : "Dessiner"}</span>
                                </button>

                                <label style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "6px",
                                    padding: "8px 10px",
                                    borderRadius: "8px",
                                    backgroundColor: "var(--muted, #F4F3EF)",
                                    color: "var(--foreground)",
                                    border: "1px solid var(--border)",
                                    fontSize: "12.5px",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    margin: 0
                                }}>
                                    <Upload size={13} style={{ color: "var(--muted-foreground)" }} />
                                    <span>Importer</span>
                                    <input type="file" accept="image/*" onChange={handleSignatureUpload} style={{ display: "none" }} />
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. IDENTITÉ JURIDIQUE */}
                <div className="mobile-group-section">
                    <h4 className="mobile-group-header">
                        <Building size={13} style={{ color: "#556B2F" }} />
                        <span>Identité juridique</span>
                    </h4>

                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <div className="mobile-input-card">
                            <span className="mobile-input-card-label">Nom de l'entreprise / Société</span>
                            <input
                                type="text"
                                className="mobile-input-card-field"
                                value={companyName}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setCompanyName(val);
                                    queueAutoSave({ companyName: val });
                                }}
                                onBlur={() => performSave({ companyName })}
                                placeholder="ex: KHALID SAINARO"
                                required
                            />
                        </div>

                        <div className="mobile-input-card">
                            <span className="mobile-input-card-label">Forme juridique</span>
                            <select
                                className="mobile-input-card-field"
                                value={legalForm}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setLegalForm(val);
                                    performSave({ legalForm: val });
                                }}
                                style={{ cursor: "pointer" }}
                            >
                                <option value="Auto-entrepreneur">Auto-entrepreneur / Micro-entreprise</option>
                                <option value="EI">Entreprise Individuelle (EI)</option>
                                <option value="SARL">SARL</option>
                                <option value="EURL">EURL</option>
                                <option value="SAS">SAS</option>
                                <option value="SASU">SASU</option>
                                <option value="SA">SA</option>
                            </select>
                        </div>

                        <div className="mobile-input-card">
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span className="mobile-input-card-label">N° SIRET (14 chiffres)</span>
                                <button
                                    type="button"
                                    onClick={() => handleFetchSireneBySiret()}
                                    disabled={isSearchingSirene}
                                    style={{
                                        border: "none",
                                        background: "none",
                                        color: "#556B2F",
                                        fontSize: "11px",
                                        fontWeight: 700,
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "3px",
                                        cursor: "pointer",
                                        padding: 0
                                    }}
                                >
                                    <RefreshCw size={11} className={isSearchingSirene ? "animate-spin" : ""} />
                                    <span>{isSearchingSirene ? "..." : "Auto-remplir"}</span>
                                </button>
                            </div>
                            <input
                                type="text"
                                className="mobile-input-card-field"
                                maxLength="17"
                                value={siret}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setSiret(val);
                                    queueAutoSave({ siret: val });
                                    const clean = val.replace(/\s+/g, '');
                                    if (clean.length === 14 || clean.length === 9) {
                                        handleFetchSireneBySiret(clean);
                                    }
                                }}
                                onBlur={() => performSave({ siret })}
                                placeholder="ex: 94408772500015"
                                required
                            />
                        </div>

                        <div className="mobile-input-card" style={{ opacity: 0.9 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span className="mobile-input-card-label">SIREN</span>
                                <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--muted-foreground)" }}>Calculé</span>
                            </div>
                            <span className="mobile-input-card-field" style={{ fontSize: "15px", fontWeight: 600 }}>{siren || "—"}</span>
                        </div>

                        <div className="mobile-input-card" style={{ opacity: 0.9 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span className="mobile-input-card-label">N° TVA Intracommunautaire</span>
                                <span style={{ fontSize: "10px", fontWeight: 700, color: "#556B2F" }}>Calculé</span>
                            </div>
                            <span className="mobile-input-card-field" style={{ fontSize: "15px", fontWeight: 700, color: "#556B2F" }}>{tvaNumber || "—"}</span>
                        </div>

                        <div className="mobile-input-card">
                            <span className="mobile-input-card-label">Code NAF / APE</span>
                            <input
                                type="text"
                                className="mobile-input-card-field"
                                value={nafCode}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setNafCode(val);
                                    queueAutoSave({ nafCode: val });
                                }}
                                onBlur={() => performSave({ nafCode })}
                                placeholder="ex: 4322B"
                                style={{ fontSize: "14px" }}
                            />
                        </div>

                        <div className="mobile-input-card">
                            <span className="mobile-input-card-label">N° RCS + Greffe</span>
                            <input
                                type="text"
                                className="mobile-input-card-field"
                                value={rcs}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setRcs(val);
                                    queueAutoSave({ rcs: val });
                                }}
                                onBlur={() => performSave({ rcs })}
                                placeholder="ex: RCS Nice B 944 087 725"
                                style={{ fontSize: "14px" }}
                            />
                        </div>

                        <div className="mobile-input-card">
                            <span className="mobile-input-card-label">Capital social (€)</span>
                            <input
                                type="text"
                                className="mobile-input-card-field"
                                value={capital}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setCapital(val);
                                    queueAutoSave({ capital: val });
                                }}
                                onBlur={() => performSave({ capital })}
                                placeholder="ex: 1 000 €"
                            />
                        </div>
                    </div>
                </div>

                {/* 4. COORDONNÉES */}
                <div className="mobile-group-section">
                    <h4 className="mobile-group-header">
                        <FileText size={13} style={{ color: "#556B2F" }} />
                        <span>Coordonnées de l'entreprise</span>
                    </h4>

                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <div className="mobile-input-card no-autofocus">
                            <span className="mobile-input-card-label">Adresse</span>
                            <AddressAutocomplete
                                value={address}
                                onChange={(val) => {
                                    setAddress(val);
                                    queueAutoSave({ address: val });
                                }}
                                onAddressSelect={handleAddressSelect}
                                placeholder="ex: 23 Rue Paganini"
                                required
                            />
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                            <div className="mobile-input-card">
                                <span className="mobile-input-card-label">Code postal</span>
                                <input
                                    type="text"
                                    className="mobile-input-card-field"
                                    value={postalCode}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setPostalCode(val);
                                        queueAutoSave({ postalCode: val });
                                    }}
                                    onBlur={() => performSave({ postalCode })}
                                    placeholder="ex: 06000"
                                    maxLength={10}
                                />
                            </div>

                            <div className="mobile-input-card">
                                <span className="mobile-input-card-label">Ville</span>
                                <input
                                    type="text"
                                    className="mobile-input-card-field"
                                    value={city}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setCity(val);
                                        queueAutoSave({ city: val });
                                    }}
                                    onBlur={() => performSave({ city })}
                                    placeholder="ex: Nice"
                                />
                            </div>
                        </div>

                        <div className="mobile-input-card">
                            <span className="mobile-input-card-label">Email société</span>
                            <input
                                type="email"
                                className="mobile-input-card-field"
                                value={companyEmail}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setCompanyEmail(val);
                                    queueAutoSave({ companyEmail: val });
                                }}
                                onBlur={() => performSave({ companyEmail })}
                                placeholder="contact@entreprise.fr"
                            />
                        </div>

                        <div className="mobile-input-card select no-autofocus">
                            <span className="mobile-input-card-label">Téléphone société</span>
                            <PhoneInput
                                value={companyPhone}
                                onChange={(formatted) => {
                                    setCompanyPhone(formatted);
                                    queueAutoSave({ companyPhone: formatted });
                                }}
                            />
                        </div>

                        <div className="mobile-input-card">
                            <span className="mobile-input-card-label">Site web</span>
                            <input
                                type="url"
                                className="mobile-input-card-field"
                                value={website}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setWebsite(val);
                                    queueAutoSave({ website: val });
                                }}
                                onBlur={() => performSave({ website })}
                                placeholder="https://votre-entreprise.fr"
                            />
                        </div>
                    </div>
                </div>

                {/* 5. COORDONNÉES BANCAIRES */}
                <div className="mobile-group-section" style={{ marginBottom: "28px" }}>
                    <h4 className="mobile-group-header">
                        <CheckCircle size={13} style={{ color: "#556B2F" }} />
                        <span>Coordonnées bancaires</span>
                    </h4>

                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <div className="mobile-input-card">
                            <span className="mobile-input-card-label">IBAN (Factures PDF)</span>
                            <input
                                type="text"
                                className="mobile-input-card-field"
                                value={iban}
                                onChange={(e) => {
                                    const formatted = formatIBAN(e.target.value);
                                    setIban(formatted);
                                    queueAutoSave({ iban: formatted });
                                }}
                                onBlur={() => performSave({ iban })}
                                placeholder="FR76 3000 3020 5001..."
                                style={{ fontFamily: "monospace", fontSize: "14px" }}
                            />
                        </div>

                        <div className="mobile-input-card">
                            <span className="mobile-input-card-label">BIC / SWIFT</span>
                            <input
                                type="text"
                                className="mobile-input-card-field"
                                value={bic}
                                onChange={(e) => {
                                    const formatted = formatBIC(e.target.value);
                                    setBIC(formatted);
                                    queueAutoSave({ bic: formatted });
                                }}
                                onBlur={() => performSave({ bic })}
                                placeholder="BNPAFRPPXXX"
                                style={{ fontFamily: "monospace", fontSize: "14px" }}
                            />
                        </div>
                    </div>
                </div>

                {/* Signature Drawing Modal */}
                <SignaturePadModal
                    isOpen={showSignatureModal}
                    onClose={() => setShowSignatureModal(false)}
                    onSave={handleSignatureSave}
                    existingSignature={signatureUrl}
                />
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Banner de recherche Entreprise / SIRET */}
            <div style={{ backgroundColor: 'rgba(91, 77, 219, 0.04)', border: '1px solid rgba(91, 77, 219, 0.15)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '8px', backgroundColor: 'var(--sidebar-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Search size={18} />
                    </div>
                    <div>
                        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>Remplissage automatique via Nom d'entreprise / SIRET</h4>
                        <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--muted-foreground)' }}>Recherchez par nom d'entreprise ou n° SIRET / SIREN pour remplir automatiquement vos données juridiques officielles.</p>
                    </div>
                </div>

                <div style={{ width: '100%' }}>
                    <CompanyAutocomplete
                        value={autoFillSearch}
                        onChange={(val) => setAutoFillSearch(val)}
                        onCompanySelect={handleCompanyAutoFillSelect}
                        placeholder="Rechercher par nom d'entreprise, n° SIRET ou SIREN (ex: Khalid Sainaro, 944 087 725)..."
                    />
                </div>
            </div>

            <div className="profile-form-grid" style={{ border: '1px solid var(--border)', borderRadius: '14px', padding: '24px', backgroundColor: 'var(--card)' }}>
                {/* Logo Section */}
                <div className="form-field form-group-full">
                    <label className="form-label">Logo de l'entreprise (Imprimé sur les devis & factures PDF)</label>
                    <div className="avatar-edit-field">
                        <div style={{ width: '60px', height: '60px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                            {logoUrl ? <img src={logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <Building size={24} style={{ color: '#94a3b8' }} />}
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <label className="change-avatar-btn">
                                    <Camera size={14} />
                                    <span>{logoUrl ? "Modifier le logo" : "Téléverser le logo"}</span>
                                    <input type="file" accept="image/*" onChange={handleLogoUpload} />
                                </label>
                                {logoUrl && (
                                    <button
                                        type="button"
                                        onClick={requestDeleteLogo}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '5px',
                                            padding: '8px 12px',
                                            borderRadius: '8px',
                                            backgroundColor: 'transparent',
                                            color: '#ef4444',
                                            border: '1px solid var(--border)',
                                            fontSize: '12.5px',
                                            fontWeight: 600,
                                            cursor: 'pointer'
                                        }}
                                        title="Supprimer le logo"
                                    >
                                        <Trash2 size={13} />
                                        <span>Supprimer</span>
                                    </button>
                                )}
                            </div>
                            <span style={{ fontSize: '11px', color: 'var(--muted-foreground)', marginTop: '4px', display: 'block' }}>
                                Format PNG transparent conseillé. Max 2 Mo.
                            </span>
                        </div>
                    </div>
                </div>

                {/* Signature de l'entreprise Section */}
                <div className="form-field form-group-full" style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '8px' }}>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <PenTool size={16} style={{ color: '#556B2F' }} />
                            Signature de l'entreprise (Imprimée sur les devis et factures)
                        </span>
                        {signatureUrl && (
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#1A9E5C', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <CheckCircle size={14} /> Signature active
                            </span>
                        )}
                    </label>

                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', marginTop: '10px' }}>
                        {/* Preview Box */}
                        <div style={{
                            width: '200px',
                            height: '90px',
                            borderRadius: '10px',
                            border: '1.5px dashed var(--border)',
                            backgroundColor: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            position: 'relative',
                            padding: '8px'
                        }}>
                            {signatureUrl ? (
                                <img src={signatureUrl} alt="Signature Entreprise" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                            ) : (
                                <span style={{ fontSize: '12px', color: 'var(--muted-foreground)', textAlign: 'center', padding: '0 8px' }}>
                                    Aucune signature enregistrée
                                </span>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowSignatureModal(true)}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '8px 14px',
                                        borderRadius: '8px',
                                        backgroundColor: 'var(--muted, #F4F3EF)',
                                        color: 'var(--foreground)',
                                        border: '1px solid var(--border)',
                                        fontWeight: 600,
                                        fontSize: '13px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <PenTool size={14} style={{ color: 'var(--muted-foreground)' }} />
                                    <span>{signatureUrl ? "Modifier / Dessiner" : "Dessiner la signature"}</span>
                                </button>

                                <label style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '8px 14px',
                                    borderRadius: '8px',
                                    backgroundColor: 'var(--muted, #F4F3EF)',
                                    color: 'var(--foreground)',
                                    border: '1px solid var(--border)',
                                    fontWeight: 600,
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    margin: 0
                                }}>
                                    <Upload size={14} style={{ color: 'var(--muted-foreground)' }} />
                                    <span>Importer photo</span>
                                    <input type="file" accept="image/*" onChange={handleSignatureUpload} style={{ display: 'none' }} />
                                </label>

                                {signatureUrl && (
                                    <button
                                        type="button"
                                        onClick={requestDeleteSignature}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '8px 12px',
                                            borderRadius: '8px',
                                            backgroundColor: 'transparent',
                                            color: '#ef4444',
                                            border: '1px solid var(--border)',
                                            fontWeight: 600,
                                            fontSize: '13px',
                                            cursor: 'pointer'
                                        }}
                                        title="Supprimer la signature"
                                    >
                                        <Trash2 size={14} />
                                        <span>Supprimer</span>
                                    </button>
                                )}
                            </div>
                            <span style={{ fontSize: '11px', color: 'var(--muted-foreground)' }}>
                                La signature sera apposée sur vos devis et factures (activable / désactivable dans "Personnaliser").
                            </span>
                        </div>
                    </div>
                </div>

                <div className="form-field">
                    <label className="form-label">Nom de la société / Nom commercial</label>
                    <input
                        type="text"
                        className="form-input"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="ex: KHALID SAINARO"
                        required
                    />
                </div>

                <div className="form-field">
                    <label className="form-label">Forme juridique</label>
                    <select className="form-input" value={legalForm} onChange={(e) => setLegalForm(e.target.value)}>
                        <option value="Auto-entrepreneur">Auto-entrepreneur / Micro-entreprise</option>
                        <option value="EI">Entreprise Individuelle (EI)</option>
                        <option value="SARL">SARL</option>
                        <option value="EURL">EURL</option>
                        <option value="SAS">SAS</option>
                        <option value="SASU">SASU</option>
                        <option value="SA">SA</option>
                    </select>
                </div>

                <div className="form-field">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>SIRET (14 chiffres)</span>
                        <button
                            type="button"
                            onClick={() => handleFetchSireneBySiret()}
                            disabled={isSearchingSirene}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: 'none',
                                border: 'none',
                                color: 'var(--sidebar-primary)',
                                fontSize: '11.5px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                padding: 0
                            }}
                        >
                            <RefreshCw size={12} className={isSearchingSirene ? "animate-spin" : ""} />
                            <span>{isSearchingSirene ? "Recherche..." : "Auto-remplir SIRENE"}</span>
                        </button>
                    </label>
                    <input
                        type="text"
                        className="form-input"
                        maxLength="17"
                        value={siret}
                        onChange={(e) => {
                            const val = e.target.value;
                            setSiret(val);
                            const clean = val.replace(/\s+/g, '');
                            if (clean.length === 14 || clean.length === 9) {
                                handleFetchSireneBySiret(clean);
                            }
                        }}
                        placeholder="ex: 94408772500015"
                        required
                    />
                </div>

                <div className="form-field">
                    <label className="form-label">SIREN (9 chiffres - Calculé auto)</label>
                    <input type="text" className="form-input" value={siren} readOnly style={{ opacity: 0.85, fontWeight: 700 }} />
                </div>

                <div className="form-field">
                    <label className="form-label">N° TVA Intracommunautaire (Calculé auto)</label>
                    <input type="text" className="form-input" value={tvaNumber} readOnly style={{ opacity: 0.85, fontWeight: 700, color: 'var(--sidebar-primary)' }} />
                </div>

                <div className="form-field">
                    <label className="form-label">N° RCS + Ville du greffe</label>
                    <input type="text" className="form-input" value={rcs} onChange={(e) => setRcs(e.target.value)} placeholder="RCS Nice B 944 087 725" />
                </div>

                <div className="form-field">
                    <label className="form-label">Capital Social (€)</label>
                    <input type="text" className="form-input" value={capital} onChange={(e) => setCapital(e.target.value)} placeholder="1 000 €" />
                </div>

                <div className="form-field">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>Code NAF / APE</span>
                        <span style={{ fontSize: '11px', color: 'var(--muted-foreground)' }}>Auto-rempli via SIRENE</span>
                    </label>
                    <input
                        type="text"
                        className="form-input"
                        value={nafCode}
                        onChange={(e) => setNafCode(e.target.value)}
                        placeholder="ex: 4322B - Travaux d'installation d'équipements thermiques et de climatisation"
                    />
                </div>

                <div className="form-field form-group-full">
                    <label className="form-label">Adresse (Numéro et nom de rue / voie)</label>
                    <AddressAutocomplete
                        value={address}
                        onChange={(val) => setAddress(val)}
                        onAddressSelect={handleAddressSelect}
                        placeholder="ex: 23 Rue Paganini"
                        required
                    />
                </div>

                <div className="form-field">
                    <label className="form-label">Code postal</label>
                    <input
                        type="text"
                        className="form-input"
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value)}
                        placeholder="ex: 06000"
                        maxLength={10}
                    />
                </div>

                <div className="form-field">
                    <label className="form-label">Ville</label>
                    <input
                        type="text"
                        className="form-input"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="ex: Nice"
                    />
                </div>

                <div className="form-field">
                    <label className="form-label">Email société (Imprimé PDF)</label>
                    <input type="email" className="form-input" value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} placeholder="contact@votre-entreprise.fr" />
                </div>

                <div className="form-field">
                    <label className="form-label">Téléphone société</label>
                    <PhoneInput
                        value={companyPhone}
                        onChange={(formatted) => setCompanyPhone(formatted)}
                    />
                </div>

                <div className="form-field form-group-full">
                    <label className="form-label">Site web</label>
                    <input type="url" className="form-input" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://votre-entreprise.fr" />
                </div>

                <div className="form-field">
                    <label className="form-label">IBAN (Affiché sur factures PDF)</label>
                    <input type="text" className="form-input" value={iban} onChange={(e) => setIban(formatIBAN(e.target.value))} placeholder="FR76 3000 3020 5001 2345 6789 012" style={{ fontFamily: 'monospace', fontWeight: 600 }} />
                </div>

                <div className="form-field">
                    <label className="form-label">BIC / SWIFT</label>
                    <input type="text" className="form-input" value={bic} onChange={(e) => setBIC(formatBIC(e.target.value))} placeholder="BNPAFRPPXXX" style={{ fontFamily: 'monospace', fontWeight: 600 }} />
                </div>
                <div className="form-group-full" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed var(--border)' }}>
                    <button
                        type="submit"
                        className="save-profile-btn"
                        style={{
                            padding: '10px 24px',
                            backgroundColor: 'var(--sidebar-primary)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            opacity: isExpired ? 0.85 : 1
                        }}
                    >
                        {isExpired && <Lock size={15} />}
                        Enregistrer l'entreprise
                    </button>
                </div>
            </div>

            {/* Signature Drawing Modal */}
            <SignaturePadModal
                isOpen={showSignatureModal}
                onClose={() => setShowSignatureModal(false)}
                onSave={handleSignatureSave}
                existingSignature={signatureUrl}
            />
        </form>
    );
}
