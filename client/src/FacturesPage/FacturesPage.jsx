import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Inbox, Send, RefreshCw, Building, ShieldCheck, Loader2, CheckCircle2, AlertCircle, Info, AlertTriangle, Lock, Trash2 } from "lucide-react";
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
import { getAuthToken } from "../utils/auth";
import { getApiUrl } from "../utils/config";
import { getEffectiveCustomization } from "../utils/documentCustomization";

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
        ...inv,
        id: inv.id,
        number: inv.number || `F-2026-${String(inv.id).padStart(4, "0")}`,
        client: inv.client || {},
        clientName: inv.client ? `${inv.client.firstName || ''} ${inv.client.lastName || inv.client.companyName || ''}`.trim() : (inv.clientName || 'Client Inconnu'),
        clientEmail: inv.client?.email || inv.clientEmail || '',
        clientPhone: inv.client?.phone || inv.clientPhone || '',
        clientAddress: inv.client ? `${inv.client.address || ''}${inv.client.postalCode || inv.client.city ? `, ${inv.client.postalCode || ''} ${inv.client.city || ''}` : ''}`.trim() : (inv.clientAddress || ''),
        interventionType: inv.subject || inv.interventionType || "Prestation",
        workDetails: inv.description || inv.workDetails || "",
        date: inv.createdAt ? new Date(inv.createdAt).toISOString().split('T')[0] : (inv.date || new Date().toISOString().split('T')[0]),
        dueDate: inv.dueAt ? new Date(inv.dueAt).toISOString().split('T')[0] : (inv.dueDate || new Date().toISOString().split('T')[0]),
        paymentDelay: inv.paymentDelay || 30,
        tvaRate: inv.tvaRate !== undefined && inv.tvaRate !== null ? Number(inv.tvaRate) : 20,
        subtotalHt: Number(inv.amountHT || inv.totalHt || inv.subtotalHt || 0),
        tvaAmount: Number(inv.amountTTC ? (inv.amountTTC - (inv.amountHT || 0)) : (inv.totalTva || 0)),
        totalTtc: Number(inv.amountTTC || inv.totalTtc || 0),
        status: (inv.status || "draft").toLowerCase(),
        einvoicingStatus: inv.einvoicingStatus || "DRAFT",
        linkedDevis: inv.linkedDevis || inv.linkedQuote || null,
        sourceQuoteId: inv.sourceQuoteId || null,
        lines: (inv.lines || []).map(l => ({
            ...l,
            qty: Number(l.quantity || l.qty || 1),
            quantity: Number(l.quantity || l.qty || 1),
            unitPrice: Number(l.unitPrice || 0),
            tvaRate: l.tvaRate !== undefined && l.tvaRate !== null ? Number(l.tvaRate) : (inv.tvaRate !== undefined && inv.tvaRate !== null ? Number(inv.tvaRate) : 20),
            total: Number(l.total) || ((Number(l.unitPrice) || 0) * (Number(l.quantity || l.qty) || 1))
        }))
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
    const [invoiceToFinalise, setInvoiceToFinalise] = useState(null);
    const [invoiceToDelete, setInvoiceToDelete] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [linkedQuoteForDrawer, setLinkedQuoteForDrawer] = useState(null);
    const [pdfModalQuote, setPdfModalQuote] = useState(null);
    const [toast, setToast] = useState(null);
    const showToast = (msg, type = "success") => {
        const cleanMsg = typeof msg === 'string' ? msg.replace(/^[✓✔\s]+/, '') : msg;
        setToast({ msg: cleanMsg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const handleDeleteInvoice = (inv) => {
        if (!inv) return;
        setInvoiceToDelete(inv);
    };

    const executeDeleteInvoice = async (inv) => {
        if (!inv) return;
        setActionLoading(true);
        try {
            await apiFetch(`/v1/invoices/${inv.id}`, {
                method: 'DELETE'
            });
            showToast(`Facture ${inv.number} supprimée avec succès.`, "success");
            setInvoices(prev => prev.filter(item => item.id !== inv.id));
            if (activeInvoice?.id === inv.id) {
                closeAll();
            }
            fetchInvoices();
        } catch (err) {
            console.error("Delete invoice error:", err);
            showToast(err.message || "Erreur lors de la suppression de la facture", "error");
        } finally {
            setActionLoading(false);
            setInvoiceToDelete(null);
        }
    };

    // Filtered list
    const filteredInvoices = activeFilter === "all"
        ? invoices
        : invoices.filter(inv => {
            const s = (inv.status || "").toLowerCase();
            if (activeFilter === "pending") return s === "sent" || s === "pending";
            return s === activeFilter.toLowerCase();
        });

    const filterCount = (key) => key === "all"
        ? invoices.length
        : invoices.filter(inv => {
            const s = (inv.status || "").toLowerCase();
            if (key === "pending") return s === "sent" || s === "pending";
            return s === key.toLowerCase();
        }).length;

    const openDetail = (inv) => {
        setActiveInvoice(inv);
        setShowDetailDrawer(true);
        setShowSendDrawer(false);
        setShowEditPanel(false);
    };

    const closeAll = () => {
        setShowDetailDrawer(false);
        setShowSendDrawer(false);
        setShowEditPanel(false);
    };

    const handleFinalise = (inv) => {
        if (!inv) return;
        setInvoiceToFinalise(inv);
    };

    const executeFinaliseInvoice = async (inv) => {
        if (!inv) return;
        try {
            await apiFetch(`/v1/invoices/${inv.id}`, {
                method: 'PUT',
                body: JSON.stringify({ status: "SENT" })
            });
            setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, status: "SENT" } : i));
            setActiveInvoice(prev => (prev?.id === inv.id ? { ...prev, status: "SENT" } : prev));
            showToast(`Facture ${inv.number} finalisée avec succès !`, "success");
            fetchInvoices();
        } catch (err) {
            console.error("Finalise invoice error:", err);
            showToast(err.message || "Erreur lors de la finalisation de la facture", "error");
        } finally {
            setInvoiceToFinalise(null);
        }
    };

    const handleConfirmFinalise = async () => {
        if (!invoiceToFinalise) return;
        await executeFinaliseInvoice(invoiceToFinalise);
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
            showToast(`Facture ${inv.number} encaissée par ${paymentMethod} !`);
            fetchInvoices();
        } catch (err) {
            console.error("Confirm payment API error:", err);
            showToast(err.message || "Erreur lors du règlement", "error");
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
            const res = await apiFetch(`/v1/invoices/${updatedInv.id}`, {
                method: 'PUT',
                body: JSON.stringify(updatedInv)
            });
            const fresh = res.data?.invoice || res.invoice || updatedInv;
            setInvoices(prev => prev.map(i => i.id === updatedInv.id ? { ...i, ...fresh } : i));
            setActiveInvoice(prev => (prev?.id === updatedInv.id ? { ...prev, ...fresh } : prev));
            showToast(`Facture ${updatedInv.number} modifiée.`, "success");
            fetchInvoices();
        } catch (err) {
            console.error("Save invoice error:", err);
            showToast(err.message || "Erreur lors de la modification", "error");
        } finally {
            setShowEditPanel(false);
        }
    };

    const handleSelfSend = async (inv) => {
        try {
            await apiFetch(`/v1/invoices/${inv.id}`, {
                method: 'PUT',
                body: JSON.stringify({ status: "SENT", emailSentAt: new Date().toISOString() })
            });
            showToast(`Facture ${inv.number} marquée comme envoyée.`, "success");
            fetchInvoices();
        } catch (err) {
            console.error("Self send invoice error:", err);
        } finally {
            setShowSendDrawer(false);
        }
    };

    const handleAutoSend = async (inv, targetEmail) => {
        const emailToSend = targetEmail || inv.clientEmail || "client";
        const customization = getEffectiveCustomization(inv);
        try {
            await apiFetch(`/v1/invoices/${inv.id}/send`, {
                method: 'POST',
                body: JSON.stringify({ 
                    recipientEmail: targetEmail || inv.clientEmail,
                    primaryColor: customization.primaryColor,
                    customization
                })
            });
            showToast(`Facture ${inv.number} envoyée avec PDF à ${emailToSend} !`, "success");
            fetchInvoices();
        } catch (err) {
            console.error("Auto send invoice error:", err);
            await apiFetch(`/v1/invoices/${inv.id}`, {
                method: 'PUT',
                body: JSON.stringify({ status: "SENT", emailSentAt: new Date().toISOString(), clientEmail: targetEmail || inv.clientEmail })
            });
            showToast(`Facture ${inv.number} envoyée à ${emailToSend}`, "success");
            fetchInvoices();
        } finally {
            setShowSendDrawer(false);
        }
    };

    const handleCreateInvoice = async (newInv) => {
        try {
            await apiFetch('/v1/invoices', {
                method: 'POST',
                body: JSON.stringify({
                    clientId: newInv.clientId || newInv.client?.id,
                    clientName: newInv.clientName || newInv.client?.name,
                    clientEmail: newInv.clientEmail || newInv.client?.email,
                    clientPhone: newInv.clientPhone || newInv.client?.phone,
                    clientAddress: newInv.clientAddress || newInv.client?.address,
                    subject: newInv.interventionType || newInv.subject || "Facture Prestation",
                    amountHT: newInv.subtotalHt || 0,
                    amountTTC: newInv.totalTtc || 0,
                    tvaRate: newInv.tvaRate !== undefined && newInv.tvaRate !== null ? Number(newInv.tvaRate) : 20,
                    status: newInv.status || "DRAFT",
                    conditions: newInv.paymentConditions || null,
                    notes: newInv.internalNotes || null,
                    dueAt: newInv.dueDate || null,
                    documentCustomization: newInv.documentCustomization || newInv.customization || globalCustomization,
                    customization: newInv.documentCustomization || newInv.customization || globalCustomization,
                    lines: newInv.lines || []
                })
            });
            showToast(`Facture créée avec succès !`, "success");
            fetchInvoices();
        } catch (err) {
            console.error("Create invoice API error:", err);
            showToast(err.message || "Erreur lors de la création de la facture", "error");
        } finally {
            setShowNewModal(false);
        }
    };

    const handleDownloadPdf = async (inv, customOverride = null) => {
        try {
            const token = getAuthToken();
            let endpointUrl = `/v1/invoices/${inv.id}/pdf`;
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
            link.download = `Facture_${(inv.number || 'facture').replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (err) {
            console.error("Erreur téléchargement PDF:", err);
        }
    };


    const handleUpdateInvoiceCustomization = async (invId, customSettings) => {
        setInvoices(prev => prev.map(i => i.id === invId ? { ...i, documentCustomization: customSettings, customization: customSettings } : i));
        setActiveInvoice(prev => (prev && prev.id === invId ? { ...prev, documentCustomization: customSettings, customization: customSettings } : prev));
        try {
            await apiFetch(`/v1/invoices/${invId}`, {
                method: "PUT",
                body: JSON.stringify({ documentCustomization: customSettings, customization: customSettings })
            });
            showToast("Personnalisation enregistrée.");
        } catch (err) {
            console.warn("Erreur sauvegarde personnalisation facture:", err);
        }
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

    const handleOpenLinkedDevis = async (quote) => {
        setShowDetailDrawer(false);
        try {
            const res = await apiFetch(`/v1/quotes/${quote.id}`);
            const fullQuote = res.data?.quote || res.quote || quote;
            if (!fullQuote.linkedFacture && !fullQuote.linkedInvoice && activeInvoice) {
                fullQuote.linkedFacture = activeInvoice;
                fullQuote.linkedInvoice = activeInvoice;
            }
            setLinkedQuoteForDrawer(fullQuote);
        } catch (e) {
            const fallbackQuote = { ...quote };
            if (!fallbackQuote.linkedFacture && !fallbackQuote.linkedInvoice && activeInvoice) {
                fallbackQuote.linkedFacture = activeInvoice;
                fallbackQuote.linkedInvoice = activeInvoice;
            }
            setLinkedQuoteForDrawer(fallbackQuote);
        }
    };

    return (
        <div className="home-page factures-page-wrapper">
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
                                    <Building size={40} style={{ margin: '0 auto 12px auto', color: 'var(--muted-foreground)', opacity: 0.5 }} />
                                    <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--foreground)' }}>Aucune facture fournisseur reçue</h3>
                                    <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', maxWidth: '400px', margin: '0 auto' }}>
                                        Vos factures d'achat fournisseurs acheminées via la Plateforme Agréée apparaîtront ici automatiquement dès réception.
                                    </p>
                                </div>
                            ) : (
                                <div className="fp-table-wrapper">
                                    <table className="fp-table">
                                        <thead>
                                            <tr>
                                                <th>Numéro</th>
                                                <th>Fournisseur</th>
                                                <th>Date réception</th>
                                                <th>Montant TTC</th>
                                                <th>Statut PDP</th>
                                                <th>Statut Paiement</th>
                                                <th>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {receivedInvoices.map((inv) => (
                                                <tr key={inv.id} style={{ cursor: "pointer" }} onClick={() => setSelectedReceivedInvoice(inv)}>
                                                    <td style={{ fontWeight: 700 }}>{inv.number}</td>
                                                    <td>{inv.supplierName}</td>
                                                    <td>{new Date(inv.issueDate).toLocaleDateString("fr-FR")}</td>
                                                    <td style={{ fontWeight: 800 }}>{Number(inv.amountTTC).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</td>
                                                    <td>
                                                        <span style={{
                                                            fontSize: "11px",
                                                            fontWeight: 700,
                                                            padding: "3px 8px",
                                                            borderRadius: "6px",
                                                            backgroundColor: inv.status === "PAID" ? "rgba(34, 197, 94, 0.15)" : inv.status === "ACCEPTED" ? "rgba(59, 130, 246, 0.15)" : "rgba(234, 179, 8, 0.15)",
                                                            color: inv.status === "PAID" ? "#16a34a" : inv.status === "ACCEPTED" ? "#2563eb" : "#ca8a04"
                                                        }}>
                                                            {inv.status === "PAID" ? "Payée" : inv.status === "ACCEPTED" ? "Acceptée" : inv.status}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span style={{
                                                            fontSize: "11px",
                                                            fontWeight: 700,
                                                            padding: "3px 8px",
                                                            borderRadius: "6px",
                                                            backgroundColor: inv.paymentStatus === "PAID" ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)",
                                                            color: inv.paymentStatus === "PAID" ? "#16a34a" : "#dc2626"
                                                        }}>
                                                            {inv.paymentStatus === "PAID" ? "Réglée" : "À payer"}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedReceivedInvoice(inv);
                                                            }}
                                                            style={{
                                                                padding: "4px 10px",
                                                                borderRadius: "6px",
                                                                border: "1px solid var(--border)",
                                                                backgroundColor: "var(--card)",
                                                                fontSize: "12px",
                                                                fontWeight: 600,
                                                                cursor: "pointer"
                                                            }}
                                                        >
                                                            Détails Factur-X
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Section Factures Émises (Comportement habituel) */
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
                                activeFilter={activeFilter}
                                onRowClick={openDetail}
                                onCreateFacture={() => setShowNewModal(true)}
                                onSend={(inv) => { setActiveInvoice(inv); setShowSendDrawer(true); }}
                                onEdit={(inv) => { setActiveInvoice(inv); setShowEditPanel(true); }}
                                onMarkPaid={(inv) => setPaymentModalInvoice(inv)}
                                onDownloadPdf={handleDownloadPdf}
                                onCustomise={(inv) => { setActiveInvoice(inv); setShowDetailDrawer(true); }}
                                onDeleteInvoice={handleDeleteInvoice}
                            />
                        </>
                    )}
                </motion.div>
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
                    onDelete={handleDeleteInvoice}
                    onOpenLinkedDevis={handleOpenLinkedDevis}
                    onUpdateInvoiceCustomization={handleUpdateInvoiceCustomization}
                />
            )}

            {/* Linked Quote Drawer */}
            {linkedQuoteForDrawer && (
                <QuoteDetailDrawer
                    quote={linkedQuoteForDrawer}
                    onClose={() => {
                        setLinkedQuoteForDrawer(null);
                        setShowDetailDrawer(true);
                    }}
                    overlayStyle={{ zIndex: 1200 }}
                    onPreview={() => setPdfModalQuote(linkedQuoteForDrawer)}
                    onSend={() => {
                        setLinkedQuoteForDrawer(null);
                        setShowDetailDrawer(true);
                    }}
                    onConvertToInvoice={() => {}}
                    onChangeStatus={() => {}}
                    onEdit={() => {}}
                    onOpenLinkedInvoice={(inv) => {
                        setLinkedQuoteForDrawer(null);
                        setActiveInvoice(inv?.id === activeInvoice?.id ? activeInvoice : (inv || activeInvoice));
                        setShowDetailDrawer(true);
                    }}
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
                    onDownloadPdf={handleDownloadPdf}
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

            {/* Finalise Confirmation Modal */}
            {invoiceToFinalise && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 13000,
                        backgroundColor: "rgba(0, 0, 0, 0.65)",
                        backdropFilter: "blur(4px)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "16px"
                    }}
                    onClick={() => setInvoiceToFinalise(null)}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{
                            backgroundColor: "var(--card, #FFFFFF)",
                            color: "var(--foreground, #111)",
                            borderRadius: "18px",
                            padding: "24px 28px",
                            maxWidth: "460px",
                            width: "100%",
                            boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
                            border: "1px solid var(--border)",
                            position: "relative"
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
                            <div style={{
                                width: "42px",
                                height: "42px",
                                borderRadius: "12px",
                                backgroundColor: "rgba(234, 179, 8, 0.15)",
                                color: "#ca8a04",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0
                            }}>
                                <AlertTriangle size={22} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800 }}>Finaliser la facture {invoiceToFinalise.number} ?</h3>
                                <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "var(--muted-foreground)" }}>Action comptable définitive</p>
                            </div>
                        </div>

                        <div style={{
                            backgroundColor: "var(--muted, #f8f9fa)",
                            borderRadius: "12px",
                            padding: "12px 14px",
                            fontSize: "0.88rem",
                            lineHeight: 1.45,
                            color: "var(--foreground)",
                            marginBottom: "20px",
                            border: "1px solid var(--border)"
                        }}>
                            <div style={{ fontWeight: 700, color: "#b45309", marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                                <Lock size={14} /> Attention : Modification impossible après finalisation
                            </div>
                            Conformément aux normes comptables et fiscales (loi anti-fraude TVA), une facture finalisée devient <strong>définitive</strong>. Vous ne pourrez plus modifier le client, les articles, ni les montants.
                        </div>

                        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                            <button
                                onClick={() => setInvoiceToFinalise(null)}
                                style={{
                                    padding: "10px 16px",
                                    borderRadius: "10px",
                                    border: "1px solid var(--border)",
                                    background: "transparent",
                                    color: "var(--foreground)",
                                    fontSize: "0.9rem",
                                    fontWeight: 600,
                                    cursor: "pointer"
                                }}
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleConfirmFinalise}
                                style={{
                                    padding: "10px 20px",
                                    borderRadius: "10px",
                                    border: "none",
                                    background: "var(--sidebar-primary, #556B2F)",
                                    color: "#FFFFFF",
                                    fontSize: "0.9rem",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px"
                                }}
                            >
                                ✓ Confirmer la finalisation
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Confirm Delete Invoice Modal */}
            {invoiceToDelete && (
                <div
                    className="modal-overlay"
                    style={{
                        position: "fixed",
                        inset: 0,
                        backgroundColor: "rgba(0, 0, 0, 0.5)",
                        backdropFilter: "blur(4px)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 10000,
                        padding: "16px"
                    }}
                    onClick={() => setInvoiceToDelete(null)}
                >
                    <motion.div
                        className="modal-container"
                        style={{
                            backgroundColor: "var(--card)",
                            borderRadius: "16px",
                            padding: "24px",
                            width: "100%",
                            maxWidth: "460px",
                            boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
                            border: "1px solid var(--border)",
                            display: "flex",
                            flexDirection: "column",
                            gap: "16px"
                        }}
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <div style={{
                                width: "42px",
                                height: "42px",
                                borderRadius: "12px",
                                backgroundColor: "rgba(239, 68, 68, 0.12)",
                                color: "#ef4444",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0
                            }}>
                                <Trash2 size={20} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800 }}>Supprimer la facture ?</h3>
                                <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "var(--muted-foreground)" }}>
                                    {invoiceToDelete.number} · {invoiceToDelete.clientName}
                                </p>
                            </div>
                        </div>

                        {(invoiceToDelete.status || "").toLowerCase() === "draft" ? (
                            <div style={{
                                backgroundColor: "var(--muted, #f8f9fa)",
                                borderRadius: "12px",
                                padding: "12px 14px",
                                fontSize: "0.88rem",
                                lineHeight: 1.45,
                                color: "var(--foreground)",
                                border: "1px solid var(--border)"
                            }}>
                                Êtes-vous sûr de vouloir supprimer définitivement ce brouillon de facture ? Cette action est irréversible.
                            </div>
                        ) : (
                            <div style={{
                                backgroundColor: "rgba(239, 68, 68, 0.08)",
                                borderRadius: "12px",
                                padding: "12px 14px",
                                fontSize: "0.88rem",
                                lineHeight: 1.45,
                                color: "#b91c1c",
                                border: "1px solid rgba(239, 68, 68, 0.2)"
                            }}>
                                <strong>Information légale :</strong> Conformément à la législation française (loi anti-fraude TVA), une facture émise ou finalisée ne peut pas être supprimée. Seuls les brouillons peuvent être supprimés.
                            </div>
                        )}

                        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", paddingTop: "4px" }}>
                            <button
                                disabled={actionLoading}
                                onClick={() => setInvoiceToDelete(null)}
                                style={{
                                    padding: "10px 16px",
                                    borderRadius: "10px",
                                    border: "1px solid var(--border)",
                                    background: "transparent",
                                    color: "var(--foreground)",
                                    fontSize: "0.9rem",
                                    fontWeight: 600,
                                    cursor: "pointer"
                                }}
                            >
                                Annuler
                            </button>
                            {(invoiceToDelete.status || "").toLowerCase() === "draft" && (
                                <button
                                    disabled={actionLoading}
                                    onClick={() => executeDeleteInvoice(invoiceToDelete)}
                                    style={{
                                        padding: "10px 20px",
                                        borderRadius: "10px",
                                        border: "none",
                                        background: "#ef4444",
                                        color: "#FFFFFF",
                                        fontSize: "0.9rem",
                                        fontWeight: 700,
                                        cursor: actionLoading ? "not-allowed" : "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        boxShadow: "0 4px 14px rgba(239, 68, 68, 0.35)"
                                    }}
                                >
                                    {actionLoading ? <Loader2 size={16} className="spin-loader" /> : <Trash2 size={16} />}
                                    Supprimer
                                </button>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div className={`fp-toast fp-toast--${toast.type}`}>
                    {toast.type === "success" ? <CheckCircle2 size={18} style={{ flexShrink: 0 }} /> : (toast.type === "error" ? <AlertCircle size={18} style={{ flexShrink: 0 }} /> : <Info size={18} style={{ flexShrink: 0 }} />)}
                    <span>{toast.msg}</span>
                </div>
            )}
        </div>
    );
}

export default FacturesPage;
