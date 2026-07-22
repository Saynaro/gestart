import React from "react";
import { X, Upload, Send } from "lucide-react";

function InvoiceSendDrawer({ invoice, onClose, onSelfSend, onAutoSend }) {
    if (!invoice) return null;

    return (
        <div className="fp-send-drawer-overlay" onClick={onClose}>
            <div className="fp-send-drawer" onClick={e => e.stopPropagation()}>
                <div className="fp-send-drawer-header">
                    <span className="fp-send-drawer-title">Envoyer la facture</span>
                    <button className="fp-send-close-btn" onClick={onClose} aria-label="Fermer">
                        <X size={14} />
                    </button>
                </div>

                <div className="fp-send-options">
                    {/* Option 1: Self */}
                    <button className="fp-send-option" onClick={() => onSelfSend(invoice)}>
                        <div className="fp-send-option-icon">
                            <Upload size={20} />
                        </div>
                        <div>
                            <span className="fp-send-option-label">Envoyer par moi-même</span>
                            <span className="fp-send-option-desc">Télécharger, SMS, WhatsApp, etc.</span>
                        </div>
                    </button>

                    {/* Option 2: Auto */}
                    <button className="fp-send-option" onClick={() => onAutoSend(invoice)}>
                        <div className="fp-send-option-icon" style={{ backgroundColor: "rgba(85,107,47,0.12)" }}>
                            <Send size={20} style={{ color: "#556B2F" }} />
                        </div>
                        <div>
                            <span className="fp-send-option-label">Envoyer automatiquement</span>
                            <span className="fp-send-option-desc">E-mail professionnel avec votre signature</span>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
}

export default InvoiceSendDrawer;
