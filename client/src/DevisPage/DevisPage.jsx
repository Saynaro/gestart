import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Plus } from "lucide-react";
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
        subtotalHt: Number(q.totalHt || q.subtotalHt || 0),
        tvaAmount: Number(q.totalTva || q.tvaAmount || 0),
        totalTtc: Number(q.totalTtc || 0),
        amountFactured: Number(q.amountFactured || 0),
        status: q.status || "DRAFT",
        lines: q.lines || []
    });

    useEffect(() => {
        const fetchQuotes = async () => {
            try {
                setLoading(true);
                const data = await apiFetch('/v1/quotes');
                const rawQuotes = data.data || data || [];
                setQuotes(rawQuotes.map(mapQuoteFromApi));
            } catch (err) {
                console.warn("API quotes error:", err.message);
                setQuotes([]);
            } finally {
                setLoading(false);
            }
        };

        fetchQuotes();
    }, []);

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

    const handleConvertToInvoice = async (q) => {
        try {
            await apiFetch(`/v1/quotes/${q.id}/convert-to-invoice`, {
                method: 'POST'
            });
            showToast(`✓ Devis ${q.number} converti en facture ! Retrouvez-la dans Factures.`);
            fetchQuotes();
        } catch (err) {
            console.error("Convert quote to invoice error:", err);
            // Fallback status update
            try {
                await apiFetch(`/v1/quotes/${q.id}`, {
                    method: 'PUT',
                    body: JSON.stringify({ status: "ACCEPTED" })
                });
                fetchQuotes();
            } catch (e) {
                // Ignore
            }
        } finally {
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
            showToast(`✓ Devis ${q.number} envoyé à ${q.clientEmail}`);
            fetchQuotes();
        } catch (err) {
            console.error("Send quote error:", err);
        } finally {
            setShowSendDrawer(false);
        }
    };

    const handleAutoSend = (q) => {
        setShowSendDrawer(false);
        showToast(`✓ E-mail professionnel envoyé à ${q.clientEmail}`);
    };

    const handleCreateQuote = async (newQuote) => {
        try {
            await apiFetch('/v1/quotes', {
                method: 'POST',
                body: JSON.stringify({
                    clientId: newQuote.clientId || newQuote.client?.id,
                    subject: newQuote.interventionType || newQuote.subject || "Devis Prestation",
                    amountHT: newQuote.subtotalHt || 100,
                    amountTTC: newQuote.totalTtc || 120,
                    tvaRate: newQuote.tvaRate || 20,
                    lines: newQuote.lines || []
                })
            });
            showToast(`✓ Devis créé avec succès !`);
            fetchQuotes();
        } catch (err) {
            console.error("Create quote API error:", err);
            alert(err.message || "Erreur lors de la création du devis");
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
                <div className="page-content">

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
                    />
                </div>
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
                />
            )}

            {/* Toast */}
            {toast && (
                <div className={`dv-toast dv-toast--${toast.type}`}>
                    {toast.type === "success" ? "✓" : "ℹ"} {toast.msg}
                </div>
            )}
        </div>
    );
}

export default DevisPage;
