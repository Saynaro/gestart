import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Inbox, Send, RefreshCw, Building, ShieldCheck, Loader2 } from "lucide-react";
import "./FacturesPage.css";
import "../PlanningPage/PlanningPage.css";

import SideBar from "../components/SideBar";
import Header from "../components/Header";

import InvoiceList from "./components/InvoiceList";
import InvoiceDetailDrawer from "./components/InvoiceDetailDrawer";
import InvoiceSendDrawer from "./components/InvoiceSendDrawer";
import InvoiceEditPanel from "./components/InvoiceEditPanel";
import InvoicePdfView from "./components/InvoicePdfView";
import NewInvoiceModal from "./components/NewInvoiceModal";
import PaymentMethodModal from "./components/PaymentMethodModal";
import QuoteDetailDrawer from "../DevisPage/components/QuoteDetailDrawer";
import QuotePdfView from "../DevisPage/components/QuotePdfView";
import ReceivedInvoicesDrawer from "./components/ReceivedInvoicesDrawer";
import { apiFetch } from "../utils/api";

const FILTERS = [
    { key: "all",      label: "Toutes" },
    { key: "draft",    label: "Brouillon" },
    { key: "pending",  label: "En attente" },
    { key: "paid",     label: "Payée" },
    { key: "overdue",  label: "En retard" },
];

