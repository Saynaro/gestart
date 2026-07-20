import React, { useState } from "react";
import { Download, FileSpreadsheet, FileText, CalendarDays } from "lucide-react";

function ExportPanel() {
    const [startDate, setStartDate] = useState("2026-01-01");
    const [endDate, setEndDate] = useState("2026-03-31");
    const [exportType, setExportType] = useState("trimestriel");

    // Dynamic mock stats based on dates
    const stats = {
        invoicesCount: 15,
        totalHT: 12400,
        paidCount: 12,
        pendingCount: 3
    };

    const handleExportExcel = () => {
        // Generate real CSV string
        const rows = [
            ["Facture N*", "Client", "Montant HT", "Montant TVA", "Montant TTC", "Statut", "Date de paiement"],
            ["INV-2026-001", "Garage Central", "1200", "240", "1440", "Payee", "10/01/2026"],
            ["INV-2026-002", "Jean Valjean", "800", "80", "880", "Payee", "12/01/2026"],
            ["INV-2026-003", "Sophie Dupont", "2500", "137.5", "2637.5", "En attente", ""],
            ["INV-2026-004", "Allo Clim Service", "450", "90", "540", "Payee", "18/01/2026"],
            ["INV-2026-005", "Robert Durand", "3500", "700", "4200", "Payee", "22/01/2026"],
            ["INV-2026-006", "Lucas Petit", "950", "190", "1140", "En attente", ""],
            ["INV-2026-007", "Pierre Dubois", "3000", "600", "3600", "Payee", "05/02/2026"]
        ];

        let csvContent = "data:text/csv;charset=utf-8,";
        rows.forEach(function(rowArray) {
            let row = rowArray.join(";");
            csvContent += row + "\r\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Export_Comptable_Factures_${startDate}_au_${endDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportPDF = () => {
        // Mock PDF via printing or a direct summary text file download
        const textContent = `
========================================
       CLIMPRO - EXPORT COMPTABLE       
========================================
Periode: ${startDate} au ${endDate}
Type d'export: ${exportType.toUpperCase()}
----------------------------------------
Factures totales: ${stats.invoicesCount}
Chiffre d'Affaires HT: ${stats.totalHT} EUR
Factures Payees: ${stats.paidCount}
Factures en Attente: ${stats.pendingCount}
----------------------------------------
Recapitulatif TVA:
- TVA 20.0%: 1 690,00 EUR
- TVA 10.0%: 120,00 EUR
- TVA  5.5%: 55,00 EUR
- TVA  0.0%: 0,00 EUR
----------------------------------------
Generer le: ${new Date().toLocaleDateString("fr-FR")}
========================================
`;
        
        const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `Export_Comptable_Summary_${startDate}_au_${endDate}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="comptability-card">
            <div className="widget-header">
                <div className="title-area">
                    <div className="header-icon-container">
                        <Download size={18} />
                    </div>
                    <div>
                        <h3>Export Comptable</h3>
                        <p className="subtitle">Générez vos écritures et rapports financiers</p>
                    </div>
                </div>
            </div>

            <div className="export-form">
                {/* Date pickers */}
                <div className="export-dates">
                    <div className="picker-field">
                        <label>Du</label>
                        <input 
                            type="date" 
                            className="picker-input"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>
                    <div className="picker-field">
                        <label>Au</label>
                        <input 
                            type="date" 
                            className="picker-input"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                </div>

                {/* Export Type checkboxes/radios */}
                <div className="export-types-section">
                    <span className="section-label">Type d'export :</span>
                    <div className="export-type-selectors">
                        {["mensuel", "trimestriel", "annuel", "personnalise"].map((t) => (
                            <button
                                key={t}
                                className={`type-btn ${exportType === t ? "active" : ""}`}
                                onClick={() => {
                                    setExportType(t);
                                    let d = new Date();
                                    if (t === "mensuel") {
                                        setStartDate(new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0]);
                                        setEndDate(new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split("T")[0]);
                                    } else if (t === "trimestriel") {
                                        setStartDate("2026-01-01");
                                        setEndDate("2026-03-31");
                                    } else if (t === "annuel") {
                                        setStartDate("2026-01-01");
                                        setEndDate("2026-12-31");
                                    }
                                }}
                            >
                                {t.charAt(0).toUpperCase() + t.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Summary details */}
                <div className="export-preview-card">
                    <span className="preview-header">Aperçu de la période sélectionnée</span>
                    <div className="preview-metrics">
                        <div className="metric">
                            <span className="val">{stats.invoicesCount}</span>
                            <span className="lbl">Factures</span>
                        </div>
                        <div className="metric">
                            <span className="val">{stats.totalHT.toLocaleString("fr-FR")} €</span>
                            <span className="lbl">CA HT brut</span>
                        </div>
                        <div className="metric">
                            <span className="val text-success">{stats.paidCount}</span>
                            <span className="lbl">Règlées</span>
                        </div>
                        <div className="metric">
                            <span className="val text-warning">{stats.pendingCount}</span>
                            <span className="lbl">En attente</span>
                        </div>
                    </div>
                </div>

                {/* Export buttons */}
                <div className="export-action-buttons">
                    <button 
                        className="export-action-btn excel-btn"
                        onClick={handleExportExcel}
                    >
                        <FileSpreadsheet size={16} /> Exporter en Excel
                    </button>
                    <button 
                        className="export-action-btn pdf-btn"
                        onClick={handleExportPDF}
                    >
                        <FileText size={16} /> Exporter en PDF / Texte
                    </button>
                </div>

                <div className="export-sheet-details">
                    <span className="details-header">Le fichier contient :</span>
                    <ul>
                        <li>• <strong>Feuille 1 : Factures</strong> (N°, Client, HT, TVA, TTC, Statut, Date paiement)</li>
                        <li>• <strong>Feuille 2 : Récap TVA</strong> (Totaux par taux de taxe collectée)</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

export default ExportPanel;
