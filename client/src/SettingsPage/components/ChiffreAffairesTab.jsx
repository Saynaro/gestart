import React, { useState } from "react";
import { Calculator, AlertTriangle, TrendingUp, DollarSign, PieChart, ArrowUpRight } from "lucide-react";

export default function ChiffreAffairesTab({ isMobileView, triggerToast }) {
    const currentCA = 37300;
    const thresholdServices = 37500; // Seuil franchise TVA de base
    const thresholdSales = 85000;
    const percentage = Math.round((currentCA / thresholdServices) * 100);
    const isWarning = percentage >= 80;

    const quartersData = [
        { name: "T1 (Jan-Mar)", amount: 8400, color: "var(--sidebar-primary)" },
        { name: "T2 (Avr-Juin)", amount: 14200, color: "var(--sidebar-primary)" },
        { name: "T3 (Juil-Sept)", amount: 14700, color: "var(--sidebar-primary)", current: true },
        { name: "T4 (Oct-Déc)", amount: 0, color: "#cbd5e1" }
    ];

    const categoryBreakdown = [
        { label: "Pompes à chaleur & Climatisation", amount: 22400, share: "60%" },
        { label: "Entretiens & ТО annuels", amount: 8900, share: "24%" },
        { label: "Dépannages d'urgence", amount: 6000, share: "16%" }
    ];

    const projectionYearEnd = 52400;

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
                            Vous êtes à <strong>{(thresholdServices - currentCA).toLocaleString()} €</strong> du seuil de franchise en base de TVA (37 500 €). Si vous dépassez le seuil majoré (39 100 €), vous devrez facturer la TVA sur vos interventions.
                        </p>
                    </div>
                </div>
            )}

            {/* Metric Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                <div style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--muted-foreground)', fontWeight: 600 }}>CA Annuel en cours (2026)</span>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--foreground)', marginTop: '4px' }}>
                        {currentCA.toLocaleString()} € <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--muted-foreground)' }}>HT</span>
                    </div>
                    <span style={{ fontSize: '11px', color: '#22c55e', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '2px', marginTop: '6px' }}>
                        <ArrowUpRight size={14} /> +18.4% vs 2025
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
                        ~ {projectionYearEnd.toLocaleString()} €
                    </div>
                    <span style={{ fontSize: '11.5px', color: 'var(--muted-foreground)', marginTop: '4px', display: 'block' }}>Basé sur la saisonnalité HVAC</span>
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
                        const heightPct = Math.max(10, Math.round((q.amount / 20000) * 100));
                        return (
                            <div key={q.name} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                                <span style={{ fontSize: '11px', fontWeight: 700, marginBottom: '6px', color: q.current ? 'var(--sidebar-primary)' : 'var(--foreground)' }}>
                                    {q.amount > 0 ? `${q.amount.toLocaleString()} €` : '—'}
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
                    CA par type d'intervention
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {categoryBreakdown.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600 }}>{item.label}</span>
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--foreground)' }}>{item.amount.toLocaleString()} €</span>
                                <span style={{ backgroundColor: 'rgba(91, 77, 219, 0.1)', color: 'var(--sidebar-primary)', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '50px' }}>
                                    {item.share}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
