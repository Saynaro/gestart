import React, { useState } from "react";
import { Plus } from "lucide-react";
import "./DevisPage.css";

// Layout components
import SideBar from "../components/SideBar";
import Header from "../components/Header";

// Modular Components
import QuoteStats from "./components/QuoteStats";
import QuoteTable from "./components/QuoteTable";
import NewQuoteModal from "./components/NewQuoteModal";
import QuotePdfView from "./components/QuotePdfView";

function DevisPage() {
    const [quotes, setQuotes] = useState([
        {
            id: 1,
            number: "DEV-2026-001",
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
            status: "ACCEPTED",
            lines: [
                { description: "Forfait Entretien annuel PAC", qty: 1, unitPrice: 100 }
            ]
        },
        {
            id: 2,
            number: "DEV-2026-002",
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
            status: "SENT",
            lines: [
                { description: "Forfait dépannage et diagnostic", qty: 1, unitPrice: 150 },
                { description: "Recharge de fluide R32 (kg)", qty: 0.8, unitPrice: 85.22 }
            ]
        },
        {
            id: 3,
            number: "DEV-2026-003",
            clientName: "Marc Leroy",
            clientEmail: "marc.leroy@outlook.fr",
            clientAddress: "109 Rue Saint-Dizier, 54000 Nancy",
            interventionType: "Installation pompe à chaleur",
            workDetails: "Fourniture et pose d'une pompe à chaleur air-eau Mitsubishi.",
            date: "2026-07-15",
            tvaRate: 5.5,
            subtotalHt: 4500,
            tvaAmount: 247.5,
            totalTtc: 4747.5,
            status: "DRAFT",
            lines: [
                { description: "Pompe à chaleur air-eau Mitsubishi 10kW", qty: 1, unitPrice: 3800 },
                { description: "Main d'œuvre pose et raccordement", qty: 1, unitPrice: 700 }
            ]
        }
    ]);

    const [showNewModal, setShowNewModal] = useState(false);
    const [showPdfModal, setShowPdfModal] = useState(false);
    const [activeQuote, setActiveQuote] = useState(null);

    const handleCreateQuote = (newQuote) => {
        const nextNum = quotes.length + 1;
        newQuote.number = `DEV-2026-${String(nextNum).padStart(3, "0")}`;
        setQuotes([newQuote, ...quotes]);
        setShowNewModal(false);
        alert(`✓ Le devis ${newQuote.number} a été créé en tant que Brouillon !`);
    };

    const handleViewQuote = (q) => {
        setActiveQuote(q);
        setShowPdfModal(true);
    };

    const handleDownloadPdf = (q) => {
        const textContent = `
========================================
       DEVIS - ${q.number}       
========================================
Date: ${new Date(q.date).toLocaleDateString("fr-FR")}
Validite: 30 Jours
Client: ${q.clientName} (${q.clientEmail})
Type: ${q.interventionType}
----------------------------------------
Detail:
${q.lines.map(l => `- ${l.description} x${l.qty} : ${l.unitPrice} € HT`).join("\n")}
----------------------------------------
Sous-total HT: ${q.subtotalHt.toLocaleString("fr-FR")} €
TVA (${q.tvaRate}%): ${q.tvaAmount.toLocaleString("fr-FR")} €
Total TTC: ${q.totalTtc.toLocaleString("fr-FR")} €
========================================
`;
        const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `Devis_${q.number}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleSendForSignature = (q) => {
        const signatureLink = `https://climpro.fr/sign/quote/mock_token_devis_${q.id}`;
        setQuotes(quotes.map(item => item.id === q.id ? { ...item, status: "SENT" } : item));
        alert(`✉️ E-mail avec lien de signature électronique envoyé à ${q.clientName} (${q.clientEmail}) !\nLien client : ${signatureLink}`);
    };

    const handleConvertToInvoice = (q) => {
        alert(`✓ Le devis ${q.number} a été converti avec succès en Facture ! Retrouvez-la dans l'onglet Factures.`);
    };

    const handleRejectQuote = (q) => {
        if (confirm(`Voulez-vous marquer le devis ${q.number} comme refusé ?`)) {
            setQuotes(quotes.map(item => item.id === q.id ? { ...item, status: "REFUSED" } : item));
        }
    };

    return (
        <div className="home-page devis-page-wrapper">
            <SideBar onFabClick={() => setShowNewModal(true)} />
            <div className="main-content">
                <Header />
                <div className="page-content">
                    <div className="content-header devis-header-row">
                        <div>
                            <h1 className="content-title">Devis</h1>
                            <p className="content-subtitle">Créez, envoyez et faites signer vos devis.</p>
                        </div>
                        <button
                            className="create-devis-btn"
                            onClick={() => setShowNewModal(true)}
                        >
                            <Plus size={16} /> Nouveau devis
                        </button>
                    </div>

                    {/* Stats */}
                    <QuoteStats quotes={quotes} />

                    {/* Invoices list card */}
                    <div className="invoices-list-widget">
                        <div className="widget-header">
                            <h3>Historique des devis</h3>
                        </div>
                        <QuoteTable
                            quotes={quotes}
                            onView={handleViewQuote}
                            onDownloadPdf={handleDownloadPdf}
                            onSendForSignature={handleSendForSignature}
                            onConvertToInvoice={handleConvertToInvoice}
                            onRejectQuote={handleRejectQuote}
                        />
                    </div>
                </div>
            </div>

            {/* Modals */}
            {showNewModal && (
                <NewQuoteModal
                    onClose={() => setShowNewModal(false)}
                    onCreateQuote={handleCreateQuote}
                />
            )}

            {showPdfModal && (
                <QuotePdfView
                    quote={activeQuote}
                    onClose={() => setShowPdfModal(false)}
                    onDownload={handleDownloadPdf}
                />
            )}
        </div>
    );
}

export default DevisPage;
