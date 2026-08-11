import React, { useState, useEffect } from "react";
import { Plus } from "lucide-react";
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
import { apiFetch } from "../utils/api";

const FILTERS = [
    { key: "all",      label: "Toutes" },
    { key: "draft",    label: "Brouillon" },
    { key: "pending",  label: "En attente" },
    { key: "paid",     label: "Payée" },
    { key: "overdue",  label: "En retard" },
];

function FacturesPage() {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);

    const mapInvoiceFromApi = (inv) => ({
        id: inv.id,
        number: inv.number || `F-2026-${String(inv.id).padStart(4, "0")}`,
        clientName: inv.client ? `${inv.client.firstName || ''} ${inv.client.lastName || inv.client.companyName || ''}`.trim() : (inv.clientName || 'Client Inconnu'),
        clientEmail: inv.client?.email || inv.clientEmail || '',
        clientAddress: inv.client ? `${inv.client.address || ''} ${inv.client.city || ''}`.trim() : (inv.clientAddress || ''),
        interventionType: inv.subject || inv.interventionType || "Prestation",
        workDetails: inv.description || inv.workDetails || "",
        date: inv.createdAt ? new Date(inv.createdAt).toISOString().split('T')[0] : (inv.date || new Date().toISOString().split('T')[0]),
        dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString().split('T')[0] : (inv.dueDate || new Date().toISOString().split('T')[0]),
        paymentDelay: inv.paymentDelay || 30,
        tvaRate: inv.tvaRate || 20,
        subtotalHt: Number(inv.totalHt || inv.subtotalHt || 0),
        tvaAmount: Number(inv.totalTva || inv.tvaAmount || 0),
        totalTtc: Number(inv.totalTtc || 0),
        status: (inv.status || "draft").toLowerCase(),
        lines: inv.lines || []
    });

    useEffect(() => {
        const fetchInvoices = async () => {
            try {
                setLoading(true);
                const data = await apiFetch('/v1/invoices');
                setInvoices(rawInvoices.map(mapInvoiceFromApi));
            } catch (err) {
                console.warn("API invoices error:", err.message);
                setInvoices([]);
            } finally {
                setLoading(false);
            }
        };

        fetchInvoices();
    }, []);

    const [activeFilter, setActiveFilter] = useState("all");
    const [activeInvoice, setActiveInvoice] = useState(null);
    const [showDetailDrawer, setShowDetailDrawer] = useState(false);
    const [showSendDrawer, setShowSendDrawer] = useState(false);
    const [showEditPanel, setShowEditPanel] = useState(false);
    const [showPdfModal, setShowPdfModal] = useState(false);
    const [showNewModal, setShowNewModal] = useState(false);
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
            await apiFetch(`/v1/invoices/${inv.id}`, {
                method: 'PUT',
                body: JSON.stringify({ status: "PAID", paymentMethod })
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
                method: 'PUT',
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
                method: 'PUT',
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

    return (
        <div className="home-page factures-page-wrapper">
            <SideBar onFabClick={() => setShowNewModal(true)} />
            <div className="main-content">
                <Header />
                <div className="page-content">

                    {/* Page Header */}
                    <div className="fp-page-header">
                        <div>
                            <h1 className="content-title">Factures</h1>
                            <p className="content-subtitle">Gérez et suivez vos règlements clients.</p>
                        </div>
                        <button className="fp-new-btn" onClick={() => setShowNewModal(true)}>
                            <Plus size={16} /> Nouvelle facture
                        </button>
                    </div>

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
                    onDownload={() => alert("Téléchargement du devis...")}
                />
            )}

            {/* New Invoice Modal */}
            {showNewModal && (
                <NewInvoiceModal
                    onClose={() => setShowNewModal(false)}
                    onCreateInvoice={handleCreateInvoice}
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
