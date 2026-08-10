import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { Send, CheckCircle2, Phone, Mail, User } from "lucide-react";
import AddressAutocomplete from "../components/AddressAutocomplete";
import "./PublicContact.css";

function PublicContact() {
    const { slug } = useParams();
    const [submitted, setSubmitted] = useState(false);

    // Form inputs
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [address, setAddress] = useState("");
    const [prestation, setPrestation] = useState("Entretien climatisation");
    const [message, setMessage] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        setSubmitted(true);
    };

    return (
        <div className="public-contact-page">
            <div className="public-header">
                <span className="logo-label">CLIMPRO</span>
                <span className="info-txt">Demande d'intervention en ligne</span>
            </div>

            <div className="public-content-container" style={{ maxWidth: '560px' }}>
                {submitted ? (
                    <div className="signature-success-card animate-fade-in">
                        <CheckCircle2 size={60} style={{ color: 'var(--success)', margin: '0 auto 15px auto' }} />
                        <h2>Demande transmise !</h2>
                        <p>
                            Votre demande d'intervention a été envoyée à l'entreprise <strong>{slug ? slug.replace("-", " ") : "Dupont Climatisation"}</strong>.
                        </p>
                        <p className="sub-text">
                            Un technicien ou responsable prendra contact avec vous rapidement sur votre numéro de téléphone ({phone}).
                        </p>
                    </div>
                ) : (
                    <div className="public-contact-card">
                        <div className="card-header">
                            <h2>Contact & Demande d'intervention</h2>
                            <p>Remplissez le formulaire ci-dessous pour planifier ou dépanner votre système thermique.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="public-contact-form">
                            <div className="form-row-double">
                                <div className="form-field">
                                    <label className="form-label">Prénom*</label>
                                    <input 
                                        type="text" 
                                        className="profile-input" 
                                        value={firstName} 
                                        onChange={(e) => setFirstName(e.target.value)} 
                                        required 
                                        placeholder="Ex: Jean"
                                    />
                                </div>
                                <div className="form-field">
                                    <label className="form-label">Nom*</label>
                                    <input 
                                        type="text" 
                                        className="profile-input" 
                                        value={lastName} 
                                        onChange={(e) => setLastName(e.target.value)} 
                                        required 
                                        placeholder="Ex: Dupont"
                                    />
                                </div>
                            </div>

                            <div className="form-field">
                                <label className="form-label">Téléphone*</label>
                                <input 
                                    type="tel" 
                                    className="profile-input" 
                                    value={phone} 
                                    onChange={(e) => setPhone(e.target.value)} 
                                    required 
                                    placeholder="Ex: 06 12 34 56 78"
                                />
                            </div>

                            <div className="form-field">
                                <label className="form-label">Email</label>
                                <input 
                                    type="email" 
                                    className="profile-input" 
                                    value={email} 
                                    onChange={(e) => setEmail(e.target.value)} 
                                    placeholder="Ex: jean.dupont@email.com"
                                />
                            </div>

                            <div className="form-field">
                                <label className="form-label">Adresse du chantier / intervention</label>
                                <AddressAutocomplete
                                    value={address}
                                    onChange={(val) => setAddress(val)}
                                    onAddressSelect={(selected) => setAddress(selected.label)}
                                    placeholder="Adresse complète (ex: 8 bd du palais paris)"
                                />
                            </div>

                            <div className="form-field">
                                <label className="form-label">Type de prestation souhaitée</label>
                                <select 
                                    className="profile-input option-select"
                                    value={prestation}
                                    onChange={(e) => setPrestation(e.target.value)}
                                >
                                    <option value="Entretien climatisation">🔧 Entretien de climatisation</option>
                                    <option value="Dépannage PAC">⚠️ Dépannage pompe à chaleur (PAC)</option>
                                    <option value="Installation Climatisation">🏗️ Installation climatisation ou chauffage</option>
                                    <option value="Autre">📝 Autre demande d'assistance</option>
                                </select>
                            </div>

                            <div className="form-field">
                                <label className="form-label">Message / Description du problème</label>
                                <textarea 
                                    className="profile-input textarea-field" 
                                    rows="4" 
                                    value={message} 
                                    onChange={(e) => setMessage(e.target.value)} 
                                    placeholder="Décrivez votre panne, marque d'équipement, ou vos disponibilités..."
                                />
                            </div>

                            <button type="submit" className="submit-contact-btn">
                                <Send size={16} /> Envoyer ma demande
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}

export default PublicContact;
