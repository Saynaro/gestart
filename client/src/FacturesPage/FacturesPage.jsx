import React, { useState } from "react";
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

const FILTERS = [
    { key: "all",      label: "Toutes" },
    { key: "draft",    label: "Brouillon" },
    { key: "pending",  label: "En attente" },
    { key: "paid",     label: "Payée" },
    { key: "overdue",  label: "En retard" },
];

function FacturesPage() {
    const [invoices, setInvoices] = useState([
        {
            id: 1,
            number: "F-2026-0001",
            clientName: "Jean Dupont",
            clientEmail: "jean.dupont@email.com",
            clientAddress: "12 Rue des Fleurs, 75001 Paris",
            interventionType: "Entretien annuel",
            workDetails: "Entretien annuel complet de la pompe à chaleur air-air Daikin.",
            date: "2026-07-02",
            dueDate: "2026-08-01",
            paymentDelay: 30,
            tvaRate: 20,
            subtotalHt: 100,
            tvaAmount: 20,
            totalTtc: 120,
            status: "paid",
            lines: [{ description: "Forfait Entretien annuel PAC", qty: 1, unitPrice: 100 }]
        },
        {
            id: 2,
            number: "F-2026-0002",
            clientName: "Marie Martin",
            clientEmail: "marie.martin@email.com",
            clientAddress: "45 Avenue Foch, 69006 Lyon",
            interventionType: "Dépannage d'urgence",
            workDetails: "Recherche de fuite de fluide frigorigène et réparation sur climatisation.",
            date: "2026-07-10",
            dueDate: "2026-08-09",
            paymentDelay: 30,
            tvaRate: 10,
            subtotalHt: 218.18,
            tvaAmount: 21.82,
            totalTtc: 240,
            status: "pending",
            lines: [
                { description: "Forfait dépannage et diagnostic", qty: 1, unitPrice: 150 },
                { description: "Recharge de fluide R32 (kg)", qty: 0.8, unitPrice: 85.22 }
            ]
        },
        {
            id: 3,
            number: "F-2026-0003",
            clientName: "Garage Central",
            clientEmail: "contact@garagecentral.com",
            clientAddress: "8 Boulevard de l'Industrie, 44000 Nantes",
            interventionType: "Installation pompe à chaleur",
            workDetails: "Installation complète d'une pompe à chaleur air-eau Mitsubishi.",
            date: "2026-06-15",
            dueDate: "2026-07-15",
            paymentDelay: 30,
            tvaRate: 5.5,
            subtotalHt: 3981.04,
            tvaAmount: 218.96,
            totalTtc: 4200,
            status: "overdue",
            lines: [
                { description: "Pompe à chaleur air-eau 8kW", qty: 1, unitPrice: 3200 },
                { description: "Main d'œuvre pose et raccordement", qty: 1, unitPrice: 781.04 }
            ]
        },
        {
            id: 4,
            number: "F-2026-0004",
            clientName: "Marc Leroy",
            clientEmail: "marc.leroy@outlook.fr",
            clientAddress: "109 Rue Saint-Dizier, 54000 Nancy",
            interventionType: "Contrôle d'étanchéité",
            workDetails: "Contrôle réglementaire périodique d'étanchéité du circuit frigorifique.",
            date: "2026-07-18",
            dueDate: "2026-08-17",
            paymentDelay: 30,
            tvaRate: 20,
            subtotalHt: 150,
            tvaAmount: 30,
            totalTtc: 180,
            status: "draft",
            lines: [{ description: "Contrôle d'étanchéité frigorifique", qty: 1, unitPrice: 150 }]
        }
    ]);

    const [activeFilter, setActiveFilter] = useState("all");
    const [activeInvoice, setActiveInvoice] = useState(null);
    const [showDetailDrawer, setShowDetailDrawer] = useState(false);
    const [showSendDrawer, setShowSendDrawer] = useState(false);
    const [showEditPanel, setShowEditPanel] = useState(false);
    const [showPdfModal, setShowPdfModal] = useState(false);
    const [showNewModal, setShowNewModal] = useState(false);
    const [paymentModalInvoice, setPaymentModalInvoice] = useState(null);
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

    const handleConfirmPayment = (inv, paymentMethod) => {
        setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, status: "paid", paymentMethod } : i));
        setActiveInvoice(prev => ({ ...prev, status: "paid", paymentMethod }));
        setPaymentModalInvoice(null);
        showToast(`✓ Facture ${inv.number} encaissée par ${paymentMethod} !`);
    };

    const handleMarkUnpaid = (inv) => {
        setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, status: "pending" } : i));
        setActiveInvoice(prev => ({ ...prev, status: "pending" }));
        showToast(`Facture ${inv.number} marquée comme non payée.`, "info");
    };

    const handleSaveEdit = (updatedInv) => {
        setInvoices(prev => prev.map(i => i.id === updatedInv.id ? updatedInv : i));
        setActiveInvoice(updatedInv);
        setShowEditPanel(false);
        setShowDetailDrawer(true);
        showToast(`✓ Facture ${updatedInv.number} modifiée.`);
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

    const handleCreateInvoice = (newInv) => {
        const nextNum = invoices.length + 1;
        newInv.number = `F-2026-${String(nextNum).padStart(4, "0")}`;
        newInv.status = "draft";
        setInvoices([newInv, ...invoices]);
        setShowNewModal(false);
        openDetail(newInv);
        showToast(`✓ Facture ${newInv.number} créée en brouillon !`);
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