function FacturesPage() {
    const location = useLocation();
    const [invoices, setInvoices] = useState([]);
    const [receivedInvoices, setReceivedInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingReceived, setLoadingReceived] = useState(false);
    const [activeTabMode, setActiveTabMode] = useState("emises"); // "emises" | "recues"
    const [activeReceivedInvoice, setActiveReceivedInvoice] = useState(null);

    const mapInvoiceFromApi = (inv) => ({
        id: inv.id,
        number: inv.number || `F-2026-${String(inv.id).padStart(4, "0")}`,
        clientName: inv.client ? `${inv.client.firstName || ''} ${inv.client.lastName || inv.client.companyName || ''}`.trim() : (inv.clientName || 'Client Inconnu'),
        clientEmail: inv.client?.email || inv.clientEmail || '',
        clientAddress: inv.client ? `${inv.client.address || ''} ${inv.client.city || ''}`.trim() : (inv.clientAddress || ''),
        interventionType: inv.subject || inv.interventionType || "Prestation",
        workDetails: inv.description || inv.workDetails || "",
        date: inv.createdAt ? new Date(inv.createdAt).toISOString().split('T')[0] : (inv.date || new Date().toISOString().split('T')[0]),
        dueDate: inv.dueAt ? new Date(inv.dueAt).toISOString().split('T')[0] : (inv.dueDate || new Date().toISOString().split('T')[0]),
        paymentDelay: inv.paymentDelay || 30,
        tvaRate: inv.tvaRate || 20,
        subtotalHt: Number(inv.amountHT || inv.totalHt || inv.subtotalHt || 0),
        tvaAmount: Number(inv.amountTTC ? (inv.amountTTC - (inv.amountHT || 0)) : (inv.totalTva || 0)),
        totalTtc: Number(inv.amountTTC || inv.totalTtc || 0),
        status: (inv.status || "draft").toLowerCase(),
        einvoicingStatus: inv.einvoicingStatus || "DRAFT",
        lines: inv.lines || []
    });

    const fetchInvoices = async () => {
        try {
            setLoading(true);
            const data = await apiFetch('/v1/invoices');
            const rawInvoices = data.data?.invoices || data.data || data || [];
            setInvoices(rawInvoices.map(mapInvoiceFromApi));
        } catch (err) {
            console.warn("API invoices error:", err.message);
            setInvoices([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchReceivedInvoices = async () => {
        try {
            setLoadingReceived(true);
            const data = await apiFetch('/v1/e-invoicing/invoices/received');
            const raw = data.data?.invoices || data.invoices || [];
            setReceivedInvoices(raw);
        } catch (err) {
            console.warn("API received invoices error:", err.message);
            setReceivedInvoices([]);
        } finally {
            setLoadingReceived(false);
        }
    };

    useEffect(() => {
        fetchInvoices();
        fetchReceivedInvoices();
    }, []);

    const [activeFilter, setActiveFilter] = useState("all");
    const [activeInvoice, setActiveInvoice] = useState(null);
    const [showDetailDrawer, setShowDetailDrawer] = useState(false);
    const [showSendDrawer, setShowSendDrawer] = useState(false);
    const [showEditPanel, setShowEditPanel] = useState(false);
    const [showPdfModal, setShowPdfModal] = useState(false);
    const [showNewModal, setShowNewModal] = useState(false);

    useEffect(() => {
        if (location.state?.openNewModal) {
            setShowNewModal(true);
        }
    }, [location.state]);
    const [paymentModalInvoice, setPaymentModalInvoice] = useState(null);
    const [linkedQuoteForDrawer, setLinkedQuoteForDrawer] = useState(null);
    const [pdfModalQuote, setPdfModalQuote] = useState(null);
    const [toast, setToast] = useState(null);

    const showToast = (msg, type = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    // Filtered list
    const filteredInvoices = activeFilter === "all"
        ? invoices
        : invoices.filter(inv => inv.status === activeFilter);

    const filterCount = (key) => key === "all"
        ? invoices.length
        : invoices.filter(inv => inv.status === key).length;

    const openDetail = (inv) => {
        setActiveInvoice(inv);
        setShowDetailDrawer(true);
        setShowEditPanel(false);
        setShowSendDrawer(false);
    };

    const closeAll = () => {
        setShowDetailDrawer(false);
        setShowSendDrawer(false);
        setShowEditPanel(false);
        setShowPdfModal(false);
        setActiveReceivedInvoice(null);
    };

    const handleFinalise = (inv) => {
        setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, status: "pending" } : i));
        setActiveInvoice(prev => ({ ...prev, status: "pending" }));
        showToast(`✓ Facture ${inv.number} finalisée !`);
    };

    const handleMarkPaid = (inv) => {
        setPaymentModalInvoice(inv);
    };

    const handleConfirmPayment = async (inv, paymentMethod) => {
        try {
            await apiFetch(`/v1/invoices/${inv.id}/mark-paid`, {
                method: 'POST',
                body: JSON.stringify({ paymentMethod })
            });
            showToast(`✓ Facture ${inv.number} encaissée par ${paymentMethod} !`);
            fetchInvoices();
        } catch (err) {
            console.error("Confirm payment API error:", err);
            alert(err.message || "Erreur lors du règlement");
        } finally {
            setPaymentModalInvoice(null);
        }
    };

    const handleMarkUnpaid = async (inv) => {
        try {
            await apiFetch(`/v1/invoices/${inv.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ status: "SENT" })
            });
            showToast(`Facture ${inv.number} marquée comme non payée.`, "info");
            fetchInvoices();
        } catch (err) {
            console.error("Mark unpaid error:", err);
        }
    };

    const handleSaveEdit = async (updatedInv) => {
        try {
            await apiFetch(`/v1/invoices/${updatedInv.id}`, {
                method: 'PATCH',
                body: JSON.stringify(updatedInv)
            });
            showToast(`✓ Facture ${updatedInv.number} modifiée.`);
            fetchInvoices();
        } catch (err) {
            console.error("Save invoice error:", err);
            alert(err.message || "Erreur lors de la modification");
        } finally {
            setShowEditPanel(false);
        }
    };

    const handleSelfSend = (inv) => {
        window.open(`mailto:${inv.clientEmail}?subject=Facture%20${inv.number}&body=Bonjour,%20veuillez%20trouver%20ci-joint%20votre%20facture.`);
        setShowSendDrawer(false);
        showToast(`Facture envoyée à ${inv.clientEmail}`);
    };

    const handleAutoSend = (inv) => {
        setShowSendDrawer(false);
        showToast(`✓ E-mail envoyé automatiquement à ${inv.clientEmail}`);
    };

    const handleCreateInvoice = async (newInv) => {
        try {
            await apiFetch('/v1/invoices', {
                method: 'POST',
                body: JSON.stringify({
                    clientId: newInv.clientId || newInv.client?.id,
                    clientName: newInv.clientName || newInv.client?.name,
                    clientEmail: newInv.clientEmail || newInv.client?.email,
                    clientAddress: newInv.clientAddress || newInv.client?.address,
                    subject: newInv.interventionType || newInv.subject || "Facture Prestation",
                    amountHT: newInv.subtotalHt || 100,
                    amountTTC: newInv.totalTtc || 120,
                    tvaRate: newInv.tvaRate || 20,
                    lines: newInv.lines || []
                })
            });
            showToast(`✓ Facture créée avec succès !`);
            fetchInvoices();
        } catch (err) {
            console.error("Create invoice API error:", err);
            alert(err.message || "Erreur lors de la création de la facture");
        } finally {
            setShowNewModal(false);
        }
    };

    const handleDownloadPdf = (inv) => {
        const content = `FACTURE — ${inv.number}\nClient: ${inv.clientName}\nMontant HT: ${inv.subtotalHt} €\nTVA: ${inv.tvaAmount} €\nTotal TTC: ${inv.totalTtc} €`;
        const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `Facture_${inv.number}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleUpdateInvoiceCustomization = (invId, customSettings) => {
        setInvoices(prev => prev.map(i => i.id === invId ? { ...i, customization: customSettings } : i));
        setActiveInvoice(prev => (prev && prev.id === invId ? { ...prev, customization: customSettings } : prev));
    };

    const handleSyncReceived = async () => {
        try {
            setLoadingReceived(true);
            await apiFetch("/v1/e-invoicing/reconciliation/run", { method: "POST" });
            await fetchReceivedInvoices();
            showToast("Factures fournisseurs synchronisées avec succès !");
        } catch (err) {
            showToast(err.message || "Erreur de synchronisation", "error");
        } finally {
            setLoadingReceived(false);
        }
    };

    return (
        <div className="home-page factures-page-wrapper">
            <SideBar onFabClick={() => setShowNewModal(true)} />
            <div className="main-content">
                <Header />
                <div className="page-content">

                    {/* Page Header */}
                    <div className="fp-page-header">
                        <div>
                            <h1 className="content-title">Factures & Facturation Électronique</h1>
                            <p className="content-subtitle">Gérez vos factures clients et réceptions fournisseurs (Réforme 2026/2027).</p>
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            {activeTabMode === "recues" ? (
                                <button
                                    className="fp-new-btn"
                                    onClick={handleSyncReceived}
                                    disabled={loadingReceived}
                                    style={{ backgroundColor: 'var(--card)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
                                >
                                    {loadingReceived ? <Loader2 size={16} className="spin-loader" /> : <RefreshCw size={16} />}
                                    Synchroniser Plateforme Agréée
                                </button>
                            ) : (
                                <button className="fp-new-btn" onClick={() => setShowNewModal(true)}>
                                    <Plus size={16} /> Nouvelle facture
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Top Mode Switcher: Factures émises vs Factures reçues */}
                    <div style={{
                        display: 'flex',
                        gap: '8px',
                        marginBottom: '20px',
                        padding: '4px',
                        backgroundColor: 'var(--card)',
                        borderRadius: '12px',
                        border: '1px solid var(--border)',
                        width: 'fit-content'
                    }}>
                        <button
                            type="button"
                            onClick={() => setActiveTabMode("emises")}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '8px',
                                border: 'none',
                                backgroundColor: activeTabMode === "emises" ? 'var(--sidebar-primary)' : 'transparent',
                                color: activeTabMode === "emises" ? '#fff' : 'var(--muted-foreground)',
                                fontWeight: 700,
                                fontSize: '13px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            <Send size={15} />
                            Factures émises (Clients)
                            <span style={{
                                padding: '1px 6px',
                                borderRadius: '10px',
                                backgroundColor: activeTabMode === "emises" ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.06)',
                                fontSize: '11px'
                            }}>
                                {invoices.length}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTabMode("recues")}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '8px',
                                border: 'none',
                                backgroundColor: activeTabMode === "recues" ? 'var(--sidebar-primary)' : 'transparent',
                                color: activeTabMode === "recues" ? '#fff' : 'var(--muted-foreground)',
                                fontWeight: 700,
                                fontSize: '13px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            <Inbox size={15} />
                            Factures reçues (Fournisseurs - 2026)
                            <span style={{
                                padding: '1px 6px',
                                borderRadius: '10px',
                                backgroundColor: activeTabMode === "recues" ? 'rgba(255,255,255,0.25)' : 'rgba(34,197,94,0.15)',
                                color: activeTabMode === "recues" ? '#fff' : '#16a34a',
                                fontSize: '11px',
                                fontWeight: 800
                            }}>
                                {receivedInvoices.length}
                            </span>
                        </button>
                    </div>

                    {activeTabMode === "recues" ? (
                        /* Section Factures Fournisseurs Reçues */
                        <div>
                            {receivedInvoices.length === 0 ? (
                                <div style={{ padding: '60px 20px', textAlign: 'center', backgroundColor: 'var(--card)', borderRadius: '14px', border: '1px solid var(--border)' }}>
                                    <Inbox size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '6px' }}>Aucune facture fournisseur reçue</h3>
                                    <p style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem', maxWidth: '420px', margin: '0 auto 16px auto' }}>
                                        Vos factures fournisseurs transmises via Plateforme Agréée (B2Brouter / PDP) apparaîtront automatiquement ici dès réception.
                                    </p>
                                    <button className="fp-new-btn" onClick={handleSyncReceived} style={{ margin: '0 auto' }}>
                                        <RefreshCw size={14} /> Synchroniser maintenant
                                    </button>
                                </div>
                            ) : (
                                <div className="fp-invoice-list">
                                    {receivedInvoices.map((rec) => (
                                        <div
                                            key={rec.id}
                                            className="fp-invoice-card"
                                            onClick={() => setActiveReceivedInvoice(rec)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <div className="fp-card-top-left">
                                                <span className="fp-card-number">{rec.invoiceNumber}</span>
                                            </div>
                                            <div className="fp-card-top-right">
                                                <span className="fp-card-amount">
                                                    {Number(rec.totalTTC || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €
                                                </span>
                                                <span className="fp-card-amount-label"> TTC</span>
                                            </div>

                                            <div className="fp-card-bottom-left">
                                                <span className="fp-card-date">
                                                    {new Date(rec.issueDate).toLocaleDateString("fr-FR")}
                                                </span>
                                                <span style={{ color: "var(--border)", userSelect: "none" }}>·</span>
                                                <span className="fp-card-client" style={{ fontWeight: 700 }}>
                                                    {rec.supplierName} {rec.supplierSiret ? `(${rec.supplierSiret.substring(0, 9)})` : ''}
                                                </span>
                                            </div>

                                            <div className="fp-card-bottom-right">
                                                <span style={{
                                                    padding: '3px 8px',
                                                    borderRadius: '6px',
                                                    fontSize: '11px',
                                                    fontWeight: 800,
                                                    backgroundColor: 'rgba(34, 197, 94, 0.12)',
                                                    color: '#16a34a'
                                                }}>
                                                    🟢 Reçue PA
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Section Factures Clients Émises */
                        <>
                            {/* Filter Tabs */}
                            <div className="fp-filter-bar">
                                {FILTERS.map(f => (
                                    <button
                                        key={f.key}
                                        className={`fp-filter-pill${activeFilter === f.key ? " active" : ""}`}
                                        onClick={(e) => {
                                            setActiveFilter(f.key);
                                            e.currentTarget.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
                                        }}
                                    >
                                        {f.label}
                                        <span className="fp-filter-count">{filterCount(f.key)}</span>
                                    </button>
                                ))}
                            </div>

                            {/* Invoices List */}
                            <InvoiceList
                                invoices={filteredInvoices}
                                onRowClick={openDetail}
                                onCreateFacture={() => setShowNewModal(true)}
                            />
                        </>
                    )}
                </div>
            </div>

            {/* Detail Drawer */}
            {showDetailDrawer && activeInvoice && (
                <InvoiceDetailDrawer
                    invoice={activeInvoice}
                    onClose={closeAll}
                    onPreview={() => { setShowDetailDrawer(false); setShowPdfModal(true); }}
                    onEdit={() => { setShowDetailDrawer(false); setShowEditPanel(true); }}
                    onSend={() => setShowSendDrawer(true)}
                    onFinalise={handleFinalise}
                    onMarkPaid={handleMarkPaid}
                    onMarkUnpaid={handleMarkUnpaid}
                    onOpenLinkedDevis={(quote) => setLinkedQuoteForDrawer(quote)}
                    onUpdateInvoiceCustomization={handleUpdateInvoiceCustomization}
                />
            )}

            {/* Linked Quote Drawer */}
            {linkedQuoteForDrawer && (
                <QuoteDetailDrawer
                    quote={linkedQuoteForDrawer}
                    onClose={() => setLinkedQuoteForDrawer(null)}
                    overlayStyle={{ zIndex: 1200 }}
                    onPreview={() => setPdfModalQuote(linkedQuoteForDrawer)}
                    onSend={() => setLinkedQuoteForDrawer(null)}
                    onConvertToInvoice={() => {}}
                    onChangeStatus={() => {}}
                    onEdit={() => {}}
                />
            )}

            {/* Edit Panel */}
            {showEditPanel && activeInvoice && (
                <InvoiceEditPanel
                    invoice={activeInvoice}
                    onClose={() => { setShowEditPanel(false); setShowDetailDrawer(true); }}
                    onSave={handleSaveEdit}
                    onFinalise={handleFinalise}
                />
            )}

            {/* Send Drawer */}
            {showSendDrawer && activeInvoice && (
                <InvoiceSendDrawer
                    invoice={activeInvoice}
                    onClose={() => setShowSendDrawer(false)}
                    onSelfSend={handleSelfSend}
                    onAutoSend={handleAutoSend}
                />
            )}

            {/* PDF Preview */}
            {showPdfModal && activeInvoice && (
                <InvoicePdfView
                    invoice={activeInvoice}
                    onClose={() => { setShowPdfModal(false); setShowDetailDrawer(true); }}
                    onDownload={handleDownloadPdf}
                />
            )}

            {pdfModalQuote && (
                <QuotePdfView
                    quote={pdfModalQuote}
                    onClose={() => setPdfModalQuote(null)}
                    onDownload={() => window.print()}
                />
            )}

            {/* New Invoice Modal */}
            {showNewModal && (
                <NewInvoiceModal
                    onClose={() => setShowNewModal(false)}
                    onCreateInvoice={handleCreateInvoice}
                    initialClient={location.state}
                />
            )}

            {/* Received Supplier Invoice Detail Drawer */}
            {activeReceivedInvoice && (
                <ReceivedInvoicesDrawer
                    invoice={activeReceivedInvoice}
                    onClose={() => setActiveReceivedInvoice(null)}
                    onRefresh={fetchReceivedInvoices}
                />
            )}

            {/* Payment Method Selector Modal */}
            {paymentModalInvoice && (
                <PaymentMethodModal
                    invoice={paymentModalInvoice}
                    onConfirm={handleConfirmPayment}
                    onClose={() => setPaymentModalInvoice(null)}
                />
            )}

            {/* Toast */}
            {toast && (
                <div className={`fp-toast fp-toast--${toast.type}`}>
                    {toast.type === "success" ? "✓" : "ℹ"} {toast.msg}
                </div>
            )}
        </div>
    );
}

export default FacturesPage;
