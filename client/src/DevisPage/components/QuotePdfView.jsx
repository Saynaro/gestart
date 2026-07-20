import React from "react";
import { X, Printer, Download } from "lucide-react";

function QuotePdfView({ quote, onClose, onDownload }) {
    if (!quote) return null;

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="invoice-modal-overlay pdf-viewer-overlay">
            <div className="pdf-viewer-top-bar">
                <span className="pdf-title">Aperçu Devis — {quote.number}</span>
                <div className="actions">
                    <button className="top-btn" onClick={handlePrint}><Printer size={16} /> Imprimer</button>
                    <button className="top-btn" onClick={() => onDownload(quote)}><Download size={16} /> PDF</button>
                    <button className="top-btn close-x" onClick={onClose}><X size={18} /></button>
                </div>
            </div>

            <div className="pdf-page-scroll-container">
                <div className="a4-page-shadow">
                    <div className="invoice-pdf-a4-sheet" id="invoice-pdf-print-area">
                        {/* Company / Devis details */}
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
                                <h1 className="doc-type-label" style={{ color: '#556B2F' }}>DEVIS</h1>
                                <table className="doc-meta-table">
                                    <tbody>
                                        <tr>
                                            <td><strong>Numéro :</strong></td>
                                            <td>{quote.number}</td>
                                        </tr>
                                        <tr>
                                            <td><strong>Date :</strong></td>
                                            <td>{new Date(quote.date).toLocaleDateString("fr-FR")}</td>
                                        </tr>
                                        <tr>
                                            <td><strong>Validité :</strong></td>
                                            <td>30 Jours</td>
                                        </tr>
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

                        {/* Intervention details */}
                        <div className="pdf-intervention-info">
                            <span>Objet : <strong>{quote.interventionType}</strong></span>
                            {quote.workDetails && (
                                <p className="work-details">
                                    <strong>Description des travaux prévus :</strong> {quote.workDetails}
                                </p>
                            )}
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
                                Validité du devis : 30 jours à compter de la date d'émission. Les travaux débuteront après signature du devis accompagné d'un acompte de 30%.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default QuotePdfView;
