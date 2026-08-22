import React, { useState, useEffect } from "react";
import { History, Download, Calendar, FileText } from "lucide-react";
import { apiFetch } from "../../utils/api";

function ExportHistory() {
    const [realExports, setRealExports] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadHistory = async () => {
            try {
                const [repRes, invRes] = await Promise.all([
                    apiFetch('/v1/reports/revenue?year=2026'),
                    apiFetch('/v1/invoices')
                ]);

                const invList = invRes.data?.invoices || invRes.invoices || (Array.isArray(invRes) ? invRes : []);
                setInvoices(invList);

                const quarters = repRes.data?.quarters || {};
                const list = [];

                ["T3", "T2", "T1"].forEach((q) => {
                    const qData = quarters[q];
                    if (qData && qData.totalBase > 0) {
                        // Count invoices in this quarter
                        const qInvoices = invList.filter(inv => {
                            const d = new Date(inv.createdAt);
                            const m = d.getMonth();
                            const itemQ = m <= 2 ? "T1" : m <= 5 ? "T2" : m <= 8 ? "T3" : "T4";
                            return itemQ === q;
                        });

                        list.push({
                            id: `${q}-2026`,
                            period: `${q} 2026`,
                            count: qInvoices.length,
                            amount: qData.totalBase,
                            tva: qData.totalTva,
                            date: new Date().toLocaleDateString("fr-FR"),
                            invoices: qInvoices
                        });
                    }
                });

                setRealExports(list);
            } catch (err) {
                console.warn("Erreur chargement historique exports:", err.message);
            } finally {
                setLoading(false);
            }
        };

        loadHistory();
    }, []);

    const handleDownloadHistorical = (exp) => {
        const targetInvoices = exp.invoices && exp.invoices.length > 0 
            ? exp.invoices 
            : invoices;

        const rows = [
            ["Facture N*", "Client", "Montant HT", "Montant TVA", "Montant TTC", "Statut", "Date de creation"]
        ];

        targetInvoices.forEach(inv => {
            const clientName = inv.client 
                ? `${inv.client.firstName || ''} ${inv.client.lastName || inv.client.companyName || ''}`.trim() 
                : (inv.clientName || 'Client');
            
            rows.push([
                inv.number || `INV-${inv.id}`,
                clientName,
                inv.amountHT || inv.totalHt || 0,
                inv.amountTTC ? Math.round((inv.amountTTC - (inv.amountHT || 0)) * 100) / 100 : 0,
                inv.amountTTC || inv.totalTtc || 0,
                inv.status || 'draft',
                inv.createdAt ? new Date(inv.createdAt).toLocaleDateString('fr-FR') : ''
            ]);
        });

        let csvContent = "data:text/csv;charset=utf-8,";
        rows.forEach(function(rowArray) {
            let row = rowArray.join(";");
            csvContent += row + "\r\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Export_Comptable_${exp.period.replace(" ", "_")}.csv`);
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
                {realExports.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "28px 16px", color: "var(--muted-foreground)", fontSize: "13px" }}>
                        Aucun export pour le moment. Vous pouvez exporter vos factures via le formulaire ci-dessus.
                    </div>
                ) : (
                    realExports.map((exp) => (
                        <div key={exp.id} className="history-item">
                            <div className="history-meta">
                                <span className="period-badge">{exp.period}</span>
                                <div className="details-row">
                                    <span className="stat">{exp.count} facture{exp.count > 1 ? 's' : ''}</span>
                                    <span className="dot">•</span>
                                    <span className="amount"><strong>{exp.amount.toLocaleString("fr-FR")} € HT</strong></span>
                                </div>
                            </div>
                            <div className="history-actions">
                                <span className="export-date">Disponible</span>
                                <button 
                                    className="download-btn-circle" 
                                    onClick={() => handleDownloadHistorical(exp)}
                                    title="Télécharger l'export CSV"
                                >
                                    <Download size={14} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default ExportHistory;
