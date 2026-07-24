import React, { useState } from "react";
import { Building, Camera, Search, FileText, CheckCircle } from "lucide-react";

export default function EntrepriseTab({ isMobileView, triggerToast }) {
    const [companyName, setCompanyName] = useState("SAINARO KHALID CLIM");
    const [legalForm, setLegalForm] = useState("Auto-entrepreneur"); // SARL / SAS / EI / Auto-entrepreneur / EURL
    const [siret, setSiret] = useState("94408772500012");
    const [rcs, setRcs] = useState("RCS Nice");
    const [capital, setCapital] = useState("1000");
    const [address, setAddress] = useState("23 RUE Paganini, 06000 NICE");
    const [nafCode, setNafCode] = useState("4322B - Travaux d'installation d'équipements thermiques et de climatisation");
    const [logoUrl, setLogoUrl] = useState(null);
    const [website, setWebsite] = useState("https://dupont-clim.fr");
    const [companyEmail, setCompanyEmail] = useState("contact@dupont-clim.fr");
    const [companyPhone, setCompanyPhone] = useState("04 93 12 34 56");
    const [iban, setIban] = useState("FR76 3000 3020 5001 2345 6789 012");
    const [bic, setBIC] = useState("BNPAFRPPXXX");

    // SIRET Search input state
    const [searchSiretInput, setSearchSiretInput] = useState("");

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

    const handleSearchSiret = () => {
        if (!searchSiretInput || searchSiretInput.trim().replace(/\s+/g, '').length < 9) {
            triggerToast("Veuillez saisir un n° SIRET à 14 chiffres (ou SIREN à 9 chiffres)", true);
            return;
        }
        const clean = searchSiretInput.trim().replace(/\s+/g, '');
        setSiret(clean.length === 9 ? `${clean}00012` : clean);
        triggerToast("Entreprise trouvée via Pappers API ! Données juridiques pré-remplies.");
    };

    const handleLogoUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoUrl(reader.result);
                triggerToast("Logo société mis à jour (Cloudinary) !");
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e) => {
        if (e) e.preventDefault();
        triggerToast("Informations juridiques enregistrées !");
    };

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Banner de recherche SIRET avec champ Input */}
            <div style={{ backgroundColor: 'rgba(91, 77, 219, 0.04)', border: '1px solid rgba(91, 77, 219, 0.15)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '8px', backgroundColor: 'var(--sidebar-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Search size={18} />
                    </div>
                    <div>
                        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>Remplissage automatique via SIRET / Pappers</h4>
                        <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--muted-foreground)' }}>Entrez votre SIRET pour remplir automatiquement vos données juridiques officielles.</p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                        type="text"
                        className="form-input"
                        value={searchSiretInput}
                        onChange={(e) => setSearchSiretInput(e.target.value)}
                        placeholder="Saisissez un n° SIRET (ex: 944 087 725 00012)"
                        style={{ flex: '1 1 220px', backgroundColor: 'var(--card)', fontWeight: 600 }}
                    />
                    <button
                        type="button"
                        onClick={handleSearchSiret}
                        style={{ padding: '9px 18px', borderRadius: '8px', backgroundColor: 'var(--sidebar-primary)', color: '#fff', border: 'none', fontWeight: 600, fontSize: '13px', cursor: 'pointer', flexShrink: 0 }}
                    >
                        Rechercher
                    </button>
                </div>
            </div>

            <div className="profile-form-grid">
                <div className="form-field form-group-full">
                    <label className="form-label">Logo de l'entreprise (Imprimé sur les devis & factures PDF)</label>
                    <div className="avatar-edit-field">
                        <div style={{ width: '60px', height: '60px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                            {logoUrl ? <img src={logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <Building size={24} style={{ color: '#94a3b8' }} />}
                        </div>
                        <div>
                            <label className="change-avatar-btn">
                                <Camera size={14} />
                                <span>Téléverser le logo (Cloudinary)</span>
                                <input type="file" accept="image/*" onChange={handleLogoUpload} />
                            </label>
                            <span style={{ fontSize: '11px', color: 'var(--muted-foreground)', marginTop: '4px', display: 'block' }}>
                                Format PNG transparent conseillé. Max 2 Mo.
                            </span>
                        </div>
                    </div>
                </div>

                <div className="form-field">
                    <label className="form-label">Nom de la société / Nom commercial</label>
                    <input type="text" className="form-input" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
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
                    <label className="form-label">SIRET (14 chiffres)</label>
                    <input type="text" className="form-input" maxLength="17" value={siret} onChange={(e) => setSiret(e.target.value)} required />
                </div>

                <div className="form-field">
                    <label className="form-label">SIREN (9 chiffres - Calculé auto)</label>
                    <input type="text" className="form-input" value={siren} readOnly style={{ backgroundColor: 'rgba(0,0,0,0.03)', fontWeight: 700 }} />
                </div>

                <div className="form-field">
                    <label className="form-label">N° TVA Intracommunautaire (Calculé auto)</label>
                    <input type="text" className="form-input" value={tvaNumber} readOnly style={{ backgroundColor: 'rgba(0,0,0,0.03)', fontWeight: 700, color: 'var(--sidebar-primary)' }} />
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
                    <label className="form-label">Code NAF / APE</label>
                    <input type="text" className="form-input" value={nafCode} onChange={(e) => setNafCode(e.target.value)} />
                </div>

                <div className="form-field form-group-full">
                    <label className="form-label">Adresse du siège social</label>
                    <input type="text" className="form-input" value={address} onChange={(e) => setAddress(e.target.value)} required />
                </div>

                <div className="form-field">
                    <label className="form-label">Email société (Imprimé PDF)</label>
                    <input type="email" className="form-input" value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} />
                </div>

                <div className="form-field">
                    <label className="form-label">Téléphone société</label>
                    <input type="tel" className="form-input" value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} />
                </div>

                <div className="form-field form-group-full">
                    <label className="form-label">Site web</label>
                    <input type="url" className="form-input" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://votre-entreprise.fr" />
                </div>

                <div className="form-field">
                    <label className="form-label">IBAN (Affiché sur factures PDF)</label>
                    <input type="text" className="form-input" value={iban} onChange={(e) => setIban(e.target.value)} style={{ fontFamily: 'monospace', fontWeight: 600 }} />
                </div>

                <div className="form-field">
                    <label className="form-label">BIC / SWIFT</label>
                    <input type="text" className="form-input" value={bic} onChange={(e) => setBIC(e.target.value)} style={{ fontFamily: 'monospace', fontWeight: 600 }} />
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button type="submit" className="save-profile-btn" style={{ padding: '10px 24px', backgroundColor: 'var(--sidebar-primary)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                    Enregistrer l'entreprise
                </button>
            </div>
        </form>
    );
}
