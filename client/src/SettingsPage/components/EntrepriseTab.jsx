import React, { useState, useEffect } from "react";
import { Building, Camera, Search, FileText, CheckCircle, PenTool, Trash2, Upload, RefreshCw, Lock } from "lucide-react";
import { apiFetch } from "../../utils/api";
import { formatIBAN, formatBIC } from "../../utils/bankValidator";
import AddressAutocomplete from "../../components/AddressAutocomplete";
import CompanyAutocomplete, { formatNafCode } from "../../components/CompanyAutocomplete";
import SignaturePadModal from "../../components/SignaturePadModal";
import PhoneInput from "../../components/PhoneInput";
import { useSubscription } from "../../utils/useSubscription";

export default function EntrepriseTab({ isMobileView, triggerToast }) {
    const { isExpired } = useSubscription();
    const [companyName, setCompanyName] = useState("KHALID SAINARO");
    const [legalForm, setLegalForm] = useState("EI"); // SARL / SAS / EI / Auto-entrepreneur / EURL
    const [siret, setSiret] = useState("94408772500015");
    const [rcs, setRcs] = useState("RCS Nice B 944 087 725");
    const [capital, setCapital] = useState("1000");
    const [address, setAddress] = useState("23 RUE PAGANINI");
    const [postalCode, setPostalCode] = useState("06000");
    const [city, setCity] = useState("NICE");
    const [nafCode, setNafCode] = useState("4322B - Travaux d'installation d'équipements thermiques et de climatisation");
    const [logoUrl, setLogoUrl] = useState(null);
    const [signatureUrl, setSignatureUrl] = useState(null);
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const [website, setWebsite] = useState("");
    const [companyEmail, setCompanyEmail] = useState("");
    const [companyPhone, setCompanyPhone] = useState("");
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

    const handleAddressSelect = (selected) => {
        const streetOnly = selected.street || (selected.postcode ? selected.label.split(selected.postcode)[0].replace(/,\s*$/, '').trim() : selected.label);
        setAddress(streetOnly);
        if (selected.postcode) setPostalCode(selected.postcode);
        if (selected.city) setCity(selected.city);
    };

    const handleCompanyAutoFillSelect = (company) => {
        if (company.nom) setCompanyName(company.nom);
        if (company.siret) setSiret(company.siret);
        if (company.adresse) setAddress(company.adresse);
        if (company.code_postal) setPostalCode(company.code_postal);
        if (company.ville) setCity(company.ville);
        
        // Auto-fill Code NAF / APE
        const formattedNaf = company.naf_formate || formatNafCode(company.code_ape, company.libelle_ape);
        if (formattedNaf) setNafCode(formattedNaf);

        // Auto-fill RCS
        if (company.ville && company.siren) {
            const sirenFormatted = company.siren.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
            setRcs(`RCS ${company.ville} B ${sirenFormatted}`);
        }

        // Auto-fill Forme Juridique
        if (company.form_juridique) {
            const form = company.form_juridique.toUpperCase();
            if (form.includes("SASU")) setLegalForm("SASU");
            else if (form.includes("SAS")) setLegalForm("SAS");
            else if (form.includes("SARL")) setLegalForm("SARL");
            else if (form.includes("EURL")) setLegalForm("EURL");
            else if (form.includes("INDIVIDU") || form.includes("EI") || form.includes("PHYSIQUE")) setLegalForm("EI");
            else if (form.includes("MICRO") || form.includes("AUTO")) setLegalForm("Auto-entrepreneur");
            else if (form.includes("SA")) setLegalForm("SA");
        }
        triggerToast(`Entreprise "${company.nom}" sélectionnée ! Données juridiques & code NAF pré-remplis.`);
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
                if (formattedNaf) setNafCode(formattedNaf);

                if (comp.nom_complet || comp.nom_raison_sociale) {
                    setCompanyName(comp.nom_complet || comp.nom_raison_sociale);
                }

                if (siege.siret || comp.matching_etablissements?.[0]?.siret) {
                    setSiret(siege.siret || comp.matching_etablissements?.[0]?.siret);
                }

                const streetOnly = siege.numero_voie || siege.type_voie || siege.libelle_voie
                    ? [siege.numero_voie, siege.type_voie, siege.libelle_voie].filter(Boolean).join(' ')
                    : (siege.adresse || '');
                if (streetOnly) setAddress(streetOnly);
                if (siege.code_postal) setPostalCode(siege.code_postal);
                if (siege.libelle_commune) setCity(siege.libelle_commune);

                if (comp.nature_juridique_formate) {
                    const form = comp.nature_juridique_formate.toUpperCase();
                    if (form.includes("SASU")) setLegalForm("SASU");
                    else if (form.includes("SAS")) setLegalForm("SAS");
                    else if (form.includes("SARL")) setLegalForm("SARL");
                    else if (form.includes("EURL")) setLegalForm("EURL");
                    else if (form.includes("INDIVIDU") || form.includes("EI") || form.includes("PHYSIQUE")) setLegalForm("EI");
                    else if (form.includes("MICRO") || form.includes("AUTO")) setLegalForm("Auto-entrepreneur");
                }

                if (comp.siren && siege.libelle_commune) {
                    const sirenFormatted = comp.siren.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
                    setRcs(`RCS ${siege.libelle_commune} B ${sirenFormatted}`);
                }

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
                try {
                    await apiFetch('/v1/company/logo', {
                        method: 'PATCH',
                        body: JSON.stringify({ logoUrl: base64Data })
                    });
                    window.dispatchEvent(new CustomEvent('companyUpdated', { detail: { logoUrl: base64Data } }));
                    triggerToast("Logo de l'entreprise enregistré avec succès !");
                } catch (err) {
                    console.error("Logo upload error:", err);
                    triggerToast("Logo mis à jour");
                }
            };
            reader.readAsDataURL(file);
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
        try {
            await apiFetch('/v1/company/signature', {
                method: 'PATCH',
                body: JSON.stringify({ signatureUrl: dataUrl })
            });
            window.dispatchEvent(new CustomEvent('companyUpdated', { detail: { signatureUrl: dataUrl } }));
            triggerToast("Signature de l'entreprise enregistrée avec succès !");
        } catch (err) {
            console.error("Signature save error:", err);
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
        try {
            await apiFetch('/v1/company/signature', {
                method: 'DELETE'
            });
            window.dispatchEvent(new CustomEvent('companyUpdated', { detail: { signatureUrl: null } }));
            triggerToast("Signature supprimée.");
        } catch (err) {
            console.error("Signature delete error:", err);
            triggerToast("Signature supprimée.");
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
                            <label className="change-avatar-btn">
                                <Camera size={14} />
                                <span>Téléverser le logo</span>
                                <input type="file" accept="image/*" onChange={handleLogoUpload} />
                            </label>
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
                                        backgroundColor: 'rgba(85, 107, 47, 0.12)',
                                        color: '#556B2F',
                                        border: '1px solid rgba(85, 107, 47, 0.25)',
                                        fontWeight: 600,
                                        fontSize: '13px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <PenTool size={14} />
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
                                    <Upload size={14} />
                                    <span>Importer photo</span>
                                    <input type="file" accept="image/*" onChange={handleSignatureUpload} style={{ display: 'none' }} />
                                </label>

                                {signatureUrl && (
                                    <button
                                        type="button"
                                        onClick={handleDeleteSignature}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '8px 12px',
                                            borderRadius: '8px',
                                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                            color: '#ef4444',
                                            border: '1px solid rgba(239, 68, 68, 0.2)',
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
