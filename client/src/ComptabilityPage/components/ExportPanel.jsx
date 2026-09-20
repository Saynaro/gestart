import React, { useState, useEffect } from "react";
import { Download, FileSpreadsheet, FileText, FileCode, Loader2 } from "lucide-react";
import { apiFetch } from "../../utils/api";
import { getAuthToken } from "../../utils/auth";
import { getApiUrl } from "../../utils/config";

const formatDateToISO = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const getQuarterRange = (year, quarterIdx) => {
    const start = new Date(year, quarterIdx * 3, 1);
    const end = new Date(year, (quarterIdx + 1) * 3, 0);
    return {
        start: formatDateToISO(start),
        end: formatDateToISO(end)
    };
};

function ExportPanel() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentQuarterIdx = Math.floor(now.getMonth() / 3);
    const defaultStart = formatDateToISO(new Date(currentYear, 0, 1));
    const defaultEnd = formatDateToISO(new Date(currentYear, 11, 31));

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
                                    const yr = d.getFullYear();
                                    if (t.id === "mensuel") {
                                        setStartDate(formatDateToISO(new Date(yr, d.getMonth(), 1)));
                                        setEndDate(formatDateToISO(new Date(yr, d.getMonth() + 1, 0)));
                                    } else if (t.id === "trimestriel") {
                                        const qRange = getQuarterRange(yr, Math.floor(d.getMonth() / 3));
                                        setStartDate(qRange.start);
                                        setEndDate(qRange.end);
                                    } else if (t.id === "annuel") {
                                        setStartDate(formatDateToISO(new Date(yr, 0, 1)));
                                        setEndDate(formatDateToISO(new Date(yr, 11, 31)));
                                    }
                                }}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* Quarter Sub-selectors when Trimestriel is selected */}
                    {exportType === "trimestriel" && (
                        <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
                            {[
                                { q: 0, label: "T1 (Jan-Mar)" },
                                { q: 1, label: "T2 (Avr-Juin)" },
                                { q: 2, label: "T3 (Juil-Sep)" },
                                { q: 3, label: "T4 (Oct-Déc)" }
                            ].map((item) => {
                                const qRange = getQuarterRange(new Date().getFullYear(), item.q);
                                const isCurrentQ = startDate === qRange.start && endDate === qRange.end;
                                return (
                                    <button
                                        key={item.q}
                                        type="button"
                                        onClick={() => {
                                            setStartDate(qRange.start);
                                            setEndDate(qRange.end);
                                        }}
                                        style={{
                                            flex: 1,
                                            padding: "6px 2px",
                                            fontSize: "11px",
                                            fontWeight: isCurrentQ ? 700 : 500,
                                            borderRadius: "8px",
                                            border: isCurrentQ ? "1.5px solid #556B2F" : "1px solid var(--border)",
                                            backgroundColor: isCurrentQ ? "rgba(85, 107, 47, 0.15)" : "var(--card)",
                                            color: isCurrentQ ? "#556B2F" : "var(--muted-foreground)",
                                            cursor: "pointer",
                                            transition: "all 0.15s ease",
                                            textAlign: "center"
                                        }}
                                    >
                                        {item.label}
                                    </button>
                                );
                            })}
                        </div>
                    )}
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
