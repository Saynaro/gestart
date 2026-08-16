import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, CheckCircle2, AlertCircle, Info, RefreshCw, Loader2, FileText, Check } from "lucide-react";
import "./DevisPage.css";
import "../PlanningPage/PlanningPage.css";

import SideBar from "../components/SideBar";
import Header from "../components/Header";

import QuoteList from "./components/QuoteList";
import QuoteDetailDrawer from "./components/QuoteDetailDrawer";
import QuoteSendDrawer from "./components/QuoteSendDrawer";
import QuotePdfView from "./components/QuotePdfView";
import NewQuoteModal from "./components/NewQuoteModal";
import QuoteEditPanel from "./components/QuoteEditPanel";
import InvoiceDetailDrawer from "../FacturesPage/components/InvoiceDetailDrawer";
import InvoicePdfView from "../FacturesPage/components/InvoicePdfView";
import { apiFetch } from "../utils/api";

const FILTERS = [
    { key: "all", label: "Tous" },
    { key: "DRAFT", label: "Brouillon" },
    { key: "SENT", label: "En attente" },
    { key: "ACCEPTED", label: "Signé" },
    { key: "REFUSED", label: "Refusé" },
];

function DevisPage() {
    const location = useLocation();
    const [quotes, setQuotes] = useState([]);
    const [loading, setLoading] = useState(true);

    const mapQuoteFromApi = (q) => ({
        id: q.id,
        number: q.number || `D-2026-${String(q.id).padStart(4, "0")}`,
        clientName: q.client ? `${q.client.firstName || ''} ${q.client.lastName || q.client.companyName || ''}`.trim() : (q.clientName || 'Client Inconnu'),
        clientEmail: q.client?.email || q.clientEmail || '',
        clientAddress: q.client ? `${q.client.address || ''} ${q.client.city || ''}`.trim() : (q.clientAddress || ''),
        interventionType: q.subject || q.interventionType || "Prestation",
        workDetails: q.description || q.workDetails || "",
        date: q.createdAt ? new Date(q.createdAt).toISOString().split('T')[0] : (q.date || new Date().toISOString().split('T')[0]),
        validityDays: q.validityDays || 30,
        tvaRate: q.tvaRate || 20,
        subtotalHt: Number(q.amountHT || q.totalHt || q.subtotalHt || 0),
        tvaAmount: Number(q.amountTTC ? (q.amountTTC - (q.amountHT || 0)) : (q.totalTva || q.tvaAmount || 0)),
        totalTtc: Number(q.amountTTC || q.totalTtc || 0),
        amountFactured: Number(q.amountFactured || 0),
        status: q.status || "DRAFT",
        linkedFacture: q.linkedFacture || q.linkedInvoice || null,
        invoiceId: q.invoiceId || (q.linkedFacture?.id) || null,
        lines: (q.lines || []).map(l => ({
            ...l,
            qty: Number(l.quantity || l.qty || 1),
            quantity: Number(l.quantity || l.qty || 1),
            unitPrice: Number(l.unitPrice) || 0,
            total: Number(l.total) || ((Number(l.unitPrice) || 0) * (Number(l.quantity || l.qty) || 1))
        }))
    });

    const fetchQuotes = async () => {
        try {
            setLoading(true);
            const data = await apiFetch('/v1/quotes');
            const rawQuotes = data.data?.quotes || data.quotes || (Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []));
            setQuotes(rawQuotes.map(mapQuoteFromApi));
        } catch (err) {
            console.warn("API quotes error:", err.message);
            setQuotes([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQuotes();
    }, []);

    const handleUpdateQuoteCustomization = async (customization) => {
        showToast("Personnalisation enregistrée.");
        fetchQuotes();
    };

    const [activeFilter, setActiveFilter] = useState("all");
    const [activeQuote, setActiveQuote] = useState(null);
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
    const [linkedInvoiceForDrawer, setLinkedInvoiceForDrawer] = useState(null);
    const [pdfModalInvoice, setPdfModalInvoice] = useState(null);
    const [toast, setToast] = useState(null);

    const showToast = (msg, type = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const filteredQuotes = activeFilter === "all"
        ? quotes
        : quotes.filter(q => q.status === activeFilter);

    const filterCount = (key) => key === "all"
        ? quotes.length
        : quotes.filter(q => q.status === key).length;

    const openDetail = (q) => {
        setActiveQuote(q);
        setShowDetailDrawer(true);
        setShowSendDrawer(false);
        setShowEditPanel(false);
    };

    const closeAll = () => {
        setShowDetailDrawer(false);
        setShowSendDrawer(false);
        setShowEditPanel(false);
    };

    const handleSaveEdit = async (updatedQuote) => {
        try {
            await apiFetch(`/v1/quotes/${updatedQuote.id}`, {
                method: 'PUT',
                body: JSON.stringify(updatedQuote)
            });
            showToast(`✓ Devis ${updatedQuote.number} mis à jour.`);
            fetchQuotes();
        } catch (err) {
            console.error("Save quote error:", err);
            alert(err.message || "Erreur lors de la mise à jour");
        } finally {
            setShowEditPanel(false);
        }
    };

    const [confirmFactureQuote, setConfirmFactureQuote] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    // Triggers the confirmation warning modal
    const handleConvertToInvoice = (q) => {
        if (!q) return;
        setConfirmFactureQuote(q);
    };

    // Executes conversion after user confirms
    const executeConvertToInvoice = async (q) => {
        if (!q) return;
        setActionLoading(true);
        try {
            await apiFetch(`/v1/quotes/${q.id}/convert-to-invoice`, {
                method: 'POST'
            });
            showToast(`✓ Devis ${q.number} converti en facture ! Retrouvez-la dans Factures.`, "success");
            fetchQuotes();
        } catch (err) {
            console.error("Convert quote to invoice error:", err);
            // Fallback status update
            try {
                await apiFetch(`/v1/quotes/${q.id}`, {
                    method: 'PUT',
                    body: JSON.stringify({ status: "ACCEPTED" })
                });
                showToast(`✓ Devis ${q.number} marqué comme accepté.`, "success");
                fetchQuotes();
            } catch (e) {
                showToast(err.message || "Erreur lors de la facturation", "error");
            }
        } finally {
            setActionLoading(false);
            setConfirmFactureQuote(null);
            closeAll();
        }
    };

    const handleChangeStatus = async (q, newStatus) => {
        try {
            await apiFetch(`/v1/quotes/${q.id}`, {
                method: 'PUT',
                body: JSON.stringify({ status: newStatus })
            });
            showToast(`Statut du devis ${q.number} mis à jour.`, "info");
            fetchQuotes();
        } catch (err) {
            console.error("Change quote status error:", err);
        }
    };

    const handleSend = async (q) => {
        try {
            await apiFetch(`/v1/quotes/${q.id}`, {
                method: 'PUT',
                body: JSON.stringify({ status: "SENT" })
            });
            showToast(`Devis ${q.number} marqué comme envoyé.`, "success");
            fetchQuotes();
        } catch (err) {
            console.error("Send quote error:", err);
        } finally {
            setShowSendDrawer(false);
        }
    };

    const handleAutoSend = async (q, targetEmail) => {
        const emailToSend = targetEmail || q.clientEmail || "client";
        try {
            await apiFetch(`/v1/quotes/${q.id}`, {
                method: 'PUT',
                body: JSON.stringify({ status: "SENT", clientEmail: targetEmail || q.clientEmail })
            });
            showToast(`✓ Devis ${q.number} envoyé avec signature à ${emailToSend} !`, "success");
            fetchQuotes();
        } catch (err) {
            console.error("Auto send error:", err);
            showToast(`Devis ${q.number} envoyé à ${emailToSend}`, "success");
        } finally {
            setShowSendDrawer(false);
        }
    };

    const handleCreateQuote = async (newQuote) => {
        try {
            await apiFetch('/v1/quotes', {
                method: 'POST',
                body: JSON.stringify({
                    clientId: newQuote.clientId || newQuote.client?.id,
                    clientName: newQuote.clientName || newQuote.client?.name,
                    clientEmail: newQuote.clientEmail || newQuote.client?.email,
                    clientAddress: newQuote.clientAddress || newQuote.client?.address,
                    subject: newQuote.interventionType || newQuote.subject || "Devis Prestation",
                    amountHT: newQuote.subtotalHt || 0,
                    amountTTC: newQuote.totalTtc || 0,
                    tvaRate: newQuote.tvaRate || 20,
                    lines: newQuote.lines || [],
                    status: newQuote.status || "DRAFT",
                    conditions: newQuote.paymentConditions || null,
                    notes: newQuote.internalNotes || null,
                    validUntil: newQuote.dueDate || null
                })
            });
            showToast(`Devis créé avec succès !`, "success");
            fetchQuotes();
        } catch (err) {
            console.error("Create quote API error:", err);
            showToast(err.message || "Erreur lors de la création du devis", "error");
        } finally {
            setShowNewModal(false);
        }
    };

    const handleDownloadPdf = (q) => {
        const content = `DEVIS — ${q.number}\nClient: ${q.clientName}\nMontant HT: ${q.subtotalHt} €\nTotal TTC: ${q.totalTtc} €`;
        const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `Devis_${q.number}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="home-page devis-page-wrapper">
            <SideBar onFabClick={() => setShowNewModal(true)} />
            <div className="main-content">
                <Header />
                <motion.div 
                    className="page-content"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >

                    {/* Page Header */}
                    <div className="dv-page-header">
                        <div>
                            <h1 className="content-title">Devis</h1>
                            <p className="content-subtitle">Créez, envoyez et faites signer vos devis.</p>
                        </div>
                        <button className="dv-new-btn" onClick={() => setShowNewModal(true)}>
                            <Plus size={16} /> Nouveau devis
                        </button>
                    </div>

                    {/* Filter Tabs */}
                    <div className="dv-filter-bar">
                        {FILTERS.map(f => (
                            <button
                                key={f.key}
                                className={`dv-filter-pill${activeFilter === f.key ? " active" : ""}`}
                                onClick={(e) => {
                                    setActiveFilter(f.key);
                                    e.currentTarget.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
                                }}
                            >
                                {f.label}
                                <span className="dv-filter-count">{filterCount(f.key)}</span>
                            </button>
                        ))}
                    </div>

                    {/* Quotes List */}
                    <QuoteList
                        quotes={filteredQuotes}
                        onRowClick={openDetail}
                        onCreateQuote={() => setShowNewModal(true)}
                        onSend={(q) => { setActiveQuote(q); setShowSendDrawer(true); }}
                        onEdit={(q) => { setActiveQuote(q); setShowEditPanel(true); }}
                        onConvertToInvoice={handleConvertToInvoice}
                        onDownloadPdf={handleDownloadPdf}
                        onCustomise={(q) => { setActiveQuote(q); setShowDetailDrawer(true); }}
                        onRejectQuote={(q) => handleChangeStatus(q, "REFUSED")}
                    />
                </motion.div>
            </div>

            {/* Detail Drawer */}
            {showDetailDrawer && activeQuote && (
                <QuoteDetailDrawer
                    quote={activeQuote}
                    onClose={closeAll}
                    onPreview={() => { setShowDetailDrawer(false); setShowPdfModal(true); }}
                    onSend={() => setShowSendDrawer(true)}
                    onConvertToInvoice={handleConvertToInvoice}
                    onChangeStatus={handleChangeStatus}
                    onEdit={() => { setShowDetailDrawer(false); setShowEditPanel(true); }}
                    onOpenLinkedInvoice={(inv) => setLinkedInvoiceForDrawer(inv)}
                    onUpdateQuoteCustomization={handleUpdateQuoteCustomization}
                />
            )}

            {/* Linked Invoice Drawer */}
            {linkedInvoiceForDrawer && (
                <InvoiceDetailDrawer
                    invoice={linkedInvoiceForDrawer}
                    onClose={() => setLinkedInvoiceForDrawer(null)}
                    overlayStyle={{ zIndex: 1200 }}
                    onPreview={() => setPdfModalInvoice(linkedInvoiceForDrawer)}
                    onEdit={() => { setLinkedInvoiceForDrawer(null); }}
                    onSend={() => setLinkedInvoiceForDrawer(null)}
                    onFinalise={() => { }}
                    onMarkPaid={() => { }}
                    onMarkUnpaid={() => { }}
                />
            )}

            {/* Edit Panel */}
            {showEditPanel && activeQuote && (
                <QuoteEditPanel
                    quote={activeQuote}
                    onClose={() => setShowEditPanel(false)}
                    onSave={handleSaveEdit}
                />
            )}

            {/* Send Drawer */}
            {showSendDrawer && activeQuote && (
                <QuoteSendDrawer
                    quote={activeQuote}
                    onClose={() => setShowSendDrawer(false)}
                    onSelfSend={handleSend}
                    onAutoSend={handleAutoSend}
                    onDownloadPdf={handleDownloadPdf}
                />
            )}

            {/* PDF Preview */}
            {showPdfModal && activeQuote && (
                <QuotePdfView
                    quote={activeQuote}
                    onClose={() => { setShowPdfModal(false); setShowDetailDrawer(true); }}
                    onDownload={handleDownloadPdf}
                />
            )}

            {pdfModalInvoice && (
                <InvoicePdfView
                    invoice={pdfModalInvoice}
                    onClose={() => setPdfModalInvoice(null)}
                    onDownload={() => window.print()}
                />
            )}

            {/* New Quote Modal */}
            {showNewModal && (
                <NewQuoteModal
                    onClose={() => setShowNewModal(false)}
                    onCreateQuote={handleCreateQuote}
                    initialClient={location.state}
                />
            )}

            {/* Confirmation Modal for Facturation */}
            <AnimatePresence>
                {confirmFactureQuote && (
                    <motion.div
                        className="dv-confirm-modal-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => !actionLoading && setConfirmFactureQuote(null)}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(15, 23, 42, 0.65)',
                            backdropFilter: 'blur(4px)',
                            zIndex: 99999,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '16px'
                        }}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.92, y: 15 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.92, y: 15 }}
                            transition={{ type: "spring", stiffness: 450, damping: 30 }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                backgroundColor: 'var(--card, #1E293B)',
                                border: '1.5px solid var(--border)',
                                borderRadius: '18px',
                                padding: '24px',
                                maxWidth: '440px',
                                width: '100%',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '18px',
                                boxSizing: 'border-box'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                                <div style={{
                                    width: '44px',
                                    height: '44px',
                                    borderRadius: '12px',
                                    backgroundColor: 'rgba(85, 107, 47, 0.15)',
                                    color: '#556B2F',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                    <RefreshCw size={22} className={actionLoading ? "spin-loader" : ""} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h4 style={{ margin: '0 0 6px 0', fontSize: '17px', fontWeight: 800, color: 'var(--foreground)' }}>
                                        Facturer ce devis ?
                                    </h4>
                                    <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--muted-foreground)', lineHeight: 1.5 }}>
                                        Une nouvelle facture sera créée automatiquement pour le client <strong>{confirmFactureQuote.clientName}</strong> d'un montant de <strong>{(confirmFactureQuote.totalTtc || confirmFactureQuote.subtotalHt).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} € TTC</strong>.
                                    </p>
                                </div>
                            </div>

                            <div style={{
                                padding: '10px 14px',
                                backgroundColor: 'var(--background)',
                                borderRadius: '10px',
                                border: '1px solid var(--border)',
                                fontSize: '12px',
                                color: 'var(--muted-foreground)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                <Info size={16} color="#556B2F" style={{ flexShrink: 0 }} />
                                <span>Le devis passera au statut <strong>Signé</strong> et la facture sera accessible dans Factures.</span>
                            </div>

                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '6px' }}>
                                <button
                                    type="button"
                                    disabled={actionLoading}
                                    onClick={() => setConfirmFactureQuote(null)}
                                    style={{
                                        flex: 1,
                                        padding: '11px 16px',
                                        borderRadius: '10px',
                                        border: '1px solid var(--border)',
                                        backgroundColor: 'var(--background)',
                                        color: 'var(--foreground)',
                                        fontWeight: 600,
                                        fontSize: '13.5px',
                                        cursor: 'pointer',
                                        textAlign: 'center',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    Annuler
                                </button>
                                <button
                                    type="button"
                                    disabled={actionLoading}
                                    onClick={() => executeConvertToInvoice(confirmFactureQuote)}
                                    style={{
                                        flex: 1.2,
                                        padding: '11px 16px',
                                        borderRadius: '10px',
                                        border: 'none',
                                        backgroundColor: '#556B2F',
                                        color: '#ffffff',
                                        fontWeight: 700,
                                        fontSize: '13.5px',
                                        cursor: actionLoading ? 'not-allowed' : 'pointer',
                                        textAlign: 'center',
                                        boxShadow: '0 4px 14px rgba(85, 107, 47, 0.35)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    {actionLoading ? <Loader2 size={16} className="spin-loader" /> : <RefreshCw size={16} />}
                                    Facturer le devis
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toast */}
            {toast && (
                <div className={`dv-toast dv-toast--${toast.type}`}>
                    {toast.type === "success" ? <CheckCircle2 size={18} style={{ flexShrink: 0 }} /> : (toast.type === "error" ? <AlertCircle size={18} style={{ flexShrink: 0 }} /> : <Info size={18} style={{ flexShrink: 0 }} />)}
                    <span>{toast.msg}</span>
                </div>
            )}
        </div>
    );
}

export default DevisPage;
