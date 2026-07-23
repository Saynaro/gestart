import React, { useState } from "react";
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

const FILTERS = [
    { key: "all",      label: "Tous" },
    { key: "DRAFT",    label: "Brouillon" },
    { key: "SENT",     label: "En attente" },
    { key: "ACCEPTED", label: "Signé" },
    { key: "REFUSED",  label: "Refusé" },
];

function DevisPage() {
    const [quotes, setQuotes] = useState([
        {
            id: 1,
            number: "D-2026-0001",
            clientName: "Jean Dupont",
            clientEmail: "jean.dupont@email.com",
            clientAddress: "12 Rue des Fleurs, 75001 Paris",
            interventionType: "Entretien annuel",
            workDetails: "Entretien annuel complet de la pompe à chaleur air-air Daikin.",
            date: "2026-07-02",
            validityDays: 30,
            tvaRate: 20,
            subtotalHt: 100,
            tvaAmount: 20,
            totalTtc: 120,
            amountFactured: 0,
            status: "ACCEPTED",
            lines: [{ description: "Forfait Entretien annuel PAC", qty: 1, unitPrice: 100 }]
        },
        {
            id: 2,
            number: "D-2026-0002",
            clientName: "Marie Martin",
            clientEmail: "marie.martin@email.com",
            clientAddress: "45 Avenue Foch, 69006 Lyon",
            interventionType: "Dépannage d'urgence",
            workDetails: "Recherche de fuite de fluide frigorigène et réparation sur climatisation.",
            date: "2026-07-10",
            validityDays: 30,
            tvaRate: 10,
            subtotalHt: 218.18,
            tvaAmount: 21.82,
            totalTtc: 240,
            amountFactured: 0,
            status: "SENT",
            lines: [
                { description: "Forfait dépannage et diagnostic", qty: 1, unitPrice: 150 },
                { description: "Recharge de fluide R32 (kg)", qty: 0.8, unitPrice: 85.22 }
            ]
        },
        {
            id: 3,
            number: "D-2026-0003",
            clientName: "Marc Leroy",
            clientEmail: "marc.leroy@outlook.fr",
            clientAddress: "109 Rue Saint-Dizier, 54000 Nancy",
            interventionType: "Installation pompe à chaleur",
            workDetails: "Fourniture et pose d'une pompe à chaleur air-eau Mitsubishi.",
            date: "2026-07-15",
            validityDays: 30,
            tvaRate: 5.5,
            subtotalHt: 4500,
            tvaAmount: 247.5,
            totalTtc: 4747.5,
            amountFactured: 0,
            status: "DRAFT",
            lines: [
                { description: "Pompe à chaleur air-eau Mitsubishi 10kW", qty: 1, unitPrice: 3800 },
                { description: "Main d'œuvre pose et raccordement", qty: 1, unitPrice: 700 }
            ]
        }
    ]);

    const [activeFilter, setActiveFilter] = useState("all");
    const [activeQuote, setActiveQuote] = useState(null);
    const [showDetailDrawer, setShowDetailDrawer] = useState(false);
    const [showSendDrawer, setShowSendDrawer] = useState(false);
    const [showPdfModal, setShowPdfModal] = useState(false);
    const [showNewModal, setShowNewModal] = useState(false);
    const [showEditPanel, setShowEditPanel] = useState(false);
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

    const handleSaveEdit = (updatedQuote) => {
        setQuotes(prev => prev.map(q => q.id === updatedQuote.id ? updatedQuote : q));
        setActiveQuote(updatedQuote);
        setShowEditPanel(false);
        showToast(`✓ Devis ${updatedQuote.number} mis à jour.`);
    };

    const handleConvertToInvoice = (q) => {
        setQuotes(prev => prev.map(item => item.id === q.id ? { ...item, status: "ACCEPTED" } : item));
        setActiveQuote(prev => ({ ...prev, status: "ACCEPTED" }));
        closeAll();
        showToast(`✓ Devis ${q.number} converti en facture ! Retrouvez-la dans Factures.`);
    };

    const handleChangeStatus = (q, newStatus) => {
        setQuotes(prev => prev.map(item => item.id === q.id ? { ...item, status: newStatus } : item));
        setActiveQuote(prev => ({ ...prev, status: newStatus }));
        showToast(`Statut du devis ${q.number} mis à jour.`, "info");
    };

    const handleSend = (q) => {
        setQuotes(prev => prev.map(item => item.id === q.id ? { ...item, status: "SENT" } : item));
        setShowSendDrawer(false);
        showToast(`✓ Devis ${q.number} envoyé à ${q.clientEmail}`);
    };

    const handleAutoSend = (q) => {
        setShowSendDrawer(false);
        showToast(`✓ E-mail professionnel envoyé à ${q.clientEmail}`);
    };

    const handleCreateQuote = (newQuote) => {
        const nextNum = quotes.length + 1;
        newQuote.number = `D-2026-${String(nextNum).padStart(4, "0")}`;
        newQuote.status = "DRAFT";
        newQuote.amountFactured = 0;
        setQuotes([newQuote, ...quotes]);
        setShowNewModal(false);
        openDetail(newQuote);
        showToast(`✓ Devis ${newQuote.number} créé en brouillon !`);
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
