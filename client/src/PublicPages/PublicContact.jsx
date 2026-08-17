import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Send, CheckCircle2, Phone, Mail, User, Building2, MapPin, AlertCircle, Wrench } from "lucide-react";
import AddressAutocomplete from "../components/AddressAutocomplete";
import { apiFetch } from "../utils/api";
import "./PublicContact.css";

function PublicContact() {
    const { companySlug, slug } = useParams();
    const activeSlug = companySlug || slug;
    const [company, setCompany] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    // Form inputs (Starts clean & empty)
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [address, setAddress] = useState("");
    const [tradeType, setTradeType] = useState("Dépannage & Installation");
    const [message, setMessage] = useState("");

    useEffect(() => {
        if (!activeSlug) return;
        const fetchCompany = async () => {
            setLoading(true);
            try {
                const res = await apiFetch(`/v1/public/company/${activeSlug}`);
                if (res.data?.company || res.company) {
                    setCompany(res.data?.company || res.company);
                }
            } catch (err) {
                console.warn("Société introuvable par slug:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchCompany();
    }, [activeSlug]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await apiFetch(`/v1/public/quote-request/${activeSlug}`, {
                method: "POST",
                body: JSON.stringify({
                    firstName,
                    lastName,
                    phone,
                    email,
                    address,
                    tradeType,
                    message
                })
            });
            setSubmitted(true);
        } catch (err) {
            console.error("Erreur soumission demande:", err);
            alert("Erreur lors de l'envoi de votre demande : " + (err.message || "Veuillez réessayer"));
        } finally {
            setSubmitting(false);
        }
    };

    const companyName = company?.name || (activeSlug ? activeSlug.replace(/-/g, ' ').toUpperCase() : "ENTREPRISE");

    return (
        <div className="public-portal-page">
            {/* Header */}
            <header className="public-portal-header">
                <div className="header-inner">
                    <div className="header-brand-wrap">
                        <div className="company-badge-icon">
                            <Building2 size={20} />
                        </div>
                        <div>
                            <h1 className="header-company-name">{companyName}</h1>
                            <span className="header-doc-sub">Demande de devis & intervention</span>
                        </div>
                    </div>
                    {company?.phone && (
                        <a href={`tel:${company.phone}`} className="header-secure-pill" style={{ textDecoration: 'none', color: '#556B2F', backgroundColor: 'rgba(85, 107, 47, 0.1)', borderColor: '#556B2F' }}>
                            <Phone size={14} />
                            <span>{company.phone}</span>
                        </a>
                    )}
                </div>
            </header>

            {/* Main Content */}
            <main className="public-portal-main" style={{ maxWidth: '640px' }}>
                <div className="public-portal-card">
                    {submitted ? (
                        <div className="paid-success-banner" style={{ flexDirection: 'column', textAlign: 'center', padding: '36px 20px', gap: '16px' }}>
                            <CheckCircle2 size={54} color="#16a34a" />
                            <div>
                                <h3 style={{ fontSize: '20px', margin: '0 0 6px 0' }}>Demande transmise avec succès !</h3>
                                <p style={{ fontSize: '14.5px', margin: '0 0 10px 0', lineHeight: 1.5 }}>
                                    Merci {firstName} ! Votre demande d'intervention a été reçue par <strong>{companyName}</strong>.
                                </p>
                                <p style={{ fontSize: '13px', color: '#15803D', margin: 0 }}>
                                    Un technicien ou chargé d'affaires va vous recontacter très rapidement sur votre numéro ({phone}).
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <div style={{ marginBottom: '20px' }}>
                                <span className="intro-badge">Formulaire en ligne</span>
                                <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', margin: '4px 0 6px 0' }}>
                                    Demander un devis ou une intervention
                                </h2>
                                <p style={{ margin: 0, fontSize: '13.5px', color: '#64748B', lineHeight: 1.45 }}>
                                    Remplissez ce formulaire pour recevoir un devis personnalisé ou planifier une intervention avec <strong>{companyName}</strong>.
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155' }}>Prénom *</label>
                                        <input
                                            type="text"
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                            required
                                            placeholder="Ex: Jean"
                                            style={{
                                                padding: '11px 14px',
                                                borderRadius: '10px',
                                                border: '1px solid #CBD5E1',
                                                backgroundColor: '#FFFFFF',
                                                color: '#0F172A',
                                                fontSize: '13.5px',
                                                outline: 'none'
                                            }}
                                        />
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155' }}>Nom *</label>
                                        <input
                                            type="text"
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                            required
                                            placeholder="Ex: Dupont"
                                            style={{
                                                padding: '11px 14px',
                                                borderRadius: '10px',
                                                border: '1px solid #CBD5E1',
                                                backgroundColor: '#FFFFFF',
                                                color: '#0F172A',
                                                fontSize: '13.5px',
                                                outline: 'none'
                                            }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155' }}>Numéro de téléphone *</label>
                                        <input
                                            type="tel"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            required
                                            placeholder="Ex: 06 12 34 56 78"
                                            style={{
                                                padding: '11px 14px',
                                                borderRadius: '10px',
                                                border: '1px solid #CBD5E1',
                                                backgroundColor: '#FFFFFF',
                                                color: '#0F172A',
                                                fontSize: '13.5px',
                                                outline: 'none'
                                            }}
                                        />
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155' }}>Adresse e-mail</label>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="Ex: jean.dupont@email.com"
                                            style={{
                                                padding: '11px 14px',
                                                borderRadius: '10px',
                                                border: '1px solid #CBD5E1',
                                                backgroundColor: '#FFFFFF',
                                                color: '#0F172A',
                                                fontSize: '13.5px',
                                                outline: 'none'
                                            }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155' }}>Adresse des travaux / intervention</label>
                                    <AddressAutocomplete
                                        value={address}
                                        onChange={(val) => setAddress(val)}
                                        onAddressSelect={(selected) => setAddress(selected.label)}
                                        placeholder="Ex: 15 Rue de Paris, Nice"
                                    />
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155' }}>Type de prestation</label>
                                    <select
                                        value={tradeType}
                                        onChange={(e) => setTradeType(e.target.value)}
                                        style={{
                                            padding: '11px 14px',
                                            borderRadius: '10px',
                                            border: '1px solid #CBD5E1',
                                            backgroundColor: '#FFFFFF',
                                            color: '#0F172A',
                                            fontSize: '13.5px',
                                            outline: 'none'
                                        }}
                                    >
                                        <option value="Dépannage & Diagnostic">🔧 Dépannage & Diagnostic urgent</option>
                                        <option value="Entretien & Révision">🛡️ Entretien & Révision périodique</option>
                                        <option value="Installation & Remplacement">🏗️ Installation neuve / Remplacement</option>
                                        <option value="Demande de devis général">📝 Demande de devis sur mesure</option>
                                    </select>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155' }}>Détails / Description du problème</label>
                                    <textarea
                                        rows="4"
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        placeholder="Décrivez votre besoin, la marque de vos équipements, vos disponibilités..."
                                        style={{
                                            padding: '11px 14px',
                                            borderRadius: '10px',
                                            border: '1px solid #CBD5E1',
                                            backgroundColor: '#FFFFFF',
                                            color: '#0F172A',
                                            fontSize: '13.5px',
                                            outline: 'none',
                                            resize: 'vertical',
                                            lineHeight: 1.45
                                        }}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="portal-primary-pay-btn"
                                    style={{ marginTop: '8px' }}
                                >
                                    <Send size={16} />
                                    <span>{submitting ? "Envoi en cours..." : "Envoyer ma demande"}</span>
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </main>

            {/* Footer */}
            <footer className="public-portal-footer">
                <p>© {new Date().getFullYear()} {companyName} • Propulsé par GestArt CRM.</p>
            </footer>
        </div>
    );
}

export default PublicContact;
