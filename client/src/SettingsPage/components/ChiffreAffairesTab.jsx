import React, { useState, useEffect } from "react";
import { Calculator, AlertTriangle, TrendingUp, DollarSign, PieChart, ArrowUpRight } from "lucide-react";
import { apiFetch } from "../../utils/api";

export default function ChiffreAffairesTab({ isMobileView, triggerToast }) {
    const [currentCA, setCurrentCA] = useState(0);
    const [quartersData, setQuartersData] = useState([
        { name: "T1 (Jan-Mar)", amount: 0, color: "var(--sidebar-primary)" },
        { name: "T2 (Avr-Juin)", amount: 0, color: "var(--sidebar-primary)" },
        { name: "T3 (Juil-Sept)", amount: 0, color: "var(--sidebar-primary)", current: true },
        { name: "T4 (Oct-Déc)", amount: 0, color: "#cbd5e1" }
    ]);
    const [categoryBreakdown, setCategoryBreakdown] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCA = async () => {
            try {
                const data = await apiFetch('/v1/invoices');
                const invoiceList = data.data?.invoices || data.invoices || (Array.isArray(data) ? data : []);

                let totalPaid = 0;
                let t1 = 0, t2 = 0, t3 = 0, t4 = 0;
                const catMap = {};

                if (Array.isArray(invoiceList) && invoiceList.length > 0) {
                    invoiceList.forEach((inv) => {
                        const amount = Number(inv.totalHt || inv.subtotalHt || inv.totalTtc || 0);
                        const isPaid = inv.status === "PAID" || inv.status === "paid";
                        
                        if (isPaid) {
                            totalPaid += amount;

                            const d = new Date(inv.date || inv.createdAt);
                            const month = d.getMonth(); // 0 to 11

                            if (month >= 0 && month <= 2) t1 += amount;
                            else if (month >= 3 && month <= 5) t2 += amount;
                            else if (month >= 6 && month <= 8) t3 += amount;
                            else t4 += amount;

                            const cat = inv.category || "Installations & Climatisation";
                            catMap[cat] = (catMap[cat] || 0) + amount;
                        }
                    });

                    setCurrentCA(totalPaid);

                    const nowMonth = new Date().getMonth();
                    setQuartersData([
                        { name: "T1 (Jan-Mar)", amount: t1, color: "var(--sidebar-primary)", current: nowMonth >= 0 && nowMonth <= 2 },
                        { name: "T2 (Avr-Juin)", amount: t2, color: "var(--sidebar-primary)", current: nowMonth >= 3 && nowMonth <= 5 },
                        { name: "T3 (Juil-Sept)", amount: t3, color: "var(--sidebar-primary)", current: nowMonth >= 6 && nowMonth <= 8 },
                        { name: "T4 (Oct-Déc)", amount: t4, color: "var(--sidebar-primary)", current: nowMonth >= 9 && nowMonth <= 11 }
                    ]);

                    const catEntries = Object.entries(catMap);
                    if (catEntries.length > 0) {
                        setCategoryBreakdown(catEntries.map(([label, amt]) => ({
                            label,
                            amount: amt,
                            share: totalPaid > 0 ? `${Math.round((amt / totalPaid) * 100)}%` : "0%"
                        })));
                    } else {
                        setCategoryBreakdown([
                            { label: "Pompes à chaleur & Climatisation", amount: totalPaid, share: "100%" }
                        ]);
                    }
                }
            } catch (err) {
                console.warn("API CA fallback:", err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchCA();
    }, []);

    const thresholdServices = 37500; // Seuil franchise TVA de base
    const percentage = thresholdServices > 0 ? Math.min(100, Math.round((currentCA / thresholdServices) * 100)) : 0;
    const isWarning = percentage >= 80;
    const projectionYearEnd = Math.round(currentCA > 0 ? currentCA * 1.35 : 0);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Alerte si proche du plafond */}
            {isWarning && (
                <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <AlertTriangle size={22} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
                    <div>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '14.5px', fontWeight: 700, color: '#ef4444' }}>
                            Alerte Franchise TVA : Plafond atteint à {percentage}% !
                        </h4>
                        <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--muted-foreground)', lineHeight: '1.4' }}>
                            Vous êtes à <strong>{Math.max(0, thresholdServices - currentCA).toLocaleString()} €</strong> du seuil de franchise en base de TVA (37 500 €). Si vous dépassez le seuil majoré (39 100 €), vous devrez facturer la TVA sur vos interventions.
                        </p>
                    </div>
                </div>
            )}

            {/* Metric Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                <div style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--muted-foreground)', fontWeight: 600 }}>CA Annuel encaissé (2026)</span>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--foreground)', marginTop: '4px' }}>
                        {currentCA.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} € <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--muted-foreground)' }}>HT</span>
                    </div>
                    <span style={{ fontSize: '11px', color: '#22c55e', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '2px', marginTop: '6px' }}>
                        <ArrowUpRight size={14} /> Factures réglées en temps réel
                    </span>
                </div>

                <div style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--muted-foreground)', fontWeight: 600 }}>Seuil Franchise TVA (Services)</span>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--sidebar-primary)', marginTop: '4px' }}>
                        {thresholdServices.toLocaleString()} €
                    </div>
                    <div style={{ height: '6px', backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: '3px', marginTop: '8px', overflow: 'hidden' }}>
                        <div style={{ width: `${percentage}%`, height: '100%', backgroundColor: isWarning ? '#ef4444' : 'var(--sidebar-primary)', borderRadius: '3px' }} />
                    </div>
                </div>

                <div style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--muted-foreground)', fontWeight: 600 }}>Projection Fin d'année</span>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>
                        ~ {projectionYearEnd.toLocaleString("fr-FR")} €
                    </div>
                    <span style={{ fontSize: '11.5px', color: 'var(--muted-foreground)', marginTop: '4px', display: 'block' }}>Estimation basée sur l'activité en cours</span>
                </div>
            </div>

            {/* Graphique du CA par trimestre */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', backgroundColor: 'var(--card)' }}>
                <h4 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <TrendingUp size={18} style={{ color: 'var(--sidebar-primary)' }} />
                    Chiffre d'affaires par trimestre (2026)
                </h4>

                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', height: '160px', paddingTop: '20px', paddingBottom: '10px', borderBottom: '1px solid var(--border)' }}>
                    {quartersData.map((q) => {
                        const maxAmt = Math.max(10000, currentCA);
                        const heightPct = Math.max(8, Math.round((q.amount / maxAmt) * 100));
                        return (
                            <div key={q.name} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                                <span style={{ fontSize: '11px', fontWeight: 700, marginBottom: '6px', color: q.current ? 'var(--sidebar-primary)' : 'var(--foreground)' }}>
                                    {q.amount > 0 ? `${q.amount.toLocaleString()} €` : '0 €'}
                                </span>
                                <div
                                    style={{
                                        width: '100%',
                                        maxWidth: '48px',
                                        height: `${heightPct}%`,
                                        backgroundColor: q.current ? 'var(--sidebar-primary)' : 'rgba(91, 77, 219, 0.3)',
                                        borderRadius: '6px 6px 0 0',
                                        transition: 'height 0.4s ease'
                                    }}
                                />
                                <span style={{ fontSize: '11.5px', color: 'var(--muted-foreground)', marginTop: '8px', fontWeight: 600 }}>{q.name}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Répartition par type d'intervention */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', backgroundColor: 'var(--card)' }}>
                <h4 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <PieChart size={18} style={{ color: 'var(--sidebar-primary)' }} />
                    CA par type d'activité
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {categoryBreakdown.length === 0 ? (
                        <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted-foreground)' }}>
                            Aucune facture payée pour le moment. Le détail apparaîtra au fur et à mesure de vos encaissements.
                        </p>
                    ) : (
                        categoryBreakdown.map((item, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                <span style={{ fontSize: '13px', fontWeight: 600 }}>{item.label}</span>
                                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                    <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--foreground)' }}>{item.amount.toLocaleString()} €</span>
                                    <span style={{ backgroundColor: 'rgba(91, 77, 219, 0.1)', color: 'var(--sidebar-primary)', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '50px' }}>
                                        {item.share}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
