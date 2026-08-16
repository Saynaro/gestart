import React from "react";
import { X, Printer, Download, CheckCircle2, ShieldCheck } from "lucide-react";
import "./SubscriptionReceiptModal.css";

export default function SubscriptionReceiptModal({ receipt, user, company, currentPlan, onClose }) {
    if (!receipt) return null;

    const amountNum = Number(receipt.amount || 1);
    const amountHt = amountNum;
    const tvaRate = 0.20;
    const amountTva = amountHt * tvaRate;
    const amountTtc = amountHt + amountTva;

    const handlePrint = () => {
        window.print();
    };

    const buyerName = company?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || "Client GestArt";
    const buyerAddress = company?.address ? `${company.address}${company.postalCode || company.city ? `, ${company.postalCode || ''} ${company.city || ''}` : ''}` : "Adresse professionnelle non renseignée";
    const buyerSiret = company?.siret || "N/A";
    const buyerEmail = user?.email || company?.email || "contact@entreprise.fr";

    const planLabel = receipt.planName || currentPlan || "Unlimited";

    return (
        <div className="receipt-modal-backdrop">
            {/* Top Toolbar (hidden in print) */}
            <div className="receipt-toolbar no-print">
                <div className="receipt-toolbar-left">
                    <span className="receipt-toolbar-title">Reçu de paiement — {receipt.displayId}</span>
                    <span className="receipt-status-badge">
                        <CheckCircle2 size={13} /> Acquitté
                    </span>
                </div>
                <div className="receipt-toolbar-actions">
                    <button type="button" className="receipt-btn receipt-btn-primary" onClick={handlePrint}>
                        <Printer size={15} /> Imprimer / Télécharger en PDF
                    </button>
                    <button type="button" className="receipt-btn receipt-btn-close" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Printable A4 Receipt Sheet */}
            <div className="receipt-paper-wrapper">
                <div className="receipt-paper" id="printable-receipt">
                    {/* Header */}
                    <div className="receipt-header">
                        <div className="receipt-brand">
                            <div className="receipt-logo-box">
                                <span className="receipt-logo-letter">G</span>
                            </div>
                            <div>
                                <h1 className="receipt-company-title">GestArt</h1>
                                <p className="receipt-company-subtitle">Plateforme SaaS de Facturation & CRM</p>
                            </div>
                        </div>
                        <div className="receipt-meta-box">
                            <h2 className="receipt-doc-type">JUSTIFICATIF DE RÈGLEMENT</h2>
                            <div className="receipt-meta-row">
                                <span className="receipt-meta-label">Réf. Reçu :</span>
                                <span className="receipt-meta-val">{receipt.displayId}</span>
                            </div>
                            <div className="receipt-meta-row">
                                <span className="receipt-meta-label">Date :</span>
                                <span className="receipt-meta-val">{receipt.formattedDate}</span>
                            </div>
                            <div className="receipt-meta-row">
                                <span className="receipt-meta-label">Mode :</span>
                                <span className="receipt-meta-val">Carte bancaire (Stripe)</span>
                            </div>
                            <div className="receipt-meta-row">
                                <span className="receipt-meta-label">Statut :</span>
                                <span className="receipt-meta-val paid">Payé avec succès</span>
                            </div>
                        </div>
                    </div>

                    {/* Parties (Seller & Buyer) */}
                    <div className="receipt-parties-grid">
                        <div className="receipt-party-card">
                            <span className="party-role">FOURNISSEUR DU SERVICE</span>
                            <strong className="party-name">GestArt SAS</strong>
                            <p className="party-detail">10 Place de la République</p>
                            <p className="party-detail">75011 Paris, France</p>
                            <p className="party-detail">SIRET : 944 087 725 00018</p>
                            <p className="party-detail">TVA : FR 12 944 087 725</p>
                            <p className="party-detail">Email : support@gestart.link</p>
                        </div>

                        <div className="receipt-party-card client">
                            <span className="party-role">CLIENT / SOUSCRIPTEUR</span>
                            <strong className="party-name">{buyerName}</strong>
                            <p className="party-detail">{buyerAddress}</p>
                            <p className="party-detail">SIRET : {buyerSiret}</p>
                            <p className="party-detail">Email : {buyerEmail}</p>
                            {company?.tvaNumber && <p className="party-detail">N° TVA : {company.tvaNumber}</p>}
                        </div>
                    </div>

                    {/* Table Item */}
                    <div className="receipt-table-wrapper">
                        <table className="receipt-table">
                            <thead>
                                <tr>
                                    <th style={{ textAlign: 'left' }}>Désignation de la prestation</th>
                                    <th style={{ textAlign: 'center', width: '80px' }}>Qté</th>
                                    <th style={{ textAlign: 'right', width: '130px' }}>Prix unitaire HT</th>
                                    <th style={{ textAlign: 'right', width: '130px' }}>Total HT</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>
                                        <strong>Abonnement Logiciel GestArt — Formule {planLabel}</strong>
                                        <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '3px' }}>
                                            Accès complet aux services CRM, création illimitée de devis/factures, planning et signatures électroniques.
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>1</td>
                                    <td style={{ textAlign: 'right' }}>{amountHt.toFixed(2).replace('.', ',')} €</td>
                                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{amountHt.toFixed(2).replace('.', ',')} €</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Totals Section */}
                    <div className="receipt-totals-container">
                        <div className="receipt-guarantee">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#15803d', fontWeight: 700, fontSize: '12px', marginBottom: '4px' }}>
                                <ShieldCheck size={16} /> Paiement 100% sécurisé via Stripe
                            </div>
                            <p style={{ margin: 0, fontSize: '11px', color: '#64748B', lineHeight: '1.4' }}>
                                Transaction acquittée et enregistrée. Conservez ce reçu pour votre comptabilité.
                            </p>
                        </div>

                        <div className="receipt-totals-table">
                            <div className="receipt-total-row">
                                <span>Total Hors Taxes (HT) :</span>
                                <strong>{amountHt.toFixed(2).replace('.', ',')} €</strong>
                            </div>
                            <div className="receipt-total-row">
                                <span>TVA (20,00 %) :</span>
                                <strong>{amountTva.toFixed(2).replace('.', ',')} €</strong>
                            </div>
                            <div className="receipt-total-row grand-total">
                                <span>Montant Total TTC réglé :</span>
                                <strong>{amountTtc.toFixed(2).replace('.', ',')} €</strong>
                            </div>
                        </div>
                    </div>

                    {/* Footer Legal Notes */}
                    <div className="receipt-footer">
                        <p>
                            Document valant reçu de paiement et justificatif comptable conformément aux dispositions légales.
                            GestArt SAS au capital de 10 000 € • RCS Paris • Tous droits réservés.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
