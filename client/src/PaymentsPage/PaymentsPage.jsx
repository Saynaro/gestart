import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import "./PaymentsPage.css";

// Layout components
import SideBar from "../components/SideBar";
import Header from "../components/Header";

// Icons
import {
    CreditCard,
    Landmark,
    CheckCircle2,
    Clock,
    AlertCircle,
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

export default function PaymentsPage() {
    const navigate = useNavigate();

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

    const handleRefresh = () => {
        setRefreshing(true);
        loadPaymentsData(activeFilter);
    };

    // Confirmer le rapprochement bancaire
    const handleConfirmReconciliation = async (transactionId, invoiceId) => {
        setActionLoading(transactionId);
        try {
            await apiFetch(`/v1/banking/reconcile/${transactionId}`, {
                method: "POST",
                body: JSON.stringify({ invoiceId })
            });
            // Recharger les données
            loadPaymentsData(activeFilter);
        } catch (err) {
            alert(err.message || "Erreur lors de la confirmation du rapprochement");
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
        } catch (err) {
            alert(err.message || "Erreur lors du traitement");
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

    // Filter payments list
    const displayedPayments = useMemo(() => {
        if (activeFilter === "review") return [];
        return payments.filter(p => {
            if (activeFilter === "virements") return p.type === "BANK_TRANSFER";
            if (activeFilter === "carte") return p.type === "CARD";
            return true;
        });
    }, [payments, activeFilter]);

    return (
        <div className="home-page payments-page-wrapper">
            <SideBar />
            <div className="main-content">
                <Header />
                <motion.div
                    className="page-content"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                >
                    {/* Header line */}
                    <div className="payments-header-row">
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            {isMobile && (
                                <button
                                    onClick={() => navigate("/home")}
                                    style={{
                                        background: "none",
                                        border: "1px solid var(--border)",
                                        borderRadius: "8px",
                                        padding: "8px",
                                        color: "var(--foreground)",
                                        cursor: "pointer"
                                    }}
                                >
                                    <ArrowLeft size={18} />
                                </button>
                            )}
                            <div>
                                <h1 style={{ margin: 0, fontSize: isMobile ? "20px" : "24px", fontWeight: 800, color: "var(--foreground)", letterSpacing: "-0.02em" }}>
                                    Paiements & Encaissements
                                </h1>
                                <p style={{ margin: "4px 0 0 0", color: "var(--muted-foreground)", fontSize: "13.5px" }}>
                                    Suivi des règlements par carte bancaire Stripe et virements lettrés.
                                </p>
                            </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <button
                                type="button"
                                onClick={() => navigate("/settings?tab=paiements")}
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    padding: "9px 16px",
                                    borderRadius: "8px",
                                    border: "1px solid var(--border)",
                                    backgroundColor: "var(--card)",
                                    color: "var(--foreground)",
                                    fontSize: "13px",
                                    fontWeight: 600,
                                    cursor: "pointer"
                                }}
                            >
                                <CreditCard size={15} style={{ color: "var(--primary)" }} />
                                Réglages des paiements
                            </button>

                            <button
                                type="button"
                                onClick={handleRefresh}
                                disabled={refreshing}
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    width: "38px",
                                    height: "38px",
                                    borderRadius: "8px",
                                    border: "1px solid var(--border)",
                                    backgroundColor: "var(--card)",
                                    color: "var(--foreground)",
                                    cursor: "pointer"
                                }}
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
                                <div className="payments-kpi-value" style={{ color: "#F59E0B" }}>{formatCurrency(kpis.totalPending)}</div>
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
                        PANEL RAPPROCHEMENT BANCAIRE (À VÉRIFIER)
                    ───────────────────────────────────────────────────────────── */}
                    {pendingReconciliations.length > 0 && (
                        <div className="payments-reconciliation-card">
                            <div className="payments-reconciliation-header">
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                    <ShieldCheck size={20} style={{ color: "var(--primary)" }} />
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "var(--foreground)" }}>
                                            Rapprochement bancaire automatique
                                        </h3>
                                        <p style={{ margin: 0, fontSize: "12.5px", color: "var(--muted-foreground)" }}>
                                            {pendingReconciliations.length} transaction(s) bancaire(s) avec correspondance probable détectée.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                {pendingReconciliations.map((tx) => (
                                    <div key={tx.id} className="payments-reconciliation-item">
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--foreground)" }}>
                                                {tx.counterparty || tx.label || "Virement reçu"}
                                            </div>
                                            <div style={{ fontSize: "12.5px", color: "var(--muted-foreground)", marginTop: "2px" }}>
                                                Reçu le {formatDate(tx.transactionDate)} • Montant : <strong style={{ color: "#10B981" }}>+{formatCurrency(tx.amount)}</strong>
                                            </div>
                                        </div>

                                        {tx.matchedInvoice && (
                                            <div style={{
                                                backgroundColor: "var(--background)",
                                                padding: "8px 14px",
                                                borderRadius: "8px",
                                                border: "1px solid var(--border)",
                                                fontSize: "13px"
                                            }}>
                                                <span style={{ color: "var(--muted-foreground)" }}>Facture associée : </span>
                                                <strong style={{ color: "var(--primary)" }}>{tx.matchedInvoice.number}</strong>
                                                <span style={{ margin: "0 6px" }}>•</span>
                                                <span>{tx.matchedInvoice.client?.firstName} {tx.matchedInvoice.client?.lastName || tx.matchedInvoice.client?.companyName}</span>
                                                <span style={{ margin: "0 6px" }}>•</span>
                                                <span>{formatCurrency(tx.matchedInvoice.amountTTC)}</span>
                                            </div>
                                        )}

                                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                            {tx.matchedInvoice && (
                                                <button
                                                    type="button"
                                                    disabled={actionLoading === tx.id}
                                                    onClick={() => handleConfirmReconciliation(tx.id, tx.matchedInvoice.id)}
                                                    style={{
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        gap: "4px",
                                                        padding: "7px 14px",
                                                        borderRadius: "6px",
                                                        border: "none",
                                                        backgroundColor: "var(--primary)",
                                                        color: "#FFFFFF",
                                                        fontSize: "12.5px",
                                                        fontWeight: 600,
                                                        cursor: "pointer"
                                                    }}
                                                >
                                                    <Check size={14} /> Confirmer
                                                </button>
                                            )}

                                            <button
                                                type="button"
                                                disabled={actionLoading === tx.id}
                                                onClick={() => handleIgnoreReconciliation(tx.id)}
                                                style={{
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    gap: "4px",
                                                    padding: "7px 12px",
                                                    borderRadius: "6px",
                                                    border: "1px solid var(--border)",
                                                    backgroundColor: "transparent",
                                                    color: "var(--muted-foreground)",
                                                    fontSize: "12.5px",
                                                    cursor: "pointer"
                                                }}
                                            >
                                                <X size={14} /> Ignorer
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

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
                                Tous
                            </button>
                            <button
                                type="button"
                                className={`payments-filter-tab ${activeFilter === "virements" ? "active" : ""}`}
                                onClick={() => setActiveFilter("virements")}
                            >
                                <Landmark size={14} /> Virements
                            </button>
                            <button
                                type="button"
                                className={`payments-filter-tab ${activeFilter === "carte" ? "active" : ""}`}
                                onClick={() => setActiveFilter("carte")}
                            >
                                <CreditCard size={14} /> Carte bancaire
                            </button>
                            {pendingReconciliations.length > 0 && (
                                <button
                                    type="button"
                                    className={`payments-filter-tab ${activeFilter === "review" ? "active" : ""}`}
                                    onClick={() => setActiveFilter("review")}
                                >
                                    À vérifier
                                    <span className="payments-filter-badge">{pendingReconciliations.length}</span>
                                </button>
                            )}
                        </div>

                        <form onSubmit={handleSearchSubmit} className="payments-search-box">
                            <Search size={16} style={{ color: "var(--muted-foreground)" }} />
                            <input
                                type="text"
                                placeholder="Rechercher client, facture, référence..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="payments-search-input"
                            />
                        </form>
                    </div>

                    {/* ─────────────────────────────────────────────────────────────
                        TABLE DES PAIEMENTS
                    ───────────────────────────────────────────────────────────── */}
                    {loading ? (
                        <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
                            <Loader2 size={32} className="animate-spin" style={{ color: "var(--primary)" }} />
                        </div>
                    ) : displayedPayments.length === 0 ? (
                        <div style={{
                            backgroundColor: "var(--card)",
                            border: "1px solid var(--border)",
                            borderRadius: "14px",
                            padding: "60px 20px",
                            textAlign: "center"
                        }}>
                            <CreditCard size={40} style={{ color: "var(--muted-foreground)", marginBottom: "12px", opacity: 0.5 }} />
                            <h3 style={{ margin: "0 0 6px 0", fontSize: "16px", color: "var(--foreground)" }}>Aucun paiement trouvé</h3>
                            <p style={{ margin: 0, fontSize: "13px", color: "var(--muted-foreground)" }}>
                                Les règlements de factures par carte Stripe ou virements s'afficheront ici automatiquement.
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
                                                            onClick={() => navigate(`/factures?search=${p.invoice.number}`)}
                                                            style={{
                                                                fontWeight: 700,
                                                                color: "var(--primary)",
                                                                cursor: "pointer",
                                                                textDecoration: "underline"
                                                            }}
                                                        >
                                                            {p.invoice.number}
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
                                                <td style={{ fontSize: "12px", color: "var(--muted-foreground)", fontFamily: "monospace" }}>
                                                    {p.bankReference || p.stripePaymentIntentId || "—"}
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
                                                    <div style={{ fontSize: "12.5px", color: "var(--primary)", fontWeight: 600 }}>
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
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
}
