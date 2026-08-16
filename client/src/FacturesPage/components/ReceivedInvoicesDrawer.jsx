import React, { useState } from "react";
import { X, Download, Building, Calendar, FileText, CheckCircle, ShieldCheck, Loader2, ExternalLink } from "lucide-react";
import { apiFetch } from "../../utils/api";

export default function ReceivedInvoicesDrawer({ invoice, onClose, onRefresh }) {
    const [downloading, setDownloading] = useState(false);

    if (!invoice) return null;

    const handleDownload = async (format = "pdf") => {
        try {
            setDownloading(true);
            const token = localStorage.getItem("accessToken");
            const res = await fetch(`/api/v1/e-invoicing/invoices/received/${invoice.id}/download?format=${format}`, {
                headers: {
                    ...(token && { Authorization: `Bearer ${token}` })
                }
            });

            if (!res.ok) throw new Error("Échec du téléchargement");

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Facture_Fournisseur_${invoice.invoiceNumber || invoice.id}.${format === "factur-x" ? "pdf" : format}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            console.error("Download error:", err);
            alert("Erreur lors du téléchargement du document original.");
        } finally {
            setDownloading(false);
        }
    };

    const structured = invoice.structuredData || {};
    const rawInv = structured.invoice || structured;
    const lines = rawInv.invoice_lines_attributes || rawInv.lines || [];

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(6px)',
            zIndex: 99999,
            display: 'flex',
            justifyContent: 'flex-end'
        }} onClick={onClose}>
            <div
                style={{
                    width: '100%',
                    maxWidth: '560px',
                    height: '100%',
                    backgroundColor: 'var(--card)',
                    borderLeft: '1px solid var(--border)',
                    boxShadow: '-10px 0 30px rgba(0,0,0,0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflowY: 'auto',
                    padding: '24px'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                            padding: '4px 10px',
                            borderRadius: '20px',
                            backgroundColor: 'rgba(34, 197, 94, 0.12)',
                            color: '#16A34A',
                            fontSize: '11.5px',
                            fontWeight: 800
                        }}>
                            FACTURE FOURNISSEUR REÇUE
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Title & Amount */}
                <div style={{ marginBottom: '24px' }}>
                    <h2 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: 800, color: 'var(--foreground)' }}>
                        {invoice.invoiceNumber}
                    </h2>
                    <div style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>
                        Reçue via Plateforme Agréée ({invoice.provider || "B2Brouter"}) • {new Date(invoice.receivedAt || invoice.issueDate).toLocaleDateString('fr-FR')}
                    </div>
                    <div style={{
                        marginTop: '16px',
                        padding: '16px',
                        borderRadius: '12px',
                        backgroundColor: 'var(--background)',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div>
                            <span style={{ fontSize: '11.5px', color: 'var(--muted-foreground)', fontWeight: 600 }}>TOTAL TTC À PAYER</span>
                            <div style={{ fontSize: '22px', fontWeight: 900, color: 'var(--sidebar-primary)' }}>
                                {Number(invoice.totalTTC || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>
                                HT : <strong>{Number(invoice.totalHT || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</strong>
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>
                                TVA : <strong>{Number(invoice.totalVAT || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</strong>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Supplier Information Card */}
                <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', marginBottom: '20px', backgroundColor: 'var(--background)' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Building size={16} style={{ color: 'var(--sidebar-primary)' }} />
                        Identité du Fournisseur Émetteur
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12.5px' }}>
                        <div>
                            <span style={{ color: 'var(--muted-foreground)', display: 'block', fontSize: '11px' }}>Raison Sociale</span>
                            <strong style={{ color: 'var(--foreground)' }}>{invoice.supplierName}</strong>
                        </div>
                        <div>
                            <span style={{ color: 'var(--muted-foreground)', display: 'block', fontSize: '11px' }}>SIRET</span>
                            <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{invoice.supplierSiret || "Non renseigné"}</span>
                        </div>
                        <div>
                            <span style={{ color: 'var(--muted-foreground)', display: 'block', fontSize: '11px' }}>N° TVA Intracommunautaire</span>
                            <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{invoice.supplierVatNumber || "Non renseigné"}</span>
                        </div>
                        <div>
                            <span style={{ color: 'var(--muted-foreground)', display: 'block', fontSize: '11px' }}>Date d'échéance</span>
                            <strong>{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('fr-FR') : "À réception"}</strong>
                        </div>
                    </div>
                    {invoice.supplierAddress && (
                        <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--muted-foreground)' }}>
                            📍 {invoice.supplierAddress} {invoice.supplierPostalCode} {invoice.supplierCity}
                        </div>
                    )}
                </div>

                {/* Line items if structured */}
                {lines.length > 0 && (
                    <div style={{ marginBottom: '24px' }}>
                        <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 700 }}>
                            Détail des Lignes et Prestations
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {lines.map((l, idx) => (
                                <div key={idx} style={{
                                    padding: '10px 12px',
                                    borderRadius: '8px',
                                    backgroundColor: 'var(--background)',
                                    border: '1px solid var(--border)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    fontSize: '12.5px'
                                }}>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{l.description || `Ligne #${idx + 1}`}</div>
                                        <div style={{ fontSize: '11.5px', color: 'var(--muted-foreground)' }}>
                                            Qté: {l.quantity || 1} × {Number(l.price || l.unit_price || 0).toFixed(2)} €
                                        </div>
                                    </div>
                                    <div style={{ fontWeight: 800, color: 'var(--foreground)' }}>
                                        {Number(l.extension_amount || (l.quantity * (l.price || 0))).toFixed(2)} €
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Actions: Download Factur-X / PDF */}
                <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid var(--border)', display: 'flex', gap: '12px' }}>
                    <button
                        onClick={() => handleDownload("pdf")}
                        disabled={downloading}
                        style={{
                            flex: 1,
                            padding: '12px',
                            borderRadius: '10px',
                            backgroundColor: 'var(--sidebar-primary)',
                            color: '#fff',
                            border: 'none',
                            fontWeight: 700,
                            fontSize: '13px',
                            cursor: downloading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                        }}
                    >
                        {downloading ? <Loader2 size={16} className="spin-loader" /> : <Download size={16} />}
                        Télécharger le document (Factur-X / PDF)
                    </button>
                </div>
            </div>
        </div>
    );
}
