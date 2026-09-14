import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, CheckCircle2, AlertCircle, Info, RefreshCw, Loader2, FileText, Check, Trash2, Mail, ExternalLink } from "lucide-react";
import ToastNotification from "../components/ToastNotification";
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
import { getAuthToken } from "../utils/auth";
import { getApiUrl } from "../utils/config";
import { getEffectiveCustomization } from "../utils/documentCustomization";
import { getSocket } from "../utils/socket";

const FILTERS = [
    { key: "all", label: "Tous" },
    { key: "DRAFT", label: "Brouillon" },
    { key: "SENT", label: "En attente" },
    { key: "ACCEPTED", label: "Signé" },
    { key: "REFUSED", label: "Refusé" },
];

function DevisPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const [quotes, setQuotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [emailWarningModalOpen, setEmailWarningModalOpen] = useState(false);

    const mapQuoteFromApi = (q) => ({
        ...q,
        id: q.id,
        number: q.number || `D-2026-${String(q.id).padStart(4, "0")}`,
        client: q.client || {},
        clientName: q.client ? `${q.client.firstName || ''} ${q.client.lastName || q.client.companyName || ''}`.trim() : (q.clientName || 'Client Inconnu'),
        clientEmail: q.client?.email || q.clientEmail || '',
        clientPhone: q.client?.phone || q.clientPhone || '',
        clientAddress: q.client ? `${q.client.address || ''}${q.client.postalCode || q.client.city ? `, ${q.client.postalCode || ''} ${q.client.city || ''}` : ''}`.trim() : (q.clientAddress || ''),
        interventionType: q.subject || q.interventionType || "Prestation",
        workDetails: q.description || q.workDetails || "",
        date: q.createdAt ? new Date(q.createdAt).toISOString().split('T')[0] : (q.date || new Date().toISOString().split('T')[0]),
        validityDays: q.validityDays || 30,
        tvaRate: q.tvaRate !== undefined && q.tvaRate !== null ? Number(q.tvaRate) : 20,
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
            unitPrice: Number(l.unitPrice || 0),
            tvaRate: l.tvaRate !== undefined && l.tvaRate !== null ? Number(l.tvaRate) : (q.tvaRate !== undefined && q.tvaRate !== null ? Number(q.tvaRate) : 20),
            total: Number(l.total) || ((Number(l.unitPrice) || 0) * (Number(l.quantity || l.qty) || 1))
        }))
    });

    const fetchQuotes = async (isBackground = false) => {
        try {
            if (!isBackground) setLoading(true);
            const data = await apiFetch('/v1/quotes');
            const rawQuotes = data.data?.quotes || data.quotes || (Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []));
            const mapped = rawQuotes.map(mapQuoteFromApi);
            setQuotes(mapped);
            setActiveQuote(prev => {
                if (!prev) return null;
                const fresh = mapped.find(q => q.id === prev.id);
                return fresh ? { ...prev, ...fresh } : prev;
            });
        } catch (err) {
            console.warn("API quotes error:", err.message);
            if (!isBackground) setQuotes([]);
        } finally {
            if (!isBackground) setLoading(false);
        }
    };

    useEffect(() => {
        fetchQuotes();
    }, []);

    // Écoute temps réel WebSocket pour mise à jour instantanée sans rechargement de page
    useEffect(() => {
        const socket = getSocket();
        if (!socket) return;

        const handleRealtimeRefresh = () => {
            fetchQuotes(true);
        };

        socket.on("quote:updated", handleRealtimeRefresh);
        socket.on("quote:signed", handleRealtimeRefresh);
        socket.on("quote:new", handleRealtimeRefresh);
        socket.on("quote:deleted", handleRealtimeRefresh);
        socket.on("quote:paid", handleRealtimeRefresh);

        return () => {
            socket.off("quote:updated", handleRealtimeRefresh);
            socket.off("quote:signed", handleRealtimeRefresh);
            socket.off("quote:new", handleRealtimeRefresh);
            socket.off("quote:deleted", handleRealtimeRefresh);
            socket.off("quote:paid", handleRealtimeRefresh);
        };
    }, []);

    // Rafraîchissement automatique lorsque l'utilisateur revient sur l'onglet
    useEffect(() => {
        const handleFocus = () => {
            fetchQuotes(true);
        };
        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                fetchQuotes(true);
            }
        };

        window.addEventListener("focus", handleFocus);
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            window.removeEventListener("focus", handleFocus);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, []);

    const handleUpdateQuoteCustomization = async (qId, customSettings) => {
        if (typeof qId === "object" && !customSettings) {
            customSettings = qId;
            qId = activeQuote?.id;
        }
        setQuotes(prev => prev.map(q => q.id === qId ? { ...q, documentCustomization: customSettings, customization: customSettings } : q));
        setActiveQuote(prev => (prev && prev.id === qId ? { ...prev, documentCustomization: customSettings, customization: customSettings } : prev));
        try {
            if (qId) {
                await apiFetch(`/v1/quotes/${qId}`, {
                    method: "PUT",
                    body: JSON.stringify({ documentCustomization: customSettings, customization: customSettings })
                });
            }
            showToast("Personnalisation enregistrée.");
        } catch (err) {
            console.warn("Erreur sauvegarde personnalisation devis:", err);
        }
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
        const cleanMsg = typeof msg === 'string' ? msg.replace(/^[✓✔\s]+/, '') : msg;
        setToast({ msg: cleanMsg, type, id: Date.now() });
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
            const res = await apiFetch(`/v1/quotes/${updatedQuote.id}`, {
                method: 'PUT',
                body: JSON.stringify(updatedQuote)
            });
            const fresh = res.data?.quote || res.quote || updatedQuote;
            setQuotes(prev => prev.map(q => q.id === updatedQuote.id ? { ...q, ...fresh } : q));
            setActiveQuote(prev => (prev?.id === updatedQuote.id ? { ...prev, ...fresh } : prev));
            showToast(`Devis ${updatedQuote.number} mis à jour.`, "success");
            fetchQuotes();
        } catch (err) {
            console.error("Save quote error:", err);
            showToast(err.message || "Erreur lors de la mise à jour", "error");
        } finally {
            setShowEditPanel(false);
        }
    };

    const [confirmFactureQuote, setConfirmFactureQuote] = useState(null);
    const [quoteToDelete, setQuoteToDelete] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    const handleDeleteQuote = (q) => {
        if (!q) return;
        setQuoteToDelete(q);
    };

    const executeDeleteQuote = async (q) => {
        if (!q) return;
        setActionLoading(true);
        try {
            await apiFetch(`/v1/quotes/${q.id}`, {
                method: 'DELETE'
            });
            showToast(`Devis ${q.number} supprimé avec succès.`, "success");
            setQuotes(prev => prev.filter(item => item.id !== q.id));
            if (activeQuote?.id === q.id) {
                closeAll();
            }
            fetchQuotes();
        } catch (err) {
            console.error("Delete quote error:", err);
            showToast(err.message || "Erreur lors de la suppression du devis", "error");
        } finally {
            setActionLoading(false);
            setQuoteToDelete(null);
        }
    };

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
            showToast(`Devis ${q.number} converti en facture ! Retrouvez-la dans Factures.`, "success");
            fetchQuotes();
        } catch (err) {
            console.error("Convert quote to invoice error:", err);
            // Fallback status update
            try {
                await apiFetch(`/v1/quotes/${q.id}`, {
                    method: 'PUT',
                    body: JSON.stringify({ status: "ACCEPTED" })
                });
                showToast(`Devis ${q.number} marqué comme accepté.`, "success");
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
                body: JSON.stringify({ status: "SENT", emailSentAt: new Date().toISOString() })
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
        const customization = getEffectiveCustomization(q);
        try {
            await apiFetch(`/v1/quotes/${q.id}/send`, {
                method: 'POST',
                body: JSON.stringify({ 
                    email: targetEmail || q.clientEmail,
                    primaryColor: customization.primaryColor,
                    customization
                })
            });
            showToast(`Devis ${q.number} envoyé avec signature & PDF à ${emailToSend} !`, "success");
            fetchQuotes();
            setShowSendDrawer(false);
        } catch (err) {
            console.error("Auto send error:", err);
            setShowSendDrawer(false);
            if (err.data?.code === "EMAIL_NOT_CONFIGURED" || err.message?.includes("EMAIL_NOT_CONFIGURED") || err.message?.includes("connectée") || err.message?.includes("Paramètres")) {
                setEmailWarningModalOpen(true);
            } else {
                showToast(err.message || `Erreur lors de l'envoi du devis ${q.number}`, "error");
            }
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
                    clientPhone: newQuote.clientPhone || newQuote.client?.phone,
                    clientAddress: newQuote.clientAddress || newQuote.client?.address,
                    subject: newQuote.interventionType || newQuote.subject || "Devis Prestation",
                    amountHT: newQuote.subtotalHt || 0,
                    amountTTC: newQuote.totalTtc || 0,
                    tvaRate: newQuote.tvaRate !== undefined && newQuote.tvaRate !== null ? Number(newQuote.tvaRate) : 20,
                    lines: newQuote.lines || [],
                    status: newQuote.status || "DRAFT",
                    conditions: newQuote.paymentConditions || null,
                    notes: newQuote.internalNotes || null,
                    validUntil: newQuote.dueDate || null,
                    documentCustomization: newQuote.documentCustomization || newQuote.customization || globalCustomization,
                    customization: newQuote.documentCustomization || newQuote.customization || globalCustomization
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

    const handleDownloadPdf = async (q, customOverride = null) => {
        try {
            const token = getAuthToken();
            let endpointUrl = `/v1/quotes/${q.id}/pdf`;
            if (customOverride) {
                const cleanCustom = { ...customOverride };
                if (cleanCustom.logoUrl && cleanCustom.logoUrl.startsWith('data:')) delete cleanCustom.logoUrl;
                if (cleanCustom.signatureUrl && cleanCustom.signatureUrl.startsWith('data:')) delete cleanCustom.signatureUrl;
                const customParam = encodeURIComponent(JSON.stringify(cleanCustom));
                endpointUrl += `?customization=${customParam}`;
            }
            const res = await fetch(getApiUrl(endpointUrl), {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                credentials: 'include'
            });
            if (!res.ok) throw new Error("Erreur téléchargement PDF");
            const blob = await res.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = blobUrl;
            link.download = `Devis_${(q.number || 'devis').replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (err) {
            console.error("Erreur téléchargement PDF:", err);
        }
    };

    const handleDownloadInvoicePdf = async (inv, customOverride = null) => {
        try {
            const token = getAuthToken();
            const targetInv = inv || pdfModalInvoice;
            if (!targetInv?.id) {
                window.print();
                return;
            }
            let endpointUrl = `/v1/invoices/${targetInv.id}/pdf`;
            if (customOverride) {
                const cleanCustom = { ...customOverride };
                if (cleanCustom.logoUrl && cleanCustom.logoUrl.startsWith('data:')) delete cleanCustom.logoUrl;
                if (cleanCustom.signatureUrl && cleanCustom.signatureUrl.startsWith('data:')) delete cleanCustom.signatureUrl;
                const customParam = encodeURIComponent(JSON.stringify(cleanCustom));
                endpointUrl += `?customization=${customParam}`;
            }
            const res = await fetch(getApiUrl(endpointUrl), {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                credentials: 'include'
            });
            if (!res.ok) throw new Error("Erreur téléchargement PDF");
            const blob = await res.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = blobUrl;
            link.download = `Facture_${(targetInv.number || 'facture').replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (err) {
            console.error("Erreur téléchargement PDF facture:", err);
            window.print();
        }
    };

    const handleOpenLinkedInvoice = async (inv) => {
        setShowDetailDrawer(false);
        try {
            const res = await apiFetch(`/v1/invoices/${inv.id}`);
            const fullInv = res.data?.invoice || res.invoice || inv;
            if (!fullInv.linkedDevis && !fullInv.linkedQuote && activeQuote) {
                fullInv.linkedDevis = activeQuote;
                fullInv.linkedQuote = activeQuote;
            }
            setLinkedInvoiceForDrawer(fullInv);
        } catch (e) {
            const fallbackInv = { ...inv };
            if (!fallbackInv.linkedDevis && !fallbackInv.linkedQuote && activeQuote) {
                fallbackInv.linkedDevis = activeQuote;
                fallbackInv.linkedQuote = activeQuote;
            }
            setLinkedInvoiceForDrawer(fallbackInv);
        }
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
                        activeFilter={activeFilter}
                        onRowClick={openDetail}
                        onCreateQuote={() => setShowNewModal(true)}
                        onSend={(q) => { setActiveQuote(q); setShowSendDrawer(true); }}
                        onEdit={(q) => { setActiveQuote(q); setShowEditPanel(true); }}
                        onConvertToInvoice={handleConvertToInvoice}
                        onDownloadPdf={handleDownloadPdf}
                        onCustomise={(q) => { setActiveQuote(q); setShowDetailDrawer(true); }}
                        onRejectQuote={(q) => handleChangeStatus(q, "REFUSED")}
                        onDeleteQuote={handleDeleteQuote}
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
                    onDelete={handleDeleteQuote}
                    onOpenLinkedInvoice={handleOpenLinkedInvoice}
                    onUpdateQuoteCustomization={handleUpdateQuoteCustomization}
                />
            )}

            {/* Linked Invoice Drawer */}
            {linkedInvoiceForDrawer && (
                <InvoiceDetailDrawer
                    invoice={linkedInvoiceForDrawer}
                    onClose={() => {
                        setLinkedInvoiceForDrawer(null);
                        setShowDetailDrawer(true);
                    }}
                    overlayStyle={{ zIndex: 1200 }}
                    onPreview={() => setPdfModalInvoice(linkedInvoiceForDrawer)}
                    onEdit={() => {
                        setLinkedInvoiceForDrawer(null);
                        setShowDetailDrawer(true);
                    }}
                    onSend={() => {
                        setLinkedInvoiceForDrawer(null);
                        setShowDetailDrawer(true);
                    }}
                    onFinalise={() => { }}
                    onMarkPaid={() => { }}
                    onMarkUnpaid={() => { }}
                    onOpenLinkedDevis={(devis) => {
                        setLinkedInvoiceForDrawer(null);
                        setActiveQuote(devis?.id === activeQuote?.id ? activeQuote : (devis || activeQuote));
                        setShowDetailDrawer(true);
                    }}
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
                    onDownload={handleDownloadInvoicePdf}
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

                {/* Confirm Delete Quote Modal */}
                {quoteToDelete && (
                    <motion.div
                        className="modal-overlay"
                        style={{
                            position: 'fixed',
                            inset: 0,
                            backgroundColor: 'rgba(0, 0, 0, 0.45)',
                            backdropFilter: 'blur(4px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 10000,
                            padding: '16px'
                        }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setQuoteToDelete(null)}
                    >
                        <motion.div
                            className="modal-container"
                            style={{
                                backgroundColor: 'var(--card)',
                                borderRadius: '16px',
                                padding: '24px',
                                width: '100%',
                                maxWidth: '440px',
                                boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                                border: '1px solid var(--border)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '16px'
                            }}
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '10px',
                                    backgroundColor: 'rgba(239, 68, 68, 0.12)',
                                    color: '#ef4444',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                    <Trash2 size={20} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--foreground)' }}>
                                        Supprimer le devis ?
                                    </h3>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>
                                        {quoteToDelete.number} · {quoteToDelete.clientName}
                                    </span>
                                </div>
                            </div>

                            <div style={{
                                backgroundColor: 'var(--background)',
                                border: '1px solid var(--border)',
                                borderRadius: '10px',
                                padding: '12px 14px',
                                fontSize: '13px',
                                color: 'var(--muted-foreground)',
                                lineHeight: '1.45'
                            }}>
                                Êtes-vous sûr de vouloir supprimer définitivement ce devis ? Cette action est irréversible.
                            </div>

                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '6px' }}>
                                <button
                                    type="button"
                                    disabled={actionLoading}
                                    onClick={() => setQuoteToDelete(null)}
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
                                    onClick={() => executeDeleteQuote(quoteToDelete)}
                                    style={{
                                        flex: 1.2,
                                        padding: '11px 16px',
                                        borderRadius: '10px',
                                        border: 'none',
                                        backgroundColor: '#ef4444',
                                        color: '#ffffff',
                                        fontWeight: 700,
                                        fontSize: '13.5px',
                                        cursor: actionLoading ? 'not-allowed' : 'pointer',
                                        textAlign: 'center',
                                        boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    {actionLoading ? <Loader2 size={16} className="spin-loader" /> : <Trash2 size={16} />}
                                    Supprimer
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modal d'avertissement configuration email */}
            {emailWarningModalOpen && (
                <div 
                    onClick={() => setEmailWarningModalOpen(false)}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.65)',
                        backdropFilter: 'blur(5px)',
                        zIndex: 99999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '16px'
                    }}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            backgroundColor: 'var(--card, #FFFFFF)',
                            border: '1px solid var(--border, #E2E8F0)',
                            borderRadius: '16px',
                            padding: '24px',
                            maxWidth: '460px',
                            width: '100%',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '16px'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                                width: '42px',
                                height: '42px',
                                borderRadius: '12px',
                                backgroundColor: 'rgba(85, 107, 47, 0.12)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                <Mail size={22} style={{ color: '#556B2F' }} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--foreground)' }}>
                                    Adresse email non connectée
                                </h3>
                                <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: 'var(--muted-foreground)' }}>
                                    Configuration requise pour l'envoi
                                </p>
                            </div>
                        </div>

                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--foreground)', lineHeight: 1.5 }}>
                            Pour envoyer vos devis automatiquement depuis <strong>votre propre adresse professionnelle</strong> (Gmail / Google Workspace), vous devez d'abord la connecter dans vos Paramètres.
                        </p>

                        <div style={{
                            padding: '12px',
                            borderRadius: '10px',
                            backgroundColor: 'var(--muted, #F4F3EF)',
                            fontSize: '0.82rem',
                            color: 'var(--muted-foreground)',
                            lineHeight: 1.4
                        }}>
                            💡 Une fois connecté via Google, vos factures, devis et messages seront tous envoyés directement depuis votre adresse sans passer par un email tiers.
                        </div>

                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
                            <button
                                type="button"
                                onClick={() => setEmailWarningModalOpen(false)}
                                style={{
                                    padding: '10px 16px',
                                    borderRadius: '10px',
                                    border: '1px solid var(--border)',
                                    backgroundColor: 'transparent',
                                    color: 'var(--foreground)',
                                    fontWeight: 600,
                                    fontSize: '0.88rem',
                                    cursor: 'pointer'
                                }}
                            >
                                Plus tard
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setEmailWarningModalOpen(false);
                                    navigate('/settings?tab=communication');
                                }}
                                style={{
                                    padding: '10px 18px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    backgroundColor: '#556B2F',
                                    color: '#FFFFFF',
                                    fontWeight: 700,
                                    fontSize: '0.88rem',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    boxShadow: '0 4px 14px rgba(85, 107, 47, 0.35)'
                                }}
                            >
                                <span>Connecter mon compte Google</span>
                                <ExternalLink size={15} />
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Toast */}
            <ToastNotification toast={toast} onClose={() => setToast(null)} />
        </div>
    );
}

export default DevisPage;
