import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Printer, Download, ZoomIn, ZoomOut, CheckCircle2, ShieldCheck, Loader2 } from "lucide-react";
import { getAuthToken } from "../../utils/auth";
import { getApiUrl } from "../../utils/config";
import "./SubscriptionReceiptModal.css";

export default function SubscriptionReceiptModal({ receipt, user, company, currentPlan, onClose }) {
    const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;
    
    // Compute initial zoom so that 210mm (~794px) fits nicely on small screens
    const getFitZoom = () => {
        if (typeof window === "undefined") return 1.0;
        if (window.innerWidth <= 768) {
            return Math.min(0.85, Math.max(0.42, Math.round(((window.innerWidth - 16) / 794) * 100) / 100));
        }
        return 1.0;
    };

    const [zoom, setZoom] = useState(getFitZoom);
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    // Lock body scroll while full screen receipt preview is active
    useEffect(() => {
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = originalOverflow;
        };
    }, []);

    if (!receipt) return null;

    const amountTotal = Number(receipt.amount || 1);
    const amountHt = amountTotal / 1.2;
    const amountTva = amountTotal - amountHt;

    const zoomIn = () => setZoom(prev => Math.min(1.6, Math.round((prev + 0.1) * 100) / 100));
    const zoomOut = () => setZoom(prev => Math.max(0.35, Math.round((prev - 0.1) * 100) / 100));
    const resetZoom = () => setZoom(getFitZoom());

    const handlePrint = () => {
        window.print();
    };

    const handleDownloadPdf = async () => {
        try {
            setDownloading(true);
            const token = getAuthToken();
            const res = await fetch(getApiUrl(`/v1/subscription/receipts/${receipt.id}/pdf`), {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                credentials: 'include'
            });

            if (!res.ok) {
                // If server PDF generator fails or mock ID, fallback to window.print()
                console.warn("Could not fetch server PDF, opening print dialog fallback");
                window.print();
                return;
            }

            const blob = await res.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = blobUrl;
            link.download = `Recu_Paiement_${(receipt.displayId || 'Stripe').replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (err) {
            console.error("Error downloading receipt PDF:", err);
            window.print();
        } finally {
            setDownloading(false);
        }
    };

    const buyerName = company?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || "Client GestArt";
    const buyerAddress = company?.address ? `${company.address}${company.postalCode || company.city ? `, ${company.postalCode || ''} ${company.city || ''}` : ''}` : "Adresse professionnelle non renseignée";
    const buyerSiret = company?.siret || "Non renseigné";
    const buyerEmail = user?.email || company?.email || "contact@entreprise.fr";
    const planLabel = receipt.planName || currentPlan || "Unlimited";

    const modalContent = (
        <div className="receipt-modal-backdrop pdf-viewer-overlay">
            {/* Top Bar matching Facture / Devis Previsualiser */}
            <div className="pdf-viewer-top-bar no-print">
                <div className="pdf-viewer-top-bar-inner">
                    <div className="pdf-top-row">
                        <span className="pdf-title">Aperçu Reçu — {receipt.displayId}</span>
                        <button className="top-btn close-x-mobile" onClick={onClose} aria-label="Fermer">
                            <X size={18} />
                        </button>
                    </div>

                    <div className="pdf-controls-row">
                        <div className="pdf-zoom-controls">
                            <button className="top-btn" onClick={zoomOut} title="Réduire">
                                <ZoomOut size={15} />
                            </button>
                            <button className="top-btn zoom-badge" onClick={resetZoom} title="Réinitialiser">
                                {Math.round(zoom * 100)}%
                            </button>
                            <button className="top-btn" onClick={zoomIn} title="Agrandir">
                                <ZoomIn size={15} />
                            </button>
                        </div>

                        <div className="actions">
                            <button className="top-btn" onClick={handlePrint} title="Imprimer le justificatif">
                                <Printer size={15} />
                                <span className="btn-label">Imprimer</span>
                            </button>
                            <button 
                                className="top-btn receipt-pdf-action-btn" 
                                onClick={handleDownloadPdf} 
                                disabled={downloading}
                                title="Télécharger le fichier PDF officiel"
                            >
                                {downloading ? <Loader2 size={15} className="receipt-spin" /> : <Download size={15} />}
                                <span className="btn-label">{downloading ? "Téléchargement..." : "PDF"}</span>
                            </button>
                            <button
                                type="button"
                                className="top-btn close-btn-always"
                                onClick={onClose}
                                aria-label="Fermer"
                                title="Fermer l'aperçu"
                                style={{
                                    backgroundColor: "#ef4444",
                                    color: "#ffffff",
                                    fontWeight: 700,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px"
                                }}
                            >
                                <X size={16} />
                                <span className="btn-label">Fermer</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Scroll Container with Real A4 Sheet */}
            <div className="pdf-page-scroll-container">
                <div
                    className="a4-page-shadow"
                    style={{
                        transform: `scale(${zoom})`,
                        transformOrigin: "top center",
                        transition: "transform 0.15s ease-out"
                    }}
                >
                    <div className="invoice-pdf-a4-sheet" id="subscription-receipt-print-area">
                        {/* A4 Content Top */}
                        <div>
                            {/* Header */}
                            <div className="sub-receipt-header">
                                <div className="sub-receipt-brand">
                                    <img 
                                        src="/Logo-transparent.png" 
                                        alt="GestArt" 
                                        className="sub-receipt-logo-img" 
                                    />
                                    <div>
                                        <h1 className="sub-receipt-title">GestArt</h1>
                                        <p className="sub-receipt-subtitle">Plateforme SaaS de Facturation & CRM</p>
                                    </div>
                                </div>

                                <div className="sub-receipt-meta">
                                    <div className="sub-receipt-badge">
                                        <CheckCircle2 size={13} /> PAIEMENT CONFIRMÉ
                                    </div>
                                    <h2 className="sub-receipt-doc-title">JUSTIFICATIF DE RÈGLEMENT</h2>
                                    <div className="sub-receipt-meta-line">
                                        <span className="sub-meta-k">Réf. Reçu :</span>
                                        <span className="sub-meta-v">{receipt.displayId}</span>
                                    </div>
                                    <div className="sub-receipt-meta-line">
                                        <span className="sub-meta-k">Date :</span>
                                        <span className="sub-meta-v">{receipt.formattedDate}</span>
                                    </div>
                                    <div className="sub-receipt-meta-line">
                                        <span className="sub-meta-k">Mode :</span>
                                        <span className="sub-meta-v">Carte bancaire (Stripe)</span>
                                    </div>
                                </div>
                            </div>

                            {/* Parties: Issuer & Subscriber */}
                            <div className="sub-receipt-parties">
                                <div className="sub-party-card">
                                    <span className="sub-party-label">Bénéficiaire / Émetteur</span>
                                    <strong className="sub-party-name">KHALID SAINARO EI</strong>
                                    <div className="sub-party-info" style={{ fontWeight: 600, color: '#556B2F' }}>Nom commercial : GestArt</div>
                                    <div className="sub-party-info">23 Rue Paganini</div>
                                    <div className="sub-party-info">06000 Nice, France</div>
                                    <div className="sub-party-info">SIRET : 944 087 725 00015</div>
                                    <div className="sub-party-info">Code APE : 53.20Z</div>
                                    <div className="sub-party-info">Tél : 06 51 60 43 16</div>
                                    <div className="sub-party-info">Email : support.gestart@gmail.com</div>
                                </div>

                                <div className="sub-party-card client-box">
                                    <span className="sub-party-label client-label">Payeur / Souscripteur</span>
                                    <strong className="sub-party-name">{buyerName}</strong>
                                    <div className="sub-party-info">{buyerAddress}</div>
                                    <div className="sub-party-info">SIRET : {buyerSiret}</div>
                                    <div className="sub-party-info">Email : {buyerEmail}</div>
                                    {company?.tvaNumber && <div className="sub-party-info">N° TVA : {company.tvaNumber}</div>}
                                </div>
                            </div>

                            {/* Line items table */}
                            <table className="sub-receipt-table">
                                <thead>
                                    <tr>
                                        <th style={{ textAlign: "left" }}>Désignation de la prestation</th>
                                        <th style={{ textAlign: "center", width: "70px" }}>Qté</th>
                                        <th style={{ textAlign: "right", width: "110px" }}>Prix unitaire</th>
                                        <th style={{ textAlign: "right", width: "110px" }}>Total HT</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>
                                            <div className="sub-table-item-title">
                                                Abonnement Logiciel GestArt — Formule {planLabel}
                                            </div>
                                            <div className="sub-table-item-desc">
                                                Accès complet aux services CRM, création illimitée de devis/factures, planning et signatures électroniques.
                                            </div>
                                        </td>
                                        <td style={{ textAlign: "center", fontWeight: 600 }}>1</td>
                                        <td style={{ textAlign: "right" }}>{amountHt.toFixed(2).replace('.', ',')} €</td>
                                        <td style={{ textAlign: "right", fontWeight: 700 }}>{amountHt.toFixed(2).replace('.', ',')} €</td>
                                    </tr>
                                </tbody>
                            </table>

                            {/* Guarantee Box & Totals */}
                            <div className="sub-receipt-bottom-grid">
                                <div className="sub-guarantee-box">
                                    <div className="sub-guarantee-title">
                                        <ShieldCheck size={16} /> Attestation de règlement
                                    </div>
                                    <p className="sub-guarantee-text">
                                        Le présent document atteste que le paiement du règlement <strong>{receipt.displayId}</strong> d'un montant de <strong>{amountTotal.toFixed(2).replace('.', ',')} € TTC</strong> a été exécuté avec succès via notre passerelle bancaire sécurisée Stripe.
                                    </p>
                                </div>

                                <div className="sub-totals-wrapper">
                                    <table className="sub-totals-table">
                                        <tbody>
                                            <tr>
                                                <td className="sub-tot-label">Total HT :</td>
                                                <td className="sub-tot-val">{amountHt.toFixed(2).replace('.', ',')} €</td>
                                            </tr>
                                            <tr>
                                                <td className="sub-tot-label">TVA (20%) :</td>
                                                <td className="sub-tot-val">{amountTva.toFixed(2).replace('.', ',')} €</td>
                                            </tr>
                                            <tr className="sub-tot-grand">
                                                <td className="sub-tot-label">TOTAL TTC RÉGLÉ :</td>
                                                <td className="sub-tot-val">{amountTotal.toFixed(2).replace('.', ',')} €</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* A4 Footer Legal */}
                        <div className="sub-receipt-footer">
                            <p>
                                Document valant reçu de paiement et justificatif comptable conformément aux dispositions légales.
                                KHALID SAINARO EI (Nom commercial : GestArt) • SIRET : 944 087 725 00015 • APE : 53.20Z • 23 Rue Paganini, 06000 Nice • Tél : 06 51 60 43 16 • support.gestart@gmail.com • Tous droits réservés.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    if (typeof document === "undefined") return null;
    return createPortal(modalContent, document.body);
}
