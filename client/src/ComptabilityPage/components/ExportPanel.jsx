import React, { useState, useEffect } from "react";
import { Download, FileSpreadsheet, FileText, FileCode, Loader2 } from "lucide-react";
import { apiFetch } from "../../utils/api";
import { getAuthToken } from "../../utils/auth";
import { getApiUrl } from "../../utils/config";

function ExportPanel() {
    const now = new Date();
    const defaultStart = new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];
    const defaultEnd = new Date(now.getFullYear(), 11, 31).toISOString().split("T")[0];

    const [startDate, setStartDate] = useState(defaultStart);
    const [endDate, setEndDate] = useState(defaultEnd);
    const [exportType, setExportType] = useState("annuel");
    const [loadingFormat, setLoadingFormat] = useState(null); // 'excel' | 'pdf' | 'txt' | null

    // Real stats from database
    const [stats, setStats] = useState({
        invoicesCount: 0,
        totalHT: 0,
        paidCount: 0,
        pendingCount: 0
    });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await apiFetch(`/v1/reports/revenue?startDate=${startDate}&endDate=${endDate}`);
                if (data.data?.summary) {
                    setStats({
                        invoicesCount: data.data.summary.totalInvoices || 0,
                        totalHT: data.data.summary.totalHT || 0,
                        paidCount: data.data.monthly?.filter(m => m.paid > 0).reduce((acc, m) => acc + m.count, 0) || 0,
                        pendingCount: Math.max(0, (data.data.summary.totalInvoices || 0) - (data.data.monthly?.filter(m => m.paid > 0).reduce((acc, m) => acc + m.count, 0) || 0))
                    });
                }
            } catch (e) {
                console.warn("Export stats error:", e);
            }
        };
        fetchStats();
    }, [startDate, endDate]);

    const handleDownload = async (format) => {
        if (loadingFormat) return;
        setLoadingFormat(format);
        try {
            const token = getAuthToken();
            const url = getApiUrl(`/v1/reports/export/${format}?startDate=${startDate}&endDate=${endDate}`);

            const response = await fetch(url, {
                method: "GET",
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                credentials: "include"
            });

            if (!response.ok) {
                let errorMsg = "Erreur lors de l'exportation des données";
                try {
                    const errJson = await response.json();
                    errorMsg = errJson.message || errorMsg;
                } catch (_) {}
                throw new Error(errorMsg);
            }

            const blob = await response.blob();
            const disposition = response.headers.get("Content-Disposition");
            let filename = `Export_Comptable_${startDate}_au_${endDate}.${format === 'excel' ? 'xlsx' : format === 'pdf' ? 'pdf' : 'txt'}`;
            if (disposition && disposition.includes("filename=")) {
                const match = disposition.match(/filename="?([^"]+)"?/);
                if (match && match[1]) filename = match[1];
            }

            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = downloadUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(downloadUrl);

            // Notify history component
            window.dispatchEvent(new CustomEvent("export_completed"));
        } catch (err) {
            console.error("Export error:", err);
            alert("Erreur lors de l'exportation : " + err.message);
        } finally {
            setLoadingFormat(null);
        }
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
                            onChange={(e) => {
                                setStartDate(e.target.value);
                                setExportType("personnalise");
                            }}
                        />
                    </div>
                    <div className="picker-field">
                        <label>Au</label>
                        <input 
                            type="date" 
                            className="picker-input"
                            value={endDate}
                            onChange={(e) => {
                                setEndDate(e.target.value);
                                setExportType("personnalise");
                            }}
                        />
                    </div>
                </div>

                {/* Export Type checkboxes/radios */}
                <div className="export-types-section">
                    <span className="section-label">Type d'export :</span>
                    <div className="export-type-selectors">
                        {[
                            { id: "mensuel", label: "Mensuel" },
                            { id: "trimestriel", label: "Trimestriel" },
                            { id: "annuel", label: "Annuel" },
                            { id: "personnalise", label: "Personnalisé" }
                        ].map((t) => (
                            <button
                                key={t.id}
                                className={`type-btn ${exportType === t.id ? "active" : ""}`}
                                onClick={() => {
                                    setExportType(t.id);
                                    let d = new Date();
                                    if (t.id === "mensuel") {
                                        setStartDate(new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0]);
                                        setEndDate(new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split("T")[0]);
                                    } else if (t.id === "trimestriel") {
                                        setStartDate("2026-01-01");
                                        setEndDate("2026-03-31");
                                    } else if (t.id === "annuel") {
                                        setStartDate("2026-01-01");
                                        setEndDate("2026-12-31");
                                    }
                                }}
                            >
                                {t.label}
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

                {/* Export buttons: Excel, PDF, TXT */}
                <div className="export-action-buttons">
                    <button 
                        className="export-action-btn excel-btn"
                        onClick={() => handleDownload("excel")}
                        disabled={loadingFormat !== null}
                    >
                        {loadingFormat === "excel" ? (
                            <><Loader2 size={16} className="animate-spin" /> Génération Excel...</>
                        ) : (
                            <><FileSpreadsheet size={16} /> Exporter en Excel (.xlsx)</>
                        )}
                    </button>
                    <button 
                        className="export-action-btn pdf-btn"
                        onClick={() => handleDownload("pdf")}
                        disabled={loadingFormat !== null}
                    >
                        {loadingFormat === "pdf" ? (
                            <><Loader2 size={16} className="animate-spin" /> Génération PDF...</>
                        ) : (
                            <><FileText size={16} /> Exporter en PDF (.pdf)</>
                        )}
                    </button>
                    <button 
                        className="export-action-btn txt-btn"
                        onClick={() => handleDownload("txt")}
                        disabled={loadingFormat !== null}
                    >
                        {loadingFormat === "txt" ? (
                            <><Loader2 size={16} className="animate-spin" /> Génération TXT...</>
                        ) : (
                            <><FileCode size={16} /> Exporter en Texte (.txt)</>
                        )}
                    </button>
                </div>

                <div className="export-sheet-details">
                    <span className="details-header">Contenu des exports (données réelles) :</span>
                    <ul>
                        <li>• <strong>Excel (.xlsx) :</strong> Feuille 1 (Toutes les factures et règlements), Feuille 2 (Ventilation TVA 0%, 5.5%, 10%, 20%), Feuille 3 (Cotisations URSSAF & Net)</li>
                        <li>• <strong>PDF (.pdf) :</strong> Synthèse financière officielle prête pour comptable avec en-tête d'entreprise</li>
                        <li>• <strong>Texte (.txt) :</strong> Rapport financier texte brut structuré</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

export default ExportPanel;
