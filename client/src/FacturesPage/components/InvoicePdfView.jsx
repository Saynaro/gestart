import React from "react";
import { X, Printer, Download } from "lucide-react";

function InvoicePdfView({ invoice, onClose, onDownload }) {
    if (!invoice) return null;

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="invoice-modal-overlay pdf-viewer-overlay">
            <div className="pdf-viewer-top-bar">
                <span className="pdf-title">Aperçu Facture — {invoice.number}</span>
                <div className="actions">
                    <button className="top-btn" onClick={handlePrint}><Printer size={16} /> Imprimer</button>
                    <button className="top-btn" onClick={() => onDownload(invoice)}><Download size={16} /> PDF</button>
                    <button className="top-btn close-x" onClick={onClose}><X size={18} /></button>
                </div>
            </div>

            <div className="pdf-page-scroll-container">
                <div className="a4-page-shadow">
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
                                            <td><strong>Date :</strong></td>
                                            <td>{new Date(invoice.date).toLocaleDateString("fr-FR")}</td>
                                        </tr>
                                        <tr>
                                            <td><strong>Échéance :</strong></td>
                                            <td>{new Date(new Date(invoice.date).setDate(new Date(invoice.date).getDate() + 30)).toLocaleDateString("fr-FR")}</td>
                                        </tr>
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

                        {/* Intervention Info */}
                        <div className="pdf-intervention-info">
                            <span>Type d'intervention : <strong>{invoice.interventionType}</strong></span>
                            {invoice.workDetails && (
                                <p className="work-details">
                                    <strong>Description :</strong> {invoice.workDetails}
                                </p>
                            )}
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
                                Conditions de paiement : Règlement à réception. Tout retard de paiement entraînera l'application de pénalités de retard au taux légal en vigueur ainsi qu'une indemnité forfaitaire pour frais de recouvrement de 40 € (Art. L. 441-6 du Code de commerce).
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default InvoicePdfView;
