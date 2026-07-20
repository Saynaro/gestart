import React from "react";
import { Mail, Send, Link, X } from "lucide-react";

function SendOptionsModal({ invoice, onClose, onSelfSend, onAutoSend, onCreatePaymentLink }) {
    if (!invoice) return null;

    return (
        <div className="invoice-modal-overlay">
            <div className="invoice-modal-container send-options-container" style={{ maxWidth: '450px' }}>
                <div className="invoice-modal-header">
                    <h2>Facture {invoice.number} créée !</h2>
                    <button className="close-btn" onClick={onClose}><X size={20} /></button>
                </div>

                <div className="send-options-body">
                    <p className="intro-text">
                        Sélectionnez la méthode d'envoi préférée pour cette facture de <strong>{invoice.totalTtc.toLocaleString("fr-FR")} €</strong> :
                    </p>

                    <div className="options-stack">
                        {/* Option 1: Send Myself */}
                        <div className="option-card" onClick={() => onSelfSend(invoice)}>
                            <div className="icon-wrap">
                                <Mail size={20} />
                            </div>
                            <div className="content">
                                <h4>Envoyer moi-même</h4>
                                <p>Télécharge le PDF et ouvre votre messagerie (mailto:) avec le sujet pré-rempli.</p>
                            </div>
                        </div>

                        {/* Option 2: Send Auto */}
                        <div className="option-card" onClick={() => onAutoSend(invoice)}>
                            <div className="icon-wrap success-accent">
                                <Send size={20} style={{ color: 'var(--success)' }} />
                            </div>
                            <div className="content">
                                <h4>Envoyer automatiquement</h4>
                                <p>Envoie un e-mail directement au client ({invoice.clientEmail}) avec la facture en pièce jointe.</p>
                            </div>
                        </div>

                        {/* Option 3: Payment Link */}
                        <div className="option-card" onClick={() => onCreatePaymentLink(invoice)}>
                            <div className="icon-wrap primary-accent">
                                <Link size={20} style={{ color: '#556B2F' }} />
                            </div>
                            <div className="content">
                                <h4>Créer un lien de paiement</h4>
                                <p>Génère un lien de paiement Stripe Checkout (Pro/Unlimited) pour paiement immédiat par CB.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="invoice-modal-actions" style={{ justifyContent: 'center' }}>
                    <button className="cancel-btn" style={{ width: '100%', fontSize: "1.05rem" }} onClick={onClose}>Fermer</button>
                </div>
            </div>
        </div>
    );
}

export default SendOptionsModal;
