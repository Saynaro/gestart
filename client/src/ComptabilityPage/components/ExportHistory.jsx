import React, { useState, useEffect, useCallback } from "react";
import { History, Download, FileSpreadsheet, FileText, FileCode, Loader2, ChevronDown, Clock } from "lucide-react";
import { apiFetch } from "../../utils/api";
import { getAuthToken } from "../../utils/auth";
import { getApiUrl } from "../../utils/config";

function ExportHistory() {
    const [historyList, setHistoryList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [visibleCount, setVisibleCount] = useState(10);
    const [downloadingId, setDownloadingId] = useState(null);

    const loadHistory = useCallback(async () => {
        try {
            const res = await apiFetch("/v1/reports/export/history");
            let items = res.history || [];

            // If empty, fetch quarterly data to propose initial exports
            if (items.length === 0) {
                const repRes = await apiFetch("/v1/reports/revenue?year=2026");
                const quarters = repRes.data?.quarters || {};
                const now = new Date();
                const fallback = [];

                ["T3", "T2", "T1"].forEach((q) => {
                    const qData = quarters[q];
                    if (qData && qData.totalBase > 0) {
                        const start = q === "T1" ? "2026-01-01" : q === "T2" ? "2026-04-01" : "2026-07-01";
                        const end = q === "T1" ? "2026-03-31" : q === "T2" ? "2026-06-30" : "2026-09-30";
                        fallback.push({
                            id: `init_${q}`,
                            format: "excel",
                            filename: `Export_Comptable_${q}_2026.xlsx`,
                            periodLabel: `${q} 2026`,
                            startDate: start,
                            endDate: end,
                            invoicesCount: qData.invoicesCount || 1,
                            totalHT: qData.totalBase || 0,
                            createdAt: now.toISOString()
                        });
                    }
                });
                items = fallback;
            }

            setHistoryList(items);
        } catch (err) {
            console.warn("Erreur chargement historique exports:", err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadHistory();

        const handleExportCompleted = () => {
            loadHistory();
        };

        window.addEventListener("export_completed", handleExportCompleted);
        return () => {
            window.removeEventListener("export_completed", handleExportCompleted);
        };
    }, [loadHistory]);

    const handleReDownload = async (exp) => {
        if (downloadingId) return;
        setDownloadingId(exp.id);
        try {
            const token = getAuthToken();
            const format = exp.format || "excel";
            const startDate = exp.startDate || "2026-01-01";
            const endDate = exp.endDate || "2026-12-31";

            const url = getApiUrl(`/v1/reports/export/${format}?startDate=${startDate}&endDate=${endDate}`);

            const response = await fetch(url, {
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                credentials: "include"
            });

            if (!response.ok) {
                throw new Error("Erreur de téléchargement");
            }

            const blob = await response.blob();
            const filename = exp.filename || `Export_Comptable_${startDate}_au_${endDate}.${format === 'excel' ? 'xlsx' : format === 'pdf' ? 'pdf' : 'txt'}`;

            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = downloadUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(downloadUrl);
        } catch (e) {
            console.error("Download history error:", e);
            alert("Erreur lors du téléchargement de l'export");
        } finally {
            setDownloadingId(null);
        }
    };

    const getFormatBadge = (format) => {
        switch (format) {
            case "pdf":
                return { label: ".PDF", icon: <FileText size={12} />, className: "pdf" };
            case "txt":
                return { label: ".TXT", icon: <FileCode size={12} />, className: "txt" };
            case "excel":
            default:
                return { label: ".XLSX", icon: <FileSpreadsheet size={12} />, className: "excel" };
        }
    };

    const visibleItems = historyList.slice(0, visibleCount);
    const hasMore = historyList.length > visibleCount;

    return (
        <div className="comptability-card">
            <div className="widget-header">
                <div className="title-area">
                    <div className="header-icon-container">
                        <History size={18} />
                    </div>
                    <div>
                        <h3>Historique des Exports</h3>
                        <p className="subtitle">Retéléchargez vos 20 derniers exports ({historyList.length})</p>
                    </div>
                </div>
            </div>

            <div className="history-list">
                {loading ? (
                    <div style={{ textAlign: "center", padding: "24px", color: "var(--muted-foreground)" }}>
                        <Loader2 size={20} className="animate-spin" style={{ margin: "0 auto 8px" }} />
                        <span>Chargement de l'historique...</span>
                    </div>
                ) : historyList.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "28px 16px", color: "var(--muted-foreground)", fontSize: "13px" }}>
                        Aucun export pour le moment. Vos exports apparaîtront ici dès que vous en générerez un.
                    </div>
                ) : (
                    <>
                        {visibleItems.map((exp) => {
                            const badge = getFormatBadge(exp.format);
                            const exportDate = exp.createdAt ? new Date(exp.createdAt) : new Date();
                            const formattedDate = exportDate.toLocaleDateString("fr-FR", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric"
                            });
                            const formattedTime = exportDate.toLocaleTimeString("fr-FR", {
                                hour: "2-digit",
                                minute: "2-digit"
                            });

                            return (
                                <div key={exp.id} className="history-item-compact">
                                    <div className="history-compact-left">
                                        <div className="history-compact-title-row">
                                            <span className={`history-format-pill-sm ${badge.className}`}>
                                                {badge.icon} {badge.label}
                                            </span>
                                            <span className="history-compact-title">{exp.periodLabel || exp.filename || "Export Comptable"}</span>
                                        </div>
                                        <div className="history-compact-meta-row">
                                            <span className="compact-stat">{exp.invoicesCount || exp.count || 0} fact.</span>
                                            <span className="compact-dot">•</span>
                                            <span className="compact-amount">{(Number(exp.totalHT || exp.amount || 0)).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € HT</span>
                                            <span className="compact-dot">•</span>
                                            <span className="compact-date">{formattedDate} à {formattedTime}</span>
                                        </div>
                                    </div>
                                    <button 
                                        className="download-btn-compact" 
                                        onClick={() => handleReDownload(exp)}
                                        disabled={downloadingId === exp.id}
                                        title="Retélécharger ce fichier"
                                    >
                                        {downloadingId === exp.id ? (
                                            <Loader2 size={13} className="animate-spin" />
                                        ) : (
                                            <Download size={13} />
                                        )}
                                    </button>
                                </div>
                            );
                        })}

                        {hasMore && (
                            <div style={{ textAlign: "center", marginTop: "12px" }}>
                                <button
                                    onClick={() => setVisibleCount((prev) => Math.min(20, prev + 10))}
                                    className="history-load-more-btn"
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        padding: "9px 18px",
                                        backgroundColor: "var(--background)",
                                        border: "1px solid var(--border)",
                                        borderRadius: "8px",
                                        fontSize: "12px",
                                        fontWeight: "600",
                                        color: "var(--foreground)",
                                        cursor: "pointer",
                                        transition: "all 0.2s"
                                    }}
                                >
                                    <ChevronDown size={14} /> Afficher plus ({historyList.length - visibleCount} restants)
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export default ExportHistory;
