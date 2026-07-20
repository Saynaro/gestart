import React from "react";
import { History, Download, Calendar } from "lucide-react";

function ExportHistory() {
    const exports = [
        { id: "T1-2026", period: "T1 2026", count: 15, amount: 12400, date: "18/04/2026" },
        { id: "Dec-2025", period: "Déc 2025", count: 8, amount: 5200, date: "03/01/2026" },
        { id: "T4-2025", period: "T4 2025", count: 28, amount: 18700, date: "05/01/2026" }
    ];

    const handleDownloadHistorical = (exp) => {
        // Trigger a CSV download matching the historical export
        const csvContent = "data:text/csv;charset=utf-8," 
            + "Facture N*;Client;Montant HT;Montant TVA;Montant TTC;Statut\n"
            + `INV-${exp.period}-001;Client Historique A;${exp.amount * 0.4};${exp.amount * 0.08};${exp.amount * 0.48};Payee\n`
            + `INV-${exp.period}-002;Client Historique B;${exp.amount * 0.6};${exp.amount * 0.12};${exp.amount * 0.72};Payee\n`;
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Export_Historique_${exp.period.replace(" ", "_")}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="comptability-card">
            <div className="widget-header">
                <div className="title-area">
                    <div className="header-icon-container">
                        <History size={18} />
                    </div>
                    <div>
                        <h3>Historique des Exports</h3>
                        <p className="subtitle">Retéléchargez vos exports comptables précédents</p>
                    </div>
                </div>
            </div>

            <div className="history-list">
                {exports.map((exp) => (
                    <div key={exp.id} className="history-item">
                        <div className="history-meta">
                            <span className="period-badge">{exp.period}</span>
                            <div className="details-row">
                                <span className="stat">{exp.count} factures</span>
                                <span className="dot">•</span>
                                <span className="amount"><strong>{exp.amount.toLocaleString("fr-FR")} €</strong></span>
                            </div>
                        </div>
                        <div className="history-actions">
                            <span className="export-date">Généré le {exp.date}</span>
                            <button 
                                className="download-btn-circle" 
                                onClick={() => handleDownloadHistorical(exp)}
                                title="Télécharger à nouveau"
                            >
                                <Download size={14} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default ExportHistory;
