import React from "react";
import { X, Upload, Send } from "lucide-react";

function QuoteSendDrawer({ quote, onClose, onSelfSend, onAutoSend }) {
    if (!quote) return null;

    return (
        <div className="dv-send-drawer-overlay" onClick={onClose}>
            <div className="dv-send-drawer" onClick={e => e.stopPropagation()}>
                <div className="dv-send-drawer-header">
                    <span className="dv-send-drawer-title">Envoyer le devis</span>
                    <button className="dv-send-close-btn" onClick={onClose} aria-label="Fermer">
                        <X size={14} />
                    </button>
                </div>

                <div className="dv-send-options">
                    {/* Option 1: Self */}
                    <button className="dv-send-option" onClick={() => onSelfSend(quote)}>
                        <div className="dv-send-option-icon">
                            <Upload size={20} />
                        </div>
                        <div>
                            <span className="dv-send-option-label">Envoyer par moi-même</span>
                            <span className="dv-send-option-desc">Télécharger, SMS, WhatsApp, etc.</span>
                        </div>
                    </button>

                    {/* Option 2: Auto */}
                    <button className="dv-send-option" onClick={() => onAutoSend(quote)}>
                        <div className="dv-send-option-icon" style={{ backgroundColor: "rgba(85,107,47,0.12)" }}>
                            <Send size={20} style={{ color: "#556B2F" }} />
                        </div>
                        <div>
                            <span className="dv-send-option-label">Envoyer avec signature</span>
                            <span className="dv-send-option-desc">E-mail professionnel avec votre signature</span>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
}

export default QuoteSendDrawer;
