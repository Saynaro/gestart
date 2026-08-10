import React, { useState, useEffect } from "react";
import { X, Printer, Download, ZoomIn, ZoomOut } from "lucide-react";
import { useDocumentCustomization, getEffectiveCustomization } from "../../utils/documentCustomization";

function InvoicePdfView({ invoice, onClose, onDownload }) {
    const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;
    const [zoom, setZoom] = useState(isMobile ? 0.5 : 1.0);
    const [globalCustomization] = useDocumentCustomization();
    const docCustomization = getEffectiveCustomization(invoice, globalCustomization);

    if (!invoice) return null;

    const handlePrint = () => {
        window.print();
    };

    React.useEffect(() => {
        window.history.pushState({ pdfViewer: true }, "");
        const handlePopState = () => {
            onClose();
        };
        window.addEventListener("popstate", handlePopState);
        return () => {
            window.removeEventListener("popstate", handlePopState);
        };
    }, []);

    const zoomIn = () => setZoom(prev => Math.min(1.6, Math.round((prev + 0.1) * 100) / 100));
    const zoomOut = () => setZoom(prev => Math.max(0.35, Math.round((prev - 0.1) * 100) / 100));
    const resetZoom = () => setZoom(isMobile ? 0.65 : 1.0);

    return (
        <div className="invoice-modal-overlay pdf-viewer-overlay">
            <div className="pdf-viewer-top-bar">
                <div className="pdf-viewer-top-bar-inner">
                    <div className="pdf-top-row">
                        <span className="pdf-title">Aperçu Facture — {invoice.number}</span>
                        <button className="top-btn close-x-mobile" onClick={onClose} aria-label="Fermer">
                            <X size={18} />
                        </button>
                    </div>

                    <div className="pdf-controls-row">
                        <div className="pdf-zoom-controls">
                            <button className="top-btn" onClick={zoomOut} title="Уменьшить">
                                <ZoomOut size={15} />
                            </button>
                            <button className="top-btn zoom-badge" onClick={resetZoom}>
                                {Math.round(zoom * 100)}%
                            </button>
                            <button className="top-btn" onClick={zoomIn} title="Приблизить">
                                <ZoomIn size={15} />
                            </button>
                        </div>

                        <div className="actions">
                            <button className="top-btn" onClick={handlePrint}><Printer size={15} /> <span className="btn-label">Imprimer</span></button>
                            <button className="top-btn" onClick={() => onDownload(invoice)}><Download size={15} /> <span className="btn-label">PDF</span></button>
                            <button className="top-btn close-x-desktop" onClick={onClose} aria-label="Fermer"><X size={18} /></button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="pdf-page-scroll-container">
                <div
                    className="a4-page-shadow"
                    style={{
                        zoom: zoom,
                        transform: `scale(${zoom})`,
                        transformOrigin: 'top center',
                        transition: 'transform 0.15s ease-out, zoom 0.15s ease-out'
                    }}
                >
                    {/* A4 Sheet Container */}
                    <div className="invoice-pdf-a4-sheet" id="invoice-pdf-print-area">
                        {/* Company / Invoice details header */}
                        <div className="pdf-header-row">
                            <div className="pdf-header-left">
                                <div className="pdf-logo-stub">
                                    <span>CLIMPRO</span>
                                </div>
                                <h3 className="company-name">Dupont Climatisation</h3>
                                <p className="company-details">
                                    88 Rue de l'Aviation<br />
                                    75015 Paris, France<br />
                                    SIRET : 849 203 103 00021<br />
                                    N° TVA : FR 84 849203103
                                </p>
                            </div>
                            <div className="pdf-header-right">
                                <h1 className="doc-type-label">FACTURE</h1>
                                <table className="doc-meta-table">
                                    <tbody>
                                        <tr>
                                            <td><strong>Numéro :</strong></td>
                                            <td>{invoice.number || `INV-${invoice.id}`}</td>
                                        </tr>
                                        <tr>
                                            <td><strong>Date d'émission :</strong></td>
                                            <td>{new Date(invoice.date).toLocaleDateString("fr-FR")}</td>
                                        </tr>
                                        <tr>
                                            <td><strong>Date d'exigibilité du paiement :</strong></td>
                                            <td>{new Date(invoice.dueDate || invoice.date).toLocaleDateString("fr-FR")}</td>
                                        </tr>
                                        {invoice.deliveryDate && (
                                            <tr>
                                                <td><strong>Date de livraison :</strong></td>
                                                <td>{new Date(invoice.deliveryDate).toLocaleDateString("fr-FR")}</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Bill to block */}
                        <div className="pdf-billing-section">
                            <div className="billing-to-card">
                                <span className="section-label">FACTURÉ À :</span>
                                <h4 className="client-name">{invoice.clientName}</h4>
                                <p className="client-details">
                                    {invoice.clientAddress || "Adresse non fournie"}<br />
                                    {invoice.clientEmail}
                                </p>
                            </div>
                        </div>

                        {/* Table items */}
                        <table className="pdf-items-table">
                            <thead>
                                <tr>
                                    <th>Description</th>
                                    <th className="text-center" style={{ width: '60px' }}>Qté</th>
                                    <th className="text-right" style={{ width: '110px' }}>Prix unit. HT</th>
                                    <th className="text-right" style={{ width: '110px' }}>Total HT</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoice.lines && invoice.lines.map((line, idx) => (
                                    <tr key={idx}>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>{line.description || "Prestation / Fourniture"}</div>
                                            {line.reference && (
                                                <div style={{ fontSize: '7.5pt', color: '#7C7B82', marginTop: '2pt' }}>
                                                    Réf: {line.reference}
                                                </div>
                                            )}
                                        </td>
                                        <td className="text-center">{line.qty}</td>
                                        <td className="text-right">
                                            {(line.unitPrice || 0).toLocaleString("fr-FR")} €
                                            {line.unit && line.unit !== "Aucune" ? ` / ${line.unit.replace("À l'", "").replace("À la ", "").replace("Au ", "").replace("À ", "")}` : ""}
                                        </td>
                                        <td className="text-right">{((line.unitPrice || 0) * (line.qty || 1)).toLocaleString("fr-FR")} €</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Summary Block */}
                        <div className="pdf-summary-block">
                            <div className="summary-table-wrap">
                                <table className="pdf-summary-table">
                                    <tbody>
                                        <tr>
                                            <td>Sous-total HT :</td>
                                            <td>{(invoice.subtotalHt || 0).toLocaleString("fr-FR")} €</td>
                                        </tr>
                                        <tr>
                                            <td>TVA ({invoice.tvaRate || 20}%) :</td>
                                            <td>{(invoice.tvaAmount || 0).toLocaleString("fr-FR")} €</td>
                                        </tr>
                                        <tr className="grand-total-row">
                                            <td><strong>TOTAL TTC :</strong></td>
                                            <td><strong>{(invoice.totalTtc || 0).toLocaleString("fr-FR")} €</strong></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Footer details */}
                        <div className="pdf-footer-section">
                            <div className="iban-block">
                                <strong>Coordonnées bancaires (IBAN) :</strong><br />
                                <span>FR76 3000 6000 0123 4567 8901 234</span> · <span>BIC : PRSBFRPPXXX</span>
                            </div>
                            <div className="legal-notes">
                                <strong>Conditions de paiement :</strong> {invoice.paymentConditions || "Paiement à réception"} (Échéance le {new Date(invoice.dueDate || invoice.date).toLocaleDateString("fr-FR")}).<br />
                                <strong>Pénalités de retard :</strong> En cas de retard de paiement, application d'un taux d'intérêt égal au taux de la BCE majoré de 10 points de pourcentage (art. L. 441-10 C.com).<br />
                                <strong>Indemnité forfaitaire pour frais de recouvrement :</strong> 40 € dus de plein droit par tout professionnel en cas de retard de paiement (art. D. 441-5 C.com). Aucun escompte pour paiement anticipé (art. L. 441-9 C.com).<br />
                                {invoice.tvaRate === 0 && <span style={{ fontWeight: 700, color: '#556B2F' }}>TVA non applicable — art. 293 B du CGI.</span>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default InvoicePdfView;
