import React, { useState } from "react";
import { RefreshCw, Download, Filter, ArrowUpRight, ArrowDownLeft, Clock } from "lucide-react";

export default function TransactionsTab({ isMobileView, triggerToast }) {
    const [periodFilter, setPeriodFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");

    const [transactions, setTransactions] = useState([
        { id: "TX-901", invoice: "INV-2026-005", date: "22/07/2026", client: "M. Martin Julien", amount: "+ 1 450,00 €", type: "PAID", method: "Virement bancaire", status: "Payé" },
        { id: "TX-902", invoice: "INV-2026-006", date: "20/07/2026", client: "Mme. Bernard Claire", amount: "+ 890,00 €", type: "PAID", method: "Carte Bancaire (Stripe)", status: "Payé" },
        { id: "TX-903", invoice: "INV-2026-007", date: "15/07/2026", client: "SCI Horizon Climat", amount: "+ 3 200,00 €", type: "PENDING", method: "Virement à 30 jours", status: "En attente" },
        { id: "TX-904", invoice: "INV-2026-003", date: "01/07/2026", client: "SARL Batiment Azur", amount: "+ 2 100,00 €", type: "OVERDUE", method: "Chèque non encaissé", status: "En retard" },
    ]);

    const handleExportCsv = () => {
        let csv = "data:text/csv;charset=utf-8,ID,Facture,Date,Client,Montant,Methode,Statut\n";
        transactions.forEach(t => {
            csv += `${t.id},${t.invoice},${t.date},"${t.client}",${t.amount},${t.method},${t.status}\n`;
        });
        const encodedUri = encodeURI(csv);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `export-transactions-${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        triggerToast("Exportation des transactions en CSV terminée !");
    };

    const filteredTransactions = transactions.filter(t => {
        if (statusFilter === "PAID" && t.type !== "PAID") return false;
        if (statusFilter === "PENDING" && t.type !== "PENDING") return false;
        if (statusFilter === "OVERDUE" && t.type !== "OVERDUE") return false;
        return true;
    });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Header & Filtres & Export */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '18px', backgroundColor: 'var(--card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Filter size={18} style={{ color: 'var(--sidebar-primary)' }} />
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            type="button"
                            onClick={() => setStatusFilter("all")}
                            style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)', fontWeight: 600, fontSize: '12px', cursor: 'pointer', backgroundColor: statusFilter === 'all' ? 'var(--sidebar-primary)' : 'var(--background)', color: statusFilter === 'all' ? '#fff' : 'var(--foreground)' }}
                        >
                            Tous
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatusFilter("PAID")}
                            style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)', fontWeight: 600, fontSize: '12px', cursor: 'pointer', backgroundColor: statusFilter === 'PAID' ? '#22c55e' : 'var(--background)', color: statusFilter === 'PAID' ? '#fff' : 'var(--foreground)' }}
                        >
                            Payés
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatusFilter("PENDING")}
                            style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)', fontWeight: 600, fontSize: '12px', cursor: 'pointer', backgroundColor: statusFilter === 'PENDING' ? '#f59e0b' : 'var(--background)', color: statusFilter === 'PENDING' ? '#fff' : 'var(--foreground)' }}
                        >
                            En attente
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatusFilter("OVERDUE")}
                            style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)', fontWeight: 600, fontSize: '12px', cursor: 'pointer', backgroundColor: statusFilter === 'OVERDUE' ? '#ef4444' : 'var(--background)', color: statusFilter === 'OVERDUE' ? '#fff' : 'var(--foreground)' }}
                        >
                            En retard
                        </button>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={handleExportCsv}
                    style={{ padding: '9px 16px', backgroundColor: 'var(--sidebar-primary)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                    <Download size={15} />
                    Exporter CSV
                </button>
            </div>

            {/* Table des transactions */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', backgroundColor: 'var(--card)' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted-foreground)', textAlign: 'left' }}>
                                <th style={{ padding: '8px' }}>Réf & Facture</th>
                                <th style={{ padding: '8px' }}>Date</th>
                                <th style={{ padding: '8px' }}>Client</th>
                                <th style={{ padding: '8px' }}>Mode de règlement</th>
                                <th style={{ padding: '8px' }}>Statut</th>
                                <th style={{ padding: '8px', textAlign: 'right' }}>Montant</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTransactions.map((tx) => (
                                <tr key={tx.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '10px 8px', fontWeight: 600 }}>
                                        <div>{tx.id}</div>
                                        <span style={{ fontSize: '11px', color: 'var(--muted-foreground)' }}>{tx.invoice}</span>
                                    </td>
                                    <td style={{ padding: '10px 8px' }}>{tx.date}</td>
                                    <td style={{ padding: '10px 8px', fontWeight: 500 }}>{tx.client}</td>
                                    <td style={{ padding: '10px 8px', color: 'var(--muted-foreground)' }}>{tx.method}</td>
                                    <td style={{ padding: '10px 8px' }}>
                                        <span style={{
                                            backgroundColor: tx.type === 'PAID' ? 'rgba(34, 197, 94, 0.1)' : tx.type === 'PENDING' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                            color: tx.type === 'PAID' ? '#22c55e' : tx.type === 'PENDING' ? '#f59e0b' : '#ef4444',
                                            fontSize: '11px', padding: '2px 8px', borderRadius: '50px', fontWeight: 700
                                        }}>
                                            {tx.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 800, color: tx.type === 'PAID' ? '#22c55e' : 'var(--foreground)' }}>
                                        {tx.amount}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
