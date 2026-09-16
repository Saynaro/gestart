import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import ToastNotification from "../components/ToastNotification";
import "./PaymentsPage.css";

// Layout components
import SideBar from "../components/SideBar";
import Header from "../components/Header";
import PullToRefresh from "../components/PullToRefresh";

// Icons
import {
    CreditCard,
    Landmark,
    CheckCircle2,
    Clock,
    AlertCircle,
    Info,
    ArrowUpRight,
    Search,
    RefreshCw,
    Calendar,
    ArrowLeft,
    Check,
    X,
    Filter,
    FileText,
    TrendingUp,
    ShieldCheck,
    Loader2
} from "lucide-react";
import { apiFetch } from "../utils/api";
import { getAuthToken } from "../utils/auth";
import { getApiUrl } from "../utils/config";
import InvoicePdfView from "../FacturesPage/components/InvoicePdfView";

export default function PaymentsPage() {
    const navigate = useNavigate();

    // Toast state
    const [toast, setToast] = useState(null);

    const showToast = (msg, type = "success") => {
        setToast({ msg, type, id: Date.now() });
    };

    // Data States
    const [payments, setPayments] = useState([]);
    const [kpis, setKpis] = useState({
        totalReceived: 0,
        totalPending: 0,
        thisMonthReceived: 0
    });
    const [pendingReconciliations, setPendingReconciliations] = useState([]);

    // Filter and UI States
    const [activeFilter, setActiveFilter] = useState("all"); // 'all' | 'virements' | 'carte' | 'reconciled' | 'review'
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [actionLoading, setActionLoading] = useState(null); // transactionId when confirming
    const [isMobile, setIsMobile] = useState(false);
    const [visibleCount, setVisibleCount] = useState(10);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [loadingInvoiceId, setLoadingInvoiceId] = useState(null);
    const searchInputRef = useRef(null);

    // Modal association state
    const [associatingTx, setAssociatingTx] = useState(null);
    const [openInvoicesList, setOpenInvoicesList] = useState([]);
    const [loadingOpenInvoices, setLoadingOpenInvoices] = useState(false);
    const [invoiceSearchQuery, setInvoiceSearchQuery] = useState("");

    // Open association modal
    const handleOpenAssociateModal = async (tx) => {
        setAssociatingTx(tx);
        setInvoiceSearchQuery("");
        setLoadingOpenInvoices(true);
        try {
            const res = await apiFetch("/v1/banking/open-invoices");
            setOpenInvoicesList(res.data?.invoices || []);
        } catch (err) {
            console.error("Erreur chargement factures ouvertes:", err);
        } finally {
            setLoadingOpenInvoices(false);
        }
    };

    const handleConfirmAssociate = async (invoiceId) => {
        if (!associatingTx || !invoiceId) return;
        const txId = associatingTx.id;
        setAssociatingTx(null);
        await handleConfirmReconciliation(txId, invoiceId, "Facture associée avec succès au virement !");
    };

    // Open invoice preview modal
    const handleOpenInvoice = async (invoiceId) => {
        if (!invoiceId) return;
        try {
            setLoadingInvoiceId(invoiceId);
            const res = await apiFetch(`/v1/invoices/${invoiceId}`);
            const inv = res.data?.invoice || res.data || res;
            if (inv) {
                setSelectedInvoice(inv);
                setShowInvoiceModal(true);
            }
        } catch (err) {
            console.error("Erreur chargement facture:", err);
        } finally {
            setLoadingInvoiceId(null);
        }
    };

    // Téléchargement du PDF de la facture
    const handleDownloadPdf = async (inv, customOverride = null) => {
        try {
            const token = getAuthToken();
            const targetInv = inv || selectedInvoice;
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
            showToast("Facture PDF téléchargée avec succès !");
        } catch (err) {
            console.error("Erreur téléchargement PDF facture:", err);
            showToast("Erreur lors du téléchargement du PDF", "error");
        }
    };

    // Responsive screen detection
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Load payments data from backend
    const loadPaymentsData = async (filterParam = activeFilter) => {
        try {
            const queryParams = new URLSearchParams();
            if (filterParam && filterParam !== "all" && filterParam !== "review") {
                queryParams.set("filter", filterParam);
            }
            if (searchQuery.trim()) {
                queryParams.set("search", searchQuery.trim());
            }

            const res = await apiFetch(`/v1/payments?${queryParams.toString()}`);
            if (res.data) {
                setPayments(res.data.payments || []);
                setKpis(res.data.kpis || { totalReceived: 0, totalPending: 0, thisMonthReceived: 0 });
                setPendingReconciliations(res.data.pendingReconciliations || []);
            }
        } catch (err) {
            console.error("Erreur chargement paiements:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadPaymentsData(activeFilter);
    }, [activeFilter]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        loadPaymentsData(activeFilter);
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            await apiFetch("/v1/banking/transactions/refresh", { method: "POST" });
        } catch (err) {
            console.warn("Banking refresh:", err.message);
        }
        await loadPaymentsData(activeFilter);
    };

    // Confirmer le rapprochement bancaire
    const handleConfirmReconciliation = async (transactionId, invoiceId, customMsg = null) => {
        setActionLoading(transactionId);
        try {
            const res = await apiFetch(`/v1/banking/reconcile/${transactionId}`, {
                method: "POST",
                body: JSON.stringify({ invoiceId })
            });
            // Recharger les données
            await loadPaymentsData(activeFilter);
            showToast(customMsg || res?.message || "Rapprochement bancaire validé avec succès !");
        } catch (err) {
            showToast(err.message || "Erreur lors du rapprochement", "error");
        } finally {
            setActionLoading(null);
        }
    };

    // Ignorer une transaction bancaire
    const handleIgnoreReconciliation = async (transactionId) => {
        setActionLoading(transactionId);
        try {
            await apiFetch(`/v1/banking/reconcile/${transactionId}`, {
                method: "DELETE"
            });
            // Retirer de la liste locale
            setPendingReconciliations(prev => prev.filter(t => t.id !== transactionId));
            showToast("Transaction bancaire ignorée.", "info");
        } catch (err) {
            showToast(err.message || "Erreur lors du traitement", "error");
        } finally {
            setActionLoading(null);
        }
    };

    // Formatters
    const formatCurrency = (val) => {
        return Number(val || 0).toLocaleString("fr-FR", {
            style: "currency",
            currency: "EUR",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    const formatDate = (d) => {
        if (!d) return "—";
        try {
            return new Date(d).toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
            });
        } catch (e) {
            return "—";
        }
    };

    const pageSize = isMobile ? 5 : 10;

    useEffect(() => {
        setVisibleCount(isMobile ? 5 : 10);
    }, [activeFilter, searchQuery, isMobile]);

    // Filter payments list
    const filteredPayments = useMemo(() => {
        if (activeFilter === "review") return [];
        let list = payments.filter(p => {
            if (activeFilter === "virements") return p.type === "BANK_TRANSFER";
            if (activeFilter === "carte") return p.type === "CARD";
            return true;
        });
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter(p => {
                const clientName = `${p.invoice?.client?.firstName || ''} ${p.invoice?.client?.lastName || ''} ${p.invoice?.client?.companyName || ''}`.toLowerCase();
                const invNum = (p.invoice?.number || '').toLowerCase();
                const ref = (p.bankReference || p.stripePaymentIntentId || '').toLowerCase();
                return clientName.includes(q) || invNum.includes(q) || ref.includes(q);
            });
        }
        return list;
    }, [payments, activeFilter, searchQuery]);

    // Filter pending reconciliations for "À vérifier" tab
    const filteredPendingReconciliations = useMemo(() => {
        if (!searchQuery.trim()) return pendingReconciliations;
        const q = searchQuery.toLowerCase().trim();
        return pendingReconciliations.filter(tx => {
            const label = (tx.label || '').toLowerCase();
            const counterparty = (tx.counterparty || '').toLowerCase();
            const ref = (tx.reference || '').toLowerCase();
            const invNum = (tx.matchedInvoice?.number || '').toLowerCase();
            const clientName = `${tx.matchedInvoice?.client?.firstName || ''} ${tx.matchedInvoice?.client?.lastName || ''} ${tx.matchedInvoice?.client?.companyName || ''}`.toLowerCase();
            return label.includes(q) || counterparty.includes(q) || ref.includes(q) || invNum.includes(q) || clientName.includes(q);
        });
    }, [pendingReconciliations, searchQuery]);

    // Filter modal open invoices
    const modalInvoicesFiltered = useMemo(() => {
        if (!invoiceSearchQuery.trim()) return openInvoicesList;
        const q = invoiceSearchQuery.toLowerCase().trim();
        return openInvoicesList.filter(inv => {
            const num = (inv.number || '').toLowerCase();
            const client = `${inv.client?.firstName || ''} ${inv.client?.lastName || ''} ${inv.client?.companyName || ''}`.toLowerCase();
            const amount = String(inv.amountTTC || '');
            return num.includes(q) || client.includes(q) || amount.includes(q);
        });
    }, [openInvoicesList, invoiceSearchQuery]);

    const displayedPayments = useMemo(() => {
        return filteredPayments.slice(0, visibleCount);
    }, [filteredPayments, visibleCount]);

    const hasMore = visibleCount < filteredPayments.length;
    const handleLoadMore = () => setVisibleCount(prev => prev + pageSize);

    return (
        <div className="home-page payments-page-wrapper">
            <SideBar />
            <div className="main-content">
                <Header title="Paiements" />
                <PullToRefresh onRefresh={handleRefresh} disabled={showInvoiceModal || !!associatingTx}>
                    <motion.div
                        className="page-content"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    >
                    {/* Header line */}
                    <div className="payments-header-row">
                        {!isMobile ? (
                            <div className="payments-header-title-group">
                                <div>
                                    <h1 className="payments-title">
                                        Paiements & Encaissements
                                    </h1>
                                    <p className="payments-subtitle">
                                        Suivi des règlements par carte bancaire Stripe et virements lettrés.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <p className="payments-mobile-desc">
                                Suivi des règlements Stripe et virements lettrés.
                            </p>
                        )}

                        <div className="payments-header-actions">
                            <button
                                type="button"
                                onClick={() => navigate("/settings?tab=paiements")}
                                className="payments-settings-btn"
                            >
                                <CreditCard size={15} style={{ color: "var(--primary)" }} />
                                <span>Réglages des paiements</span>
                            </button>

                            <button
                                type="button"
                                onClick={handleRefresh}
                                disabled={refreshing}
                                className="payments-refresh-btn"
                                aria-label="Actualiser"
                            >
                                <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
                            </button>
                        </div>
                    </div>

                    {/* ─────────────────────────────────────────────────────────────
                        KPI CARDS
                    ───────────────────────────────────────────────────────────── */}
                    <div className="payments-kpi-grid">
                        
                        {/* KPI 1 : Total Encaissé */}
                        <div className="payments-kpi-card">
                            <div className="payments-kpi-icon" style={{ backgroundColor: "rgba(16, 185, 129, 0.12)", color: "#10B981" }}>
                                <CheckCircle2 size={24} />
                            </div>
                            <div className="payments-kpi-info">
                                <div className="payments-kpi-label">Total encaissé</div>
                                <div className="payments-kpi-value">{formatCurrency(kpis.totalReceived)}</div>
                            </div>
                        </div>

                        {/* KPI 2 : En attente */}
                        <div className="payments-kpi-card">
                            <div className="payments-kpi-icon" style={{ backgroundColor: "rgba(245, 158, 11, 0.12)", color: "#F59E0B" }}>
                                <Clock size={24} />
                            </div>
                            <div className="payments-kpi-info">
                                <div className="payments-kpi-label">En attente de paiement</div>
                                <div className="payments-kpi-value">{formatCurrency(kpis.totalPending)}</div>
                            </div>
                        </div>

                        {/* KPI 3 : Ce mois-ci */}
                        <div className="payments-kpi-card">
                            <div className="payments-kpi-icon" style={{ backgroundColor: "rgba(85, 107, 47, 0.12)", color: "var(--primary)" }}>
                                <TrendingUp size={24} />
                            </div>
                            <div className="payments-kpi-info">
                                <div className="payments-kpi-label">Encaissé ce mois-ci</div>
                                <div className="payments-kpi-value">{formatCurrency(kpis.thisMonthReceived)}</div>
                            </div>
                        </div>
                    </div>

                    {/* ─────────────────────────────────────────────────────────────
                        TOOLBAR & FILTRES
                    ───────────────────────────────────────────────────────────── */}
                    <div className="payments-toolbar">
                        <div className="payments-filter-tabs">
                            <button
                                type="button"
                                className={`payments-filter-tab ${activeFilter === "all" ? "active" : ""}`}
                                onClick={() => setActiveFilter("all")}
                            >
                                <span>Tous</span>
                            </button>
                            <button
                                type="button"
                                className={`payments-filter-tab ${activeFilter === "virements" ? "active" : ""}`}
                                onClick={() => setActiveFilter("virements")}
                            >
                                <Landmark size={14} />
                                <span>Virements</span>
                            </button>
                            <button
                                type="button"
                                className={`payments-filter-tab ${activeFilter === "carte" ? "active" : ""}`}
                                onClick={() => setActiveFilter("carte")}
                            >
                                <CreditCard size={14} />
                                <span>{isMobile ? "Carte" : "Carte bancaire"}</span>
                            </button>
                            <button
                                type="button"
                                className={`payments-filter-tab ${activeFilter === "review" ? "active" : ""}`}
                                onClick={() => setActiveFilter("review")}
                            >
                                <span>À vérifier</span>
                                {pendingReconciliations.length > 0 && (
                                    <span className="payments-filter-badge">{pendingReconciliations.length}</span>
                                )}
                            </button>
                        </div>

                        <form
                            onSubmit={handleSearchSubmit}
                            className="payments-search-box"
                            onClick={() => searchInputRef.current?.focus()}
                        >
                            <Search
                                size={16}
                                className="payments-search-icon"
                                style={{ cursor: "pointer" }}
                                onClick={() => searchInputRef.current?.focus()}
                            />
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder={isMobile ? "Rechercher client, facture..." : "Rechercher client, facture, référence..."}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onFocus={(e) => {
                                    setTimeout(() => {
                                        e.target.scrollIntoView({ behavior: "smooth", block: "center" });
                                    }, 120);
                                }}
                                className="payments-search-input"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSearchQuery("");
                                        searchInputRef.current?.focus();
                                    }}
                                    className="payments-search-clear-btn"
                                    aria-label="Effacer"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </form>
                    </div>

                    {/* ─────────────────────────────────────────────────────────────
                        TABLE DES PAIEMENTS OU SECTION À VÉRIFIER
                    ───────────────────────────────────────────────────────────── */}
                    {loading ? (
                        <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
                            <Loader2 size={32} className="animate-spin" style={{ color: "var(--primary)" }} />
                        </div>
                    ) : activeFilter === "review" ? (
                        <div className="payments-table-card">
                            {filteredPendingReconciliations.length === 0 ? (
                                <div className="payments-empty-state">
                                    <ShieldCheck size={44} style={{ color: "#10B981" }} />
                                    <h3>Toutes les opérations sont à jour</h3>
                                    <p>Aucune transaction bancaire en attente de vérification pour le moment.</p>
                                </div>
                            ) : (
                                <>
                                    {/* Desktop Table View for Review */}
                                    <table className="payments-table">
                                        <thead>
                                            <tr>
                                                <th style={{ width: "110px" }}>Date</th>
                                                <th>Émetteur / Libellé bancaire</th>
                                                <th style={{ width: "120px" }}>Montant</th>
                                                <th style={{ minWidth: "280px" }}>Facture associée / Détection</th>
                                                <th style={{ width: "210px", textAlign: "right" }}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredPendingReconciliations.map((tx) => {
                                                const isPaid = tx.matchedInvoice && (tx.matchedInvoice.status === "PAID" || tx.matchedInvoice.paymentStatus === "PAID");
                                                const isMatchedOpen = tx.matchedInvoice && !isPaid;

                                                return (
                                                    <tr key={tx.id}>
                                                        <td style={{ fontWeight: 500, whiteSpace: "nowrap" }}>
                                                            {formatDate(tx.transactionDate)}
                                                        </td>
                                                        <td>
                                                            <div style={{ fontWeight: 600 }}>{tx.counterparty || tx.label || "Virement reçu"}</div>
                                                            {tx.reference && (
                                                                <div style={{ fontSize: "12px", color: "var(--muted-foreground)", fontFamily: "monospace" }}>
                                                                    {tx.reference}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td style={{ fontWeight: 800, fontSize: "14.5px", color: "#10B981", whiteSpace: "nowrap" }}>
                                                            +{formatCurrency(tx.amount)}
                                                        </td>
                                                        <td style={{ minWidth: "280px" }}>
                                                            {isPaid ? (
                                                                <div className="payments-reconciled-badge-paid">
                                                                    <span className="badge-dot-green"></span>
                                                                    <span>Déjà réglée :</span>
                                                                    <strong
                                                                        onClick={() => handleOpenInvoice(tx.matchedInvoice.id)}
                                                                        style={{ color: "var(--foreground)", cursor: "pointer", textDecoration: "underline" }}
                                                                    >
                                                                        {tx.matchedInvoice.number}
                                                                    </strong>
                                                                    <span style={{ opacity: 0.5 }}>•</span>
                                                                    <span style={{ fontWeight: 600, color: "var(--foreground)" }}>{formatCurrency(tx.matchedInvoice.amountTTC)}</span>
                                                                </div>
                                                            ) : isMatchedOpen ? (
                                                                <div className="payments-reconciled-badge-suggested">
                                                                    <span className="badge-dot-primary"></span>
                                                                    <span>Suggérée :</span>
                                                                    <strong
                                                                        onClick={() => handleOpenInvoice(tx.matchedInvoice.id)}
                                                                        style={{ color: "var(--foreground)", cursor: "pointer", textDecoration: "underline" }}
                                                                    >
                                                                        {tx.matchedInvoice.number}
                                                                    </strong>
                                                                    <span style={{ opacity: 0.5 }}>•</span>
                                                                    <span style={{ color: "var(--foreground)" }}>{tx.matchedInvoice.client?.firstName} {tx.matchedInvoice.client?.lastName || tx.matchedInvoice.client?.companyName}</span>
                                                                </div>
                                                            ) : (
                                                                <div className="payments-reconciled-badge-unmatched">
                                                                    <span className="badge-dot-neutral"></span>
                                                                    <span>Aucune facture associée</span>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td style={{ width: "210px", textAlign: "right" }}>
                                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "10px" }}>
                                                                {isMatchedOpen && (
                                                                    <button
                                                                        type="button"
                                                                        disabled={actionLoading === tx.id}
                                                                        onClick={() => handleConfirmReconciliation(tx.id, tx.matchedInvoice.id, "Paiement validé et facture rapprochée avec succès !")}
                                                                        className="payments-btn-accept-action"
                                                                    >
                                                                        {actionLoading === tx.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={14} />}
                                                                        <span>Accepter</span>
                                                                    </button>
                                                                )}

                                                                {isPaid && (
                                                                    <button
                                                                        type="button"
                                                                        disabled={actionLoading === tx.id}
                                                                        onClick={() => handleConfirmReconciliation(tx.id, tx.matchedInvoice.id, "Virement lié avec succès à la facture !")}
                                                                        className="payments-btn-link-action"
                                                                        title="Attacher la référence de virement à cette facture"
                                                                    >
                                                                        {actionLoading === tx.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                                                                        <span>Lier</span>
                                                                    </button>
                                                                )}

                                                                {!tx.matchedInvoice && (
                                                                    <button
                                                                        type="button"
                                                                        disabled={actionLoading === tx.id}
                                                                        onClick={() => handleOpenAssociateModal(tx)}
                                                                        className="payments-btn-associate-action"
                                                                    >
                                                                        <ArrowUpRight size={13} />
                                                                        <span>Associer</span>
                                                                    </button>
                                                                )}

                                                                <button
                                                                    type="button"
                                                                    disabled={actionLoading === tx.id}
                                                                    onClick={() => handleIgnoreReconciliation(tx.id)}
                                                                    className="payments-btn-ignore-action"
                                                                >
                                                                    <X size={14} />
                                                                    <span>Ignorer</span>
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>

                                    {/* Mobile Cards for Review */}
                                    <div className="payments-mobile-cards">
                                        {filteredPendingReconciliations.map((tx) => {
                                            const isPaid = tx.matchedInvoice && (tx.matchedInvoice.status === "PAID" || tx.matchedInvoice.paymentStatus === "PAID");
                                            const isMatchedOpen = tx.matchedInvoice && !isPaid;

                                            return (
                                                <div key={tx.id} className="payments-mobile-card">
                                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                                                        <div>
                                                            <div style={{ fontWeight: 700, fontSize: "15px", color: "var(--foreground)" }}>
                                                                {tx.counterparty || tx.label || "Virement reçu"}
                                                            </div>
                                                            <div style={{ fontSize: "12px", color: "var(--muted-foreground)", marginTop: "2px" }}>
                                                                {formatDate(tx.transactionDate)}
                                                            </div>
                                                        </div>
                                                        <div style={{ fontWeight: 800, fontSize: "16px", color: "#10B981" }}>
                                                            +{formatCurrency(tx.amount)}
                                                        </div>
                                                    </div>

                                                    <div style={{ margin: "10px 0" }}>
                                                        {isPaid ? (
                                                            <div className="payments-reconciled-badge-paid" style={{ width: "100%", boxSizing: "border-box" }}>
                                                                <span className="badge-dot-green"></span>
                                                                <span>Déjà réglée : <strong>{tx.matchedInvoice.number}</strong></span>
                                                            </div>
                                                        ) : isMatchedOpen ? (
                                                            <div className="payments-reconciled-badge-suggested" style={{ width: "100%", boxSizing: "border-box" }}>
                                                                <span className="badge-dot-primary"></span>
                                                                <span>Suggérée : <strong>{tx.matchedInvoice.number}</strong></span>
                                                            </div>
                                                        ) : (
                                                            <div className="payments-reconciled-badge-unmatched" style={{ width: "100%", boxSizing: "border-box" }}>
                                                                <span className="badge-dot-neutral"></span>
                                                                <span>Aucune facture associée</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div style={{ display: "flex", gap: "8px", marginTop: "12px", paddingTop: "10px", borderTop: "1px solid var(--border)", flexWrap: "wrap" }}>
                                                        {isMatchedOpen && (
                                                            <button
                                                                type="button"
                                                                disabled={actionLoading === tx.id}
                                                                onClick={() => handleConfirmReconciliation(tx.id, tx.matchedInvoice.id, "Paiement validé et facture rapprochée avec succès !")}
                                                                className="payments-btn-accept-action"
                                                                style={{ flex: 1, justifyContent: "center" }}
                                                            >
                                                                <Check size={14} /> Accepter
                                                            </button>
                                                        )}
                                                        {isPaid && (
                                                            <button
                                                                type="button"
                                                                disabled={actionLoading === tx.id}
                                                                onClick={() => handleConfirmReconciliation(tx.id, tx.matchedInvoice.id, "Virement lié avec succès à la facture !")}
                                                                className="payments-btn-link-action"
                                                                style={{ flex: 1, justifyContent: "center" }}
                                                            >
                                                                <Check size={13} /> Lier
                                                            </button>
                                                        )}
                                                        {!tx.matchedInvoice && (
                                                            <button
                                                                type="button"
                                                                disabled={actionLoading === tx.id}
                                                                onClick={() => handleOpenAssociateModal(tx)}
                                                                className="payments-btn-associate-action"
                                                                style={{ flex: 1, justifyContent: "center" }}
                                                            >
                                                                <ArrowUpRight size={13} /> Associer
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            disabled={actionLoading === tx.id}
                                                            onClick={() => handleIgnoreReconciliation(tx.id)}
                                                            className="payments-btn-ignore-action"
                                                            style={{ flex: 1, justifyContent: "center" }}
                                                        >
                                                            <X size={14} /> Ignorer
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </div>
                    ) : displayedPayments.length === 0 ? (
                        <div className="payments-empty-state">
                            {activeFilter === "virements" ? (
                                <Landmark size={44} />
                            ) : (
                                <CreditCard size={44} />
                            )}
                            <h3>Aucun paiement trouvé</h3>
                            <p>
                                {activeFilter === "virements"
                                    ? "Les règlements de factures par virement bancaire s'afficheront ici automatiquement."
                                    : activeFilter === "carte"
                                    ? "Les règlements de factures par carte bancaire Stripe s'afficheront ici automatiquement."
                                    : "Les règlements de factures par carte Stripe ou virements s'afficheront ici automatiquement."}
                            </p>
                        </div>
                    ) : (
                        <div className="payments-table-card">
                            
                            {/* Desktop Table View */}
                            <table className="payments-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Client</th>
                                        <th>Facture</th>
                                        <th>Montant</th>
                                        <th>Mode de règlement</th>
                                        <th>Statut</th>
                                        <th>Référence</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {displayedPayments.map((p) => {
                                        const clientName = p.invoice?.client
                                            ? `${p.invoice.client.firstName || ''} ${p.invoice.client.lastName || p.invoice.client.companyName || ''}`.trim()
                                            : "Client";

                                        return (
                                            <tr key={p.id}>
                                                <td style={{ fontWeight: 500 }}>
                                                    {formatDate(p.paidAt || p.createdAt)}
                                                </td>
                                                <td>
                                                    <div style={{ fontWeight: 600 }}>{clientName}</div>
                                                    {p.invoice?.client?.email && (
                                                        <div style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
                                                            {p.invoice.client.email}
                                                        </div>
                                                    )}
                                                </td>
                                                <td>
                                                    {p.invoice?.number ? (
                                                        <span
                                                            onClick={() => handleOpenInvoice(p.invoice.id)}
                                                            style={{
                                                                fontWeight: 700,
                                                                color: "var(--primary)",
                                                                cursor: "pointer",
                                                                textDecoration: "underline",
                                                                display: "inline-flex",
                                                                alignItems: "center",
                                                                gap: "4px"
                                                            }}
                                                            title="Cliquer pour ouvrir la facture"
                                                        >
                                                            {p.invoice.number}
                                                            {loadingInvoiceId === p.invoice.id && <Loader2 size={12} className="animate-spin" />}
                                                        </span>
                                                    ) : "—"}
                                                </td>
                                                <td style={{ fontWeight: 800, fontSize: "14.5px" }}>
                                                    {formatCurrency(p.amount)}
                                                </td>
                                                <td>
                                                    {p.type === "CARD" ? (
                                                        <span className="badge-method-card">
                                                            <CreditCard size={12} /> Carte bancaire
                                                        </span>
                                                    ) : (
                                                        <span className="badge-method-transfer">
                                                            <Landmark size={12} /> Virement bancaire
                                                        </span>
                                                    )}
                                                </td>
                                                <td>
                                                    <span className="badge-status-paid">
                                                        <CheckCircle2 size={12} /> PAYÉE
                                                    </span>
                                                </td>
                                                <td
                                                    style={{
                                                        fontSize: "12px",
                                                        color: p.invoice?.id ? "var(--primary)" : "var(--muted-foreground)",
                                                        fontFamily: "monospace",
                                                        cursor: p.invoice?.id ? "pointer" : "default"
                                                    }}
                                                    onClick={() => p.invoice?.id && handleOpenInvoice(p.invoice.id)}
                                                    title={p.invoice?.id ? "Cliquer pour ouvrir la facture" : undefined}
                                                >
                                                    <span style={{ textDecoration: p.invoice?.id ? "underline" : "none", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                                        {p.bankReference || p.stripePaymentIntentId || "—"}
                                                        {p.invoice?.id && loadingInvoiceId === p.invoice.id && <Loader2 size={11} className="animate-spin" />}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            {/* Mobile Card List View */}
                            <div className="payments-mobile-cards">
                                {displayedPayments.map((p) => {
                                    const clientName = p.invoice?.client
                                        ? `${p.invoice.client.firstName || ''} ${p.invoice.client.lastName || p.invoice.client.companyName || ''}`.trim()
                                        : "Client";

                                    return (
                                        <div key={p.id} className="payments-mobile-card">
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                                                <div>
                                                    <div style={{ fontWeight: 700, fontSize: "15px", color: "var(--foreground)" }}>{clientName}</div>
                                                    <div
                                                        style={{
                                                            fontSize: "12.5px",
                                                            color: "var(--primary)",
                                                            fontWeight: 600,
                                                            cursor: p.invoice?.id ? "pointer" : "default",
                                                            textDecoration: p.invoice?.id ? "underline" : "none"
                                                        }}
                                                        onClick={() => p.invoice?.id && handleOpenInvoice(p.invoice.id)}
                                                    >
                                                        Facture {p.invoice?.number || "—"}
                                                    </div>
                                                </div>
                                                <div style={{ fontWeight: 800, fontSize: "16px", color: "var(--foreground)" }}>
                                                    {formatCurrency(p.amount)}
                                                </div>
                                            </div>

                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px", paddingTop: "10px", borderTop: "1px solid var(--border)" }}>
                                                <div style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
                                                    {formatDate(p.paidAt || p.createdAt)}
                                                </div>
                                                <div style={{ display: "flex", gap: "6px" }}>
                                                    {p.type === "CARD" ? (
                                                        <span className="badge-method-card">
                                                            <CreditCard size={11} /> Carte
                                                        </span>
                                                    ) : (
                                                        <span className="badge-method-transfer">
                                                            <Landmark size={11} /> Virement
                                                        </span>
                                                    )}
                                                    <span className="badge-status-paid">
                                                        <CheckCircle2 size={11} /> Payée
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {hasMore && (
                                <div className="payments-load-more-container">
                                    <button
                                        type="button"
                                        onClick={handleLoadMore}
                                        className="payments-load-more-btn"
                                    >
                                        <span>Afficher plus</span>
                                        <span className="payments-load-more-count">
                                            (+{Math.min(pageSize, filteredPayments.length - visibleCount)})
                                        </span>
                                    </button>
                                    <div className="payments-load-more-summary">
                                        Affichage de {Math.min(visibleCount, filteredPayments.length)} sur {filteredPayments.length} paiements
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </motion.div>
                </PullToRefresh>
            </div>

            {/* Modal d'association manuelle d'un virement à une facture */}
            <AnimatePresence>
                {associatingTx && (
                    <motion.div
                        className="payments-modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={() => setAssociatingTx(null)}
                    >
                        <motion.div
                            className="payments-associate-modal"
                            initial={{ opacity: 0, scale: 0.96, y: 8 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 8 }}
                            transition={{ duration: 0.2 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="payments-modal-header">
                                <h3>Associer le virement à une facture</h3>
                                <button
                                    type="button"
                                    className="payments-modal-close-btn"
                                    onClick={() => setAssociatingTx(null)}
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="payments-modal-tx-recap">
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--foreground)" }}>
                                        {associatingTx.counterparty || associatingTx.label || "Virement reçu"}
                                    </div>
                                    <div style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
                                        {formatDate(associatingTx.transactionDate)} • Réf : {associatingTx.reference || "POWENS"}
                                    </div>
                                </div>
                                <div style={{ fontWeight: 800, fontSize: "17px", color: "#10B981" }}>
                                    +{formatCurrency(associatingTx.amount)}
                                </div>
                            </div>

                            <div className="payments-modal-search-wrap">
                                <div className="payments-modal-search-box">
                                    <Search size={15} style={{ color: "var(--muted-foreground)" }} />
                                    <input
                                        type="text"
                                        placeholder="Rechercher une facture par numéro, client..."
                                        value={invoiceSearchQuery}
                                        onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div className="payments-modal-invoices-list">
                                {loadingOpenInvoices ? (
                                    <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
                                        <Loader2 size={24} className="animate-spin" style={{ color: "var(--primary)" }} />
                                    </div>
                                ) : modalInvoicesFiltered.length === 0 ? (
                                    <div style={{ textAlign: "center", padding: "30px 0", color: "var(--muted-foreground)", fontSize: "13px" }}>
                                        Aucune facture correspondante trouvée.
                                    </div>
                                ) : (
                                    modalInvoicesFiltered.map((inv) => {
                                        const isExactAmount = Math.abs(Number(inv.amountTTC) - Number(associatingTx.amount)) < 0.01;
                                        const clientName = `${inv.client?.firstName || ''} ${inv.client?.lastName || inv.client?.companyName || ''}`.trim() || "Client";
                                        const isAlreadyPaid = inv.status === "PAID" || inv.paymentStatus === "PAID";

                                        return (
                                            <div
                                                key={inv.id}
                                                className={`payments-modal-invoice-item ${isExactAmount ? "match-amount" : ""}`}
                                                onClick={() => handleConfirmAssociate(inv.id)}
                                            >
                                                <div>
                                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                        <strong style={{ color: "var(--primary)", fontSize: "14px" }}>
                                                            {inv.number}
                                                        </strong>
                                                        {isExactAmount && (
                                                            <span style={{ fontSize: "10.5px", padding: "2px 6px", borderRadius: "4px", backgroundColor: "rgba(16, 185, 129, 0.15)", color: "#10B981", fontWeight: 700 }}>
                                                                Montant exact
                                                            </span>
                                                        )}
                                                        {isAlreadyPaid && (
                                                            <span style={{ fontSize: "10.5px", padding: "2px 6px", borderRadius: "4px", backgroundColor: "rgba(245, 158, 11, 0.15)", color: "#F59E0B", fontWeight: 700 }}>
                                                                Déjà réglée
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div style={{ fontSize: "12.5px", color: "var(--muted-foreground)", marginTop: "2px" }}>
                                                        {clientName} • Émise le {formatDate(inv.issuedAt || inv.createdAt)}
                                                    </div>
                                                </div>
                                                <div style={{ textAlign: "right" }}>
                                                    <div style={{ fontWeight: 700, fontSize: "14.5px", color: "var(--foreground)" }}>
                                                        {formatCurrency(inv.amountTTC)}
                                                    </div>
                                                    <button
                                                        type="button"
                                                        style={{
                                                            marginTop: "4px",
                                                            padding: "4px 10px",
                                                            borderRadius: "6px",
                                                            border: "none",
                                                            backgroundColor: "var(--primary)",
                                                            color: "#FFFFFF",
                                                            fontSize: "11.5px",
                                                            fontWeight: 600,
                                                            cursor: "pointer"
                                                        }}
                                                    >
                                                        Sélectionner
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            <div className="payments-modal-footer">
                                <button
                                    type="button"
                                    onClick={() => setAssociatingTx(null)}
                                    style={{
                                        padding: "8px 16px",
                                        borderRadius: "8px",
                                        border: "1px solid var(--border)",
                                        backgroundColor: "transparent",
                                        color: "var(--foreground)",
                                        fontSize: "13px",
                                        cursor: "pointer"
                                    }}
                                >
                                    Annuler
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modal de prévisualisation de la facture */}
            {showInvoiceModal && selectedInvoice && (
                <InvoicePdfView
                    invoice={selectedInvoice}
                    onClose={() => {
                        setShowInvoiceModal(false);
                        setSelectedInvoice(null);
                    }}
                    onDownload={handleDownloadPdf}
                />
            )}

            {/* Toast Notification - Smooth top slide-in & slide-out, pause on hover */}
            <ToastNotification toast={toast} onClose={() => setToast(null)} />
        </div>
    );
}
