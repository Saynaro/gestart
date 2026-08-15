import React, { useState, useEffect } from "react";
import { X, Printer, Download, ZoomIn, ZoomOut } from "lucide-react";
import { useDocumentCustomization, getEffectiveCustomization } from "../../utils/documentCustomization";
import { useUser } from "../../utils/useUser";

function QuotePdfView({ quote, onClose, onDownload }) {
    const { company } = useUser();
    const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;
    const [zoom, setZoom] = useState(isMobile ? 0.5 : 1.0);
    const [globalCustomization] = useDocumentCustomization();
    const docCustomization = getEffectiveCustomization(quote, globalCustomization);

    if (!quote) return null;

    const companyDisplayName = company?.name || quote.company?.name || "Mon Entreprise";
    const companyDisplayAddress = company?.address ? `${company.address}${company.postalCode || company.city ? `, ${company.postalCode || ''} ${company.city || ''}` : ''}` : "Adresse non renseignée";
    const companyDisplaySiret = company?.siret || "Non renseigné";
    const companyDisplayTva = company?.tvaNumber || (company?.siren ? `FR ${company.siren}` : "Non renseigné");
    const companyDisplayPhone = company?.phone || "Non renseigné";
    const companyDisplayEmail = company?.email || "contact@entreprise.fr";
    const companyLogo = docCustomization.logoUrl || company?.logoUrl;

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
                        <span className="pdf-title">Aperçu Devis — {quote.number}</span>
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
                            <button className="top-btn" onClick={() => onDownload(quote)}><Download size={15} /> <span className="btn-label">PDF</span></button>
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
                    <div className="invoice-pdf-a4-sheet" id="invoice-pdf-print-area">
                        {/* Company / Devis details */}
                        <div className="pdf-header-row">
                            <div className="pdf-header-left">
                                {companyLogo ? (
                                    <img
                                        src={companyLogo}
                                        alt="Logo"
                                        style={{ maxHeight: '45px', maxWidth: '120px', objectFit: 'contain', marginBottom: '6pt' }}
                                    />
                                ) : (
                                    <div className="pdf-logo-stub">
                                        <span>{companyDisplayName.substring(0, 10).toUpperCase()}</span>
                                    </div>
                                )}
                                <h3 className="company-name">{companyDisplayName}</h3>
                                <p className="company-details">
                                    {companyDisplayAddress}<br />
                                    SIRET : {companyDisplaySiret}<br />
                                    N° TVA : {companyDisplayTva}
                                </p>
                            </div>
                            <div className="pdf-header-right">
                                <h1 className="doc-type-label" style={{ color: '#556B2F' }}>DEVIS</h1>
                                <table className="doc-meta-table">
                                    <tbody>
                                        <tr>
                                            <td><strong>Numéro :</strong></td>
                                            <td>{quote.number || `DEV-${quote.id}`}</td>
                                        </tr>
                                        <tr>
                                            <td><strong>Date d'émission :</strong></td>
                                            <td>{new Date(quote.date).toLocaleDateString("fr-FR")}</td>
                                        </tr>
                                        <tr>
                                            <td><strong>Date d'exigibilité du paiement :</strong></td>
                                            <td>{new Date(quote.dueDate || quote.date).toLocaleDateString("fr-FR")}</td>
                                        </tr>
                                        {quote.deliveryDate && (
                                            <tr>
                                                <td><strong>Date de livraison :</strong></td>
                                                <td>{new Date(quote.deliveryDate).toLocaleDateString("fr-FR")}</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Bill to block */}
                        <div className="pdf-billing-section">
                            <div className="billing-to-card">
                                <span className="section-label">DEVIS POUR :</span>
                                <h4 className="client-name">{quote.clientName}</h4>
                                <p className="client-details">
                                    {quote.clientAddress || "Adresse non renseignée"}<br />
                                    {quote.clientEmail}
                                </p>
                            </div>
                        </div>

                        {/* Items Table */}
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
                                {quote.lines && quote.lines.map((line, idx) => (
                                    <tr key={idx}>
                                        <td>{line.description || "Prestation / Fourniture"}</td>
                                        <td className="text-center">{line.qty}</td>
                                        <td className="text-right">{(line.unitPrice || 0).toLocaleString("fr-FR")} €</td>
                                        <td className="text-right">{((line.unitPrice || 0) * (line.qty || 1)).toLocaleString("fr-FR")} €</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Summary block */}
                        <div className="pdf-summary-block">
                            <div className="summary-table-wrap">
                                <table className="pdf-summary-table">
                                    <tbody>
                                        <tr>
                                            <td>Sous-total HT :</td>
                                            <td>{(quote.subtotalHt || 0).toLocaleString("fr-FR")} €</td>
                                        </tr>
                                        <tr>
                                            <td>TVA ({quote.tvaRate || 20}%) :</td>
                                            <td>{(quote.tvaAmount || 0).toLocaleString("fr-FR")} €</td>
                                        </tr>
                                        <tr className="grand-total-row">
                                            <td><strong>TOTAL TTC :</strong></td>
                                            <td><strong>{(quote.totalTtc || 0).toLocaleString("fr-FR")} €</strong></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Electronic signature section */}
                        <div className="pdf-signature-block-container" style={{ display: 'flex', justifyContent: 'space-between', gap: '20pt', marginTop: '20pt', fontSize: '9pt', borderTop: '1px solid #E0E0E0', paddingTop: '15pt' }}>
                            <div className="owner-sig-stub" style={{ flex: 1 }}>
                                <strong>Pour l'entreprise (Cachet & Signature) :</strong>
                                <div style={{ height: '50pt', border: '1px dashed #E0E0E0', marginTop: '5pt', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7C7B82', borderRadius: '3px' }}>
                                    Dupont Climatisation
                                </div>
                            </div>
                            <div className="client-sig-stub" style={{ flex: 1 }}>
                                <strong>Bon pour accord (Date et Signature client) :</strong>
                                {quote.status === "ACCEPTED" ? (
                                    <div style={{ height: '50pt', border: '1px solid #1A9E5C', marginTop: '5pt', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(26, 158, 92, 0.05)', color: '#1A9E5C', borderRadius: '3px' }}>
                                        <span style={{ fontWeight: 'bold' }}>✓ Signé électroniquement</span>
                                        <span style={{ fontSize: '8pt', color: '#7C7B82' }}>IP: 192.168.1.48 le {new Date(quote.date).toLocaleDateString("fr-FR")}</span>
                                    </div>
                                ) : (
                                    <div style={{ height: '50pt', border: '1px dashed #E0E0E0', marginTop: '5pt', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7C7B82', borderRadius: '3px' }}>
                                        En attente de signature
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer details */}
                        <div className="pdf-footer-section">
                            <div className="legal-notes">
                                <strong>Conditions de paiement :</strong> {quote.paymentConditions || "Paiement à 30 jours"} (Échéance le {new Date(quote.dueDate || quote.date).toLocaleDateString("fr-FR")}).<br />
                                <strong>Validité du devis :</strong> 30 jours à compter de la date d'émission (art. L. 221-5 et L. 111-1 C.conso). Devis gratuit avant exécution des travaux (art. L. 111-3 C.conso).<br />
                                <strong>Conditions d'exécution :</strong> Les travaux débuteront après signature du devis accompagné d'un acompte de 30%.<br />
                                {quote.tvaRate === 0 && <span style={{ fontWeight: 700, color: '#556B2F' }}>TVA non applicable — art. 293 B du CGI.</span>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default QuotePdfView;
