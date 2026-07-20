import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { CreditCard, CheckCircle, ShieldCheck } from "lucide-react";
import "./PayInvoice.css";

function PayInvoice() {
    const { token } = useParams();
    const [step, setStep] = useState("recap"); // 'recap', 'checkout', 'success'
    
    // Stripe card entry simulation state
    const [cardNumber, setCardNumber] = useState("4242 •••• •••• 4242");
    const [cardExpiry, setCardExpiry] = useState("12/28");
    const [cardCvc, setCardCvc] = useState("123");
    
    const invoice = {
        number: "INV-2026-002",
        amountTtc: 240.00,
        dueDate: "10/08/2026",
        companyName: "Dupont Climatisation",
        clientName: "Marie Martin",
        clientEmail: "marie.martin@email.com",
        interventionType: "Dépannage d'urgence"
    };

    const handleStartPayment = () => {
        setStep("checkout");
    };

    const handleConfirmPayment = (e) => {
        e.preventDefault();
        setStep("success");
    };

    return (
        <div className="public-payment-page">
            <div className="public-header">
                <span className="logo-label">CLIMPRO</span>
                <span className="info-txt">Facture de <strong>{invoice.companyName}</strong></span>
            </div>

            <div className="public-content-container">
                {step === "recap" && (
                    <div className="public-pay-card animate-fade-in">
                        <div className="card-logo-row">
                            <div className="header-icon-container">
                                <CreditCard size={20} />
                            </div>
                            <h3>Règlement en ligne</h3>
                        </div>

                        <div className="invoice-recap-box">
                            <div className="recap-row">
                                <span className="lbl">Facture N° :</span>
                                <span className="val"><strong>{invoice.number}</strong></span>
                            </div>
                            <div className="recap-row">
                                <span className="lbl">Échéance :</span>
                                <span className="val">{new Date(invoice.dueDate).toLocaleDateString("fr-FR")}</span>
                            </div>
                            <div className="recap-row">
                                <span className="lbl">Client :</span>
                                <span className="val">{invoice.clientName}</span>
                            </div>
                            <div className="recap-row">
                                <span className="lbl">Prestation :</span>
                                <span className="val">{invoice.interventionType}</span>
                            </div>
                            <div className="recap-row amount-total">
                                <span className="lbl">Montant dû :</span>
                                <span className="val">{invoice.amountTtc.toLocaleString("fr-FR")} €</span>
                            </div>
                        </div>

                        <button 
                            className="pay-now-action-btn"
                            onClick={handleStartPayment}
                        >
                            💳 Payer {invoice.amountTtc.toLocaleString("fr-FR")} € en ligne
                        </button>

                        <div className="stripe-secure-badge">
                            <ShieldCheck size={14} />
                            <span>Paiement sécurisé via Stripe Checkout</span>
                        </div>
                    </div>
                )}

                {step === "checkout" && (
                    <div className="public-pay-card stripe-checkout-bezel animate-fade-in">
                        <div className="stripe-header">
                            <span className="stripe-logo">stripe</span>
                            <span className="checkout-badge">Pay {invoice.amountTtc.toLocaleString("fr-FR")} €</span>
                        </div>

                        <form onSubmit={handleConfirmPayment} className="stripe-form">
                            <h3>Détails du paiement</h3>

                            <div className="form-field">
                                <label className="form-label">Adresse email</label>
                                <input type="email" className="profile-input" defaultValue={invoice.clientEmail} required />
                            </div>

                            <div className="form-field">
                                <label className="form-label">Informations de carte</label>
                                <div className="card-input-wrapper">
                                    <input 
                                        type="text" 
                                        className="card-field num" 
                                        value={cardNumber} 
                                        onChange={(e) => setCardNumber(e.target.value)} 
                                        required 
                                    />
                                    <div className="card-row">
                                        <input 
                                            type="text" 
                                            className="card-field exp" 
                                            value={cardExpiry} 
                                            onChange={(e) => setCardExpiry(e.target.value)} 
                                            placeholder="MM / AA" 
                                            required 
                                        />
                                        <input 
                                            type="password" 
                                            className="card-field cvc" 
                                            value={cardCvc} 
                                            onChange={(e) => setCardCvc(e.target.value)} 
                                            placeholder="CVC" 
                                            maxLength="3" 
                                            required 
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="form-field">
                                <label className="form-label">Nom sur la carte</label>
                                <input type="text" className="profile-input" defaultValue={invoice.clientName} required />
                            </div>

                            <button type="submit" className="stripe-submit-btn">
                                Payer {invoice.amountTtc.toLocaleString("fr-FR")} €
                            </button>

                            <button type="button" className="stripe-back-btn" onClick={() => setStep("recap")}>
                                Annuler et retourner
                            </button>
                        </form>
                    </div>
                )}

                {step === "success" && (
                    <div className="signature-success-card animate-fade-in">
                        <CheckCircle size={60} style={{ color: 'var(--success)', margin: '0 auto 15px auto' }} />
                        <h2>Paiement confirmé !</h2>
                        <p>Le règlement de <strong>{invoice.amountTtc.toLocaleString("fr-FR")} €</strong> pour la facture <strong>{invoice.number}</strong> a été validé.</p>
                        <p className="sub-txt">Un e-mail de confirmation avec votre reçu de paiement a été envoyé automatiquement.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default PayInvoice;
