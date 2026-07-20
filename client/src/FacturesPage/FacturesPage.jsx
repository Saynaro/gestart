import React, { useState } from "react";
import { Plus } from "lucide-react";
import "./FacturesPage.css";

// Layout components
import SideBar from "../components/SideBar";
import Header from "../components/Header";

// Modular components
import InvoiceStats from "./components/InvoiceStats";
import InvoiceTable from "./components/InvoiceTable";
import NewInvoiceModal from "./components/NewInvoiceModal";
import SendOptionsModal from "./components/SendOptionsModal";
import InvoicePdfView from "./components/InvoicePdfView";

function FacturesPage() {
    const [invoices, setInvoices] = useState([
        {
            id: 1,
            number: "INV-2026-001",
            clientName: "Jean Dupont",
            clientEmail: "jean.dupont@email.com",
            clientAddress: "12 Rue des Fleurs, 75001 Paris",
            interventionType: "Entretien annuel",
            workDetails: "Entretien annuel complet de la pompe à chaleur air-air Daikin.",
            date: "2026-07-02",
            tvaRate: 20,
            subtotalHt: 100,
            tvaAmount: 20,
            totalTtc: 120,
            status: "paid",
            lines: [
                { description: "Forfait Entretien annuel PAC", qty: 1, unitPrice: 100 }
            ]
        },
        {
            id: 2,
            number: "INV-2026-002",
            clientName: "Marie Martin",
            clientEmail: "marie.martin@email.com",
            clientAddress: "45 Avenue Foch, 69006 Lyon",
            interventionType: "Dépannage d'urgence",
            workDetails: "Recherche de fuite de fluide frigorigène et réparation sur climatisation.",
            date: "2026-07-10",
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
            number: "INV-2026-003",
            clientName: "Garage Central",
            clientEmail: "contact@garagecentral.com",
            clientAddress: "8 Boulevard de l'Industrie, 44000 Nantes",
            interventionType: "Installation pompe à chaleur",
            workDetails: "Installation complète d'une pompe à chaleur air-eau Mitsubishi.",
            date: "2026-06-15",
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
            number: "INV-2026-004",
            clientName: "Marc Leroy",
            clientEmail: "marc.leroy@outlook.fr",
            clientAddress: "109 Rue Saint-Dizier, 54000 Nancy",
            interventionType: "Contrôle d'étanchéité",
            workDetails: "Contrôle réglementaire périodique d'étanchéité du circuit frigorifique.",
            date: "2026-07-18",
            tvaRate: 20,
            subtotalHt: 150,
            tvaAmount: 30,
            totalTtc: 180,
            status: "pending",
            lines: [
                { description: "Contrôle d'étanchéité frigorifique", qty: 1, unitPrice: 150 }
            ]
        }
    ]);

    // Modals toggles
    const [showNewModal, setShowNewModal] = useState(false);
    const [showSendModal, setShowSendModal] = useState(false);
    const [showPdfModal, setShowPdfModal] = useState(false);
    const [activeInvoice, setActiveInvoice] = useState(null);

    const handleCreateInvoice = (newInv) => {
        // Format document number
        const nextNum = invoices.length + 1;
        newInv.number = `INV-2026-${String(nextNum).padStart(3, "0")}`;
        setInvoices([newInv, ...invoices]);
        setShowNewModal(false);
        setActiveInvoice(newInv);
        setShowSendModal(true); // Open sharing selector modal immediately after creation
    };

    const handleViewInvoice = (inv) => {
        setActiveInvoice(inv);
        setShowPdfModal(true);
    };

    const handleDownloadPdf = (inv) => {
        // Generate and download mock invoice summary as text
        const textContent = `
========================================
       FACTURE - ${inv.number}       
========================================
Date: ${new Date(inv.date).toLocaleDateString("fr-FR")}
Client: ${inv.clientName} (${inv.clientEmail})
Type: ${inv.interventionType}
----------------------------------------
Detail:
${inv.lines.map(l => `- ${l.description} x${l.qty} : ${l.unitPrice} € HT`).join("\n")}
----------------------------------------
Sous-total HT: ${inv.subtotalHt.toLocaleString("fr-FR")} €
TVA (${inv.tvaRate}%): ${inv.tvaAmount.toLocaleString("fr-FR")} €
Total TTC: ${inv.totalTtc.toLocaleString("fr-FR")} €
========================================
`;
        const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `Facture_${inv.number}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleMarkPaid = (inv) => {
        setInvoices(invoices.map(i => i.id === inv.id ? { ...i, status: "paid" } : i));
        alert(`✓ La facture ${inv.number} a été marquée comme Payée !`);
    };

    const handleSendOption = (inv) => {
        setActiveInvoice(inv);
        setShowSendModal(true);
    };

    const handleRemindOption = (inv) => {
        alert(`✉️ Un e-mail de rappel a été envoyé au client ${inv.clientName} (${inv.clientEmail}) pour la facture ${inv.number}.`);
    };

    const handleCancelOption = (inv) => {
        if (confirm(`Voulez-vous vraiment annuler la facture ${inv.number} ?`)) {
            setInvoices(invoices.map(i => i.id === inv.id ? { ...i, status: "cancelled" } : i));
        }
    };

    // Send options callbacks
    const handleSelfSend = (inv) => {
        handleDownloadPdf(inv);
        window.open(`mailto:${inv.clientEmail}?subject=Facture%20${inv.number}&body=Bonjour,%20veuillez%20trouver%20ci-joint%20votre%20facture%20${inv.number}.`);
        setShowSendModal(false);
    };

    const handleAutoSend = (inv) => {
        alert(`✓ E-mail envoyé automatiquement à ${inv.clientEmail} avec la facture ${inv.number} jointe.`);
        setShowSendModal(false);
    };

    const handleCreatePaymentLink = (inv) => {
        const stripeLink = `https://climpro.fr/pay/invoice/mock_token_${inv.id}`;
        alert(`✓ Lien Stripe Checkout généré : ${stripeLink}`);
        setShowSendModal(false);
    };

    return (
        <div className="home-page factures-page-wrapper">
            <SideBar onFabClick={() => setShowNewModal(true)} />
            <div className="main-content">
                <Header />
                <div className="page-content">
                    {/* Header */}
                    <div className="content-header factures-header-row">
                        <div>
                            <h1 className="content-title">Factures</h1>
                            <p className="content-subtitle">Gérez et suivez vos règlements clients.</p>
                        </div>
                        <button 
                            className="create-facture-btn"
                            onClick={() => setShowNewModal(true)}
                        >
                            <Plus size={16} /> Nouvelle facture
                        </button>
                    </div>

                    {/* Stats counters */}
                    <InvoiceStats invoices={invoices} />

                    {/* Invoices table widget */}
                    <div className="invoices-list-widget">
                        <div className="widget-header">
                            <h3>Historique des factures</h3>
                        </div>
                        <InvoiceTable 
                            invoices={invoices}
                            onView={handleViewInvoice}
                            onDownloadPdf={handleDownloadPdf}
                            onMarkPaid={handleMarkPaid}
                            onSend={handleSendOption}
                            onRemind={handleRemindOption}
                            onCancel={handleCancelOption}
                        />
                    </div>
                </div>
            </div>

            {/* Modal: New Invoice */}
            {showNewModal && (
                <NewInvoiceModal 
                    onClose={() => setShowNewModal(false)}
                    onCreateInvoice={handleCreateInvoice}
                />
            )}

            {/* Modal: Sharing Options */}
            {showSendModal && (
                <SendOptionsModal 
                    invoice={activeInvoice}
                    onClose={() => setShowSendModal(false)}
                    onSelfSend={handleSelfSend}
                    onAutoSend={handleAutoSend}
                    onCreatePaymentLink={handleCreatePaymentLink}
                />
            )}

            {/* Modal: PDF print preview */}
            {showPdfModal && (
                <InvoicePdfView 
                    invoice={activeInvoice}
                    onClose={() => setShowPdfModal(false)}
                    onDownload={handleDownloadPdf}
                />
            )}
        </div>
    );
}

export default FacturesPage;
