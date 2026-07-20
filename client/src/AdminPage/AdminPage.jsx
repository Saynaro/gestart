import React, { useState } from "react";
import { Users, CreditCard, TrendingUp, AlertOctagon, Ban, CheckCircle, Eye, Edit3 } from "lucide-react";
import "./AdminPage.css";

function AdminPage() {
    const [companies, setCompanies] = useState([
        { id: 1, name: "Dupont Climatisation", email: "dupont.clim@gmail.com", plan: "Pro", status: "Active", clientsCount: 148, date: "15/01/2026" },
        { id: 2, name: "Eco Thermique SAS", email: "contact@ecothermique.fr", plan: "Unlimited", status: "Active", clientsCount: 382, date: "02/02/2026" },
        { id: 3, name: "Allo Clim Service", email: "climservice@outlook.fr", plan: "Trial", status: "Trial", clientsCount: 12, date: "12/07/2026" },
        { id: 4, name: "Sud Froid Eurl", email: "sudfroid@gmail.com", plan: "Pro", status: "Past Due", clientsCount: 45, date: "22/03/2026" },
        { id: 5, name: "Nord Chauffage", email: "nord@chauffage.com", plan: "Pro", status: "Cancelled", clientsCount: 94, date: "10/11/2025" }
    ]);

    const [statusFilter, setStatusFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCompany, setSelectedCompany] = useState(null);

    // Stats
    const stats = {
        active: companies.filter(c => c.status === "Active" || c.status === "Trial").length,
        trials: companies.filter(c => c.status === "Trial").length,
        mrr: 4850,
        churnRate: 2.1
    };

    // Filter companies list
    const filteredCompanies = companies.filter(comp => {
        const matchesStatus = statusFilter === "all" || comp.status.toLowerCase() === statusFilter.toLowerCase();
        const matchesSearch = comp.name.toLowerCase().includes(searchQuery.toLowerCase()) || comp.email.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const handleBlockCompany = (id) => {
        setCompanies(companies.map(c => {
            if (c.id === id) {
                const newStatus = c.status === "Blocked" ? "Active" : "Blocked";
                alert(`✓ Statut de l'entreprise mis à jour : ${newStatus}`);
                return { ...c, status: newStatus };
            }
            return c;
        }));
    };

    const handleChangePlan = (id) => {
        const nextPlan = prompt("Changer de plan (Trial / Pro / Unlimited) :", "Pro");
        if (nextPlan && ["Trial", "Pro", "Unlimited"].includes(nextPlan)) {
            setCompanies(companies.map(c => c.id === id ? { ...c, plan: nextPlan } : c));
            alert("✓ Le plan d'abonnement a été modifié.");
        }
    };

    const handleViewAs = (comp) => {
        alert(`Redirection... Vous voyez maintenant l'application en tant que : ${comp.name}`);
    };

    // Mock MRR income chart over 6 months
    const mrrHistory = [
        { month: "Feb", val: 3200 },
        { month: "Mar", val: 3800 },
        { month: "Apr", val: 4100 },
        { month: "May", val: 4300 },
        { month: "Jun", val: 4600 },
        { month: "Jul", val: 4850 }
    ];

    const maxVal = 6000;
    const getBarHeight = (val) => (val / maxVal) * 120;

    return (
        <div className="super-admin-page">
            {/* Topbar navigation */}
            <div className="admin-topbar">
                <div className="left">
                    <span className="admin-logo">CLIMPRO</span>
                    <span className="admin-tag">SUPER ADMIN PANEL</span>
                </div>
                <div className="right">
                    <div className="admin-avatar">AD</div>
                </div>
            </div>

            <div className="admin-content">
                {/* Stat cards */}
                <div className="quote-stats-grid">
                    <div className="kpi-card">
                        <div className="kpi-header">
                            <span className="kpi-label">Entreprises Actives</span>
                            <Users size={18} className="kpi-icon" />
                        </div>
                        <span className="kpi-value">{stats.active}</span>
                        <span className="kpi-subtext">Abonnements + Trials en cours</span>
                    </div>

                    <div className="kpi-card warning-accent">
                        <div className="kpi-header">
                            <span className="kpi-label">Périodes d'essai</span>
                            <TrendingUp size={18} className="kpi-icon text-warning" />
                        </div>
                        <span className="kpi-value text-warning">{stats.trials}</span>
                        <span className="kpi-subtext">Entreprises en Trial</span>
                    </div>

                    <div className="kpi-card success-accent">
                        <div className="kpi-header">
                            <span className="kpi-label">MRR (Mensuel récurrent)</span>
                            <CreditCard size={18} className="kpi-icon text-success" />
                        </div>
                        <span className="kpi-value text-success">{stats.mrr.toLocaleString("fr-FR")} €</span>
                        <span className="kpi-subtext">Revenus récurrents estimés</span>
                    </div>

                    <div className="kpi-card destructive-accent">
                        <div className="kpi-header">
                            <span className="kpi-label">Churn mensuel</span>
                            <AlertOctagon size={18} className="kpi-icon text-destructive" />
                        </div>
                        <span className="kpi-value text-destructive">{stats.churnRate}%</span>
                        <span className="kpi-subtext">Taux d'annulation du mois</span>
                    </div>
                </div>

                {/* Split layout: Revenue chart + filters */}
                <div className="admin-split-layout">
                    {/* Revenue chart */}
                    <div className="admin-card revenue-chart-card">
                        <h3>Évolution MRR (6 derniers mois)</h3>
                        <div className="admin-bar-chart">
                            {mrrHistory.map((m, idx) => {
                                const h = getBarHeight(m.val);
                                return (
                                    <div key={idx} className="chart-bar-container">
                                        <div className="bar-hover-val">{m.val} €</div>
                                        <div className="chart-bar-fill" style={{ height: `${h}px` }} />
                                        <span className="chart-bar-lbl">{m.month}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Filter controls */}
                    <div className="admin-card filter-controls-card">
                        <h3>Rechercher & Filtrer</h3>
                        <div className="filters-grid">
                            <div className="form-field">
                                <label className="form-label">Nom ou email de l'entreprise</label>
                                <input 
                                    type="text" 
                                    className="profile-input"
                                    placeholder="Rechercher..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <div className="form-field">
                                <label className="form-label">Statut d'abonnement</label>
                                <select 
                                    className="profile-input option-select"
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                >
                                    <option value="all">Tous les statuts</option>
                                    <option value="active">Active</option>
                                    <option value="trial">Trial</option>
                                    <option value="past due">Past due</option>
                                    <option value="cancelled">Cancelled</option>
                                    <option value="blocked">Blocked</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Companies list table */}
                <div className="admin-card" style={{ marginTop: '1.5rem' }}>
                    <div className="card-title-row">
                        <h3>Liste des Entreprises</h3>
                        <span className="results-count">{filteredCompanies.length} résultats</span>
                    </div>

                    <div className="table-responsive">
                        <table className="widget-table admin-table">
                            <thead>
                                <tr>
                                    <th>Entreprise</th>
                                    <th>Plan</th>
                                    <th>Date inscription</th>
                                    <th>Clients</th>
                                    <th>Statut</th>
                                    <th className="text-center">Actions Super Admin</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCompanies.map((comp) => (
                                    <tr key={comp.id}>
                                        <td>
                                            <div className="client-info">
                                                <span className="client-name">{comp.name}</span>
                                                <span className="client-email">{comp.email}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`plan-badge ${comp.plan.toLowerCase()}`}>
                                                {comp.plan}
                                            </span>
                                        </td>
                                        <td>{comp.date}</td>
                                        <td><strong>{comp.clientsCount}</strong></td>
                                        <td>
                                            <span className={`admin-status-badge ${comp.status.toLowerCase().replace(" ", "-")}`}>
                                                {comp.status}
                                            </span>
                                        </td>
                                        <td className="text-center">
                                            <div className="admin-action-row" style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                                <button 
                                                    className="admin-btn block-btn"
                                                    onClick={() => handleBlockCompany(comp.id)}
                                                    title={comp.status === "Blocked" ? "Débloquer" : "Bloquer l'accès"}
                                                >
                                                    <Ban size={13} /> {comp.status === "Blocked" ? "Débloquer" : "Bloquer"}
                                                </button>
                                                <button 
                                                    className="admin-btn edit-btn"
                                                    onClick={() => handleChangePlan(comp.id)}
                                                    title="Modifier le plan"
                                                >
                                                    <Edit3 size={13} /> Plan
                                                </button>
                                                <button 
                                                    className="admin-btn view-btn"
                                                    onClick={() => handleViewAs(comp)}
                                                    title="Se connecter en tant que"
                                                >
                                                    <Eye size={13} /> Voir
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AdminPage;
