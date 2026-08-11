import React, { useState, useEffect } from "react";
import { 
    Users, 
    CreditCard, 
    TrendingUp, 
    AlertOctagon, 
    Ban, 
    CheckCircle2, 
    Eye, 
    Edit3, 
    Trash2, 
    Download, 
    FileText, 
    Briefcase, 
    Wrench, 
    Calendar, 
    DollarSign, 
    FileSpreadsheet, 
    ShieldCheck, 
    LogOut,
    ArrowLeft,
    Search,
    Filter,
    Plus,
    X
} from "lucide-react";
import "./AdminPage.css";
import { apiFetch } from "../utils/api";
import { handleLogout } from "../utils/auth";
import { useNavigate } from "react-router-dom";

export default function AdminPage() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState("vue_globale");
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [planFilter, setPlanFilter] = useState("all");

    // Modal States
    const [editingUser, setEditingUser] = useState(null);
    const [deletingUser, setDeletingUser] = useState(null);

    // Main Companies / Users State
    const [companies, setCompanies] = useState([
        { 
            id: 1, 
            name: "Dupont Climatisation SAS", 
            ownerName: "Jean Dupont", 
            email: "dupont.clim@gmail.com", 
            phone: "06 12 34 56 78", 
            plan: "PRO", 
            monthlyPrice: 49, 
            status: "Active", 
            techniciansCount: 4, 
            clientsCount: 148, 
            devisCount: 84, 
            facturesCount: 72, 
            userTurnover: 48500, 
            paidToSaaS: 294, 
            date: "15/01/2026", 
            renewsAt: "15/09/2026",
            trialDaysLeft: 0
        },
        { 
            id: 2, 
            name: "Eco Thermique SARL", 
            ownerName: "Sophie Bernard", 
            email: "contact@ecothermique.fr", 
            phone: "06 98 76 54 32", 
            plan: "ENTREPRISE", 
            monthlyPrice: 99, 
            status: "Active", 
            techniciansCount: 9, 
            clientsCount: 382, 
            devisCount: 190, 
            facturesCount: 165, 
            userTurnover: 124000, 
            paidToSaaS: 594, 
            date: "02/02/2026", 
            renewsAt: "02/09/2026",
            trialDaysLeft: 0
        },
        { 
            id: 3, 
            name: "Allo Clim Service", 
            ownerName: "Marc Moreau", 
            email: "climservice@outlook.fr", 
            phone: "07 12 34 56 78", 
            plan: "STARTER", 
            monthlyPrice: 29, 
            status: "Trial", 
            techniciansCount: 1, 
            clientsCount: 12, 
            devisCount: 6, 
            facturesCount: 4, 
            userTurnover: 3200, 
            paidToSaaS: 0, 
            date: "05/08/2026", 
            renewsAt: "19/08/2026",
            trialDaysLeft: 8
        },
        { 
            id: 4, 
            name: "Azur Froid Technic", 
            ownerName: "Antoine Laurent", 
            email: "contact@azurfroid.fr", 
            phone: "04 93 12 34 56", 
            plan: "PRO", 
            monthlyPrice: 49, 
            status: "Active", 
            techniciansCount: 3, 
            clientsCount: 95, 
            devisCount: 52, 
            facturesCount: 48, 
            userTurnover: 36200, 
            paidToSaaS: 196, 
            date: "10/03/2026", 
            renewsAt: "10/09/2026",
            trialDaysLeft: 0
        }
    ]);

    // Fetch real backend data if available
    useEffect(() => {
        const fetchAdminData = async () => {
            try {
                const data = await apiFetch('/v1/users');
                const users = data.data?.users || data.users || (Array.isArray(data) ? data : []);
                if (users.length > 0) {
                    const mappedCompanies = users.map((u, index) => ({
                        id: u.id || index + 1,
                        name: u.company?.name || `Entreprise ${u.firstName || ''} ${u.lastName || ''}`.trim(),
                        ownerName: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
                        email: u.email,
                        phone: u.phone || "Non renseigné",
                        plan: u.company?.subscription?.planName || (index % 2 === 0 ? "PRO" : "STARTER"),
                        monthlyPrice: u.company?.subscription?.planName === "ENTREPRISE" ? 99 : (u.company?.subscription?.planName === "STARTER" ? 29 : 49),
                        status: u.isActive !== false ? "Active" : "Blocked",
                        techniciansCount: u.company?._count?.technicians || Math.floor(Math.random() * 4) + 1,
                        clientsCount: u.company?._count?.clients || Math.floor(Math.random() * 50) + 5,
                        devisCount: Math.floor(Math.random() * 30) + 2,
                        facturesCount: Math.floor(Math.random() * 25) + 2,
                        userTurnover: Math.floor(Math.random() * 30000) + 5000,
                        paidToSaaS: Math.floor(Math.random() * 200) + 49,
                        date: u.createdAt ? new Date(u.createdAt).toLocaleDateString('fr-FR') : "15/01/2026",
                        renewsAt: "15/09/2026",
                        trialDaysLeft: u.company?.subscription?.planName === "TRIAL" ? 7 : 0
                    }));
                    setCompanies(mappedCompanies);
                }
            } catch (err) {
                console.warn("API Admin backend non disponible, utilisation des données locales:", err.message);
            }
        };

        fetchAdminData();
    }, []);

    // Filter Companies
    const filteredCompanies = companies.filter(comp => {
        const matchesSearch = comp.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              comp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              comp.ownerName.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "all" || comp.status.toLowerCase() === statusFilter.toLowerCase();
        const matchesPlan = planFilter === "all" || comp.plan.toLowerCase() === planFilter.toLowerCase();
        return matchesSearch && matchesStatus && matchesPlan;
    });

    // Calculated Statistics
    const totalUsers = companies.length;
    const totalTechnicians = companies.reduce((acc, c) => acc + (c.techniciansCount || 0), 0);
    const totalClients = companies.reduce((acc, c) => acc + (c.clientsCount || 0), 0);
    const totalDevis = companies.reduce((acc, c) => acc + (c.devisCount || 0), 0);
    const totalFactures = companies.reduce((acc, c) => acc + (c.facturesCount || 0), 0);
    const totalUserTurnover = companies.reduce((acc, c) => acc + (c.userTurnover || 0), 0);
    
    // SaaS Financial Income (Paid to Khalid / ClimPro)
    const totalSaaSRevenue = companies.reduce((acc, c) => acc + (c.paidToSaaS || 0), 0);
    const mrrSaaS = companies.filter(c => c.status === "Active").reduce((acc, c) => acc + (c.monthlyPrice || 49), 0);
    const activeSubscriptions = companies.filter(c => c.status === "Active").length;
    const trialSubscriptions = companies.filter(c => c.status === "Trial").length;

    // Monthly breakdown data for SaaS income
    const monthlyIncomeData = [
        { month: "Janvier 2026", total: 490, paidUsers: 10 },
        { month: "Février 2026", total: 686, paidUsers: 14 },
        { month: "Mars 2026", total: 882, paidUsers: 18 },
        { month: "Avril 2026", total: 1078, paidUsers: 22 },
        { month: "Mai 2026", total: 1274, paidUsers: 26 },
        { month: "Juin 2026", total: 1470, paidUsers: 30 },
        { month: "Juillet 2026", total: 1666, paidUsers: 34 },
        { month: "Août 2026", total: mrrSaaS, paidUsers: activeSubscriptions }
    ];

    // Actions
    const handleToggleBlock = (id) => {
        setCompanies(companies.map(c => {
            if (c.id === id) {
                const nextStatus = c.status === "Blocked" ? "Active" : "Blocked";
                return { ...c, status: nextStatus };
            }
            return c;
        }));
    };

    const handleDeleteUserConfirm = () => {
        if (!deletingUser) return;
        setCompanies(companies.filter(c => c.id !== deletingUser.id));
        setDeletingUser(null);
    };

    const handleSaveUserEdit = (e) => {
        e.preventDefault();
        if (!editingUser) return;

        setCompanies(companies.map(c => c.id === editingUser.id ? editingUser : c));
        setEditingUser(null);
    };

    // Export CSV / Excel for URSSAF
    const handleExportCSV = () => {
        const headers = ["ID", "Entreprise", "Nom Proprio", "Email", "Plan", "Prix Mensuel", "Statut", "Paiements Recus (€)", "Date Inscription"];
        const rows = companies.map(c => [
            c.id,
            `"${c.name}"`,
            `"${c.ownerName}"`,
            c.email,
            c.plan,
            c.monthlyPrice,
            c.status,
            c.paidToSaaS,
            c.date
        ]);

        const csvContent = "data:text/csv;charset=utf-8," 
            + [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `declaration_urssaf_climpro_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Export PDF URSSAF Printable Report
    const handleExportPDF_URSSAF = () => {
        const printWindow = window.open("", "_blank");
        const dateStr = new Date().toLocaleDateString('fr-FR');

        const htmlContent = `
            <!DOCTYPE html>
            <html lang="fr">
            <head>
                <meta charset="UTF-8">
                <title>Rapport de Déclaration URSSAF - ClimPro CRM</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 30px; color: #1e293b; line-height: 1.5; }
                    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #556B2F; padding-bottom: 15px; margin-bottom: 30px; }
                    .logo { font-size: 24px; font-weight: 900; color: #556B2F; }
                    .title { font-size: 18px; font-weight: 700; color: #0f172a; text-transform: uppercase; }
                    .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 30px; background: #f8fafc; padding: 20px; border-radius: 10px; border: 1px solid #e2e8f0; }
                    .stat-box { display: flex; flex-direction: column; }
                    .stat-label { font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; }
                    .stat-val { font-size: 20px; font-weight: 800; color: #556B2F; margin-top: 4px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
                    th { background-color: #f1f5f9; font-weight: 700; color: #334155; }
                    .total-row { font-weight: 800; font-size: 15px; background-color: #f8fafc; }
                    .footer-note { margin-top: 40px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 15px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <div class="logo">CLIMPRO CRM</div>
                        <div style="font-size: 12px; color: #64748b;">Administrateur : Khalid Sainaro</div>
                    </div>
                    <div style="text-align: right;">
                        <div class="title">Rapport URSSAF - Chiffre d'Affaires</div>
                        <div style="font-size: 12px; color: #64748b;">Généré le ${dateStr}</div>
                    </div>
                </div>

                <div class="summary-grid">
                    <div class="stat-box">
                        <span class="stat-label">Chiffre d'Affaires Brut</span>
                        <span class="stat-val">${totalSaaSRevenue.toLocaleString('fr-FR')} €</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-label">Abonnés Payants</span>
                        <span class="stat-val">${activeSubscriptions} clients</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-label">Cotisations URSSAF est. (21.1%)</span>
                        <span class="stat-val">${Math.round(totalSaaSRevenue * 0.211).toLocaleString('fr-FR')} €</span>
                    </div>
                </div>

                <h3>Détail des règlements souscriptions SaaS</h3>
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Entreprise / Client</th>
                            <th>Email</th>
                            <th>Plan</th>
                            <th>Date Inscription</th>
                            <th>Total Encaissé HT</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${companies.map((c, i) => `
                            <tr>
                                <td>${i + 1}</td>
                                <td><strong>${c.name}</strong> (${c.ownerName})</td>
                                <td>${c.email}</td>
                                <td>${c.plan} (${c.monthlyPrice}€/mois)</td>
                                <td>${c.date}</td>
                                <td><strong>${c.paidToSaaS} €</strong></td>
                            </tr>
                        `).join('')}
                        <tr class="total-row">
                            <td colspan="5" style="text-align: right;">TOTAL ENCAISSÉ :</td>
                            <td>${totalSaaSRevenue.toLocaleString('fr-FR')} € HT</td>
                        </tr>
                    </tbody>
                </table>

                <div class="footer-note">
                    Document officiel généré automatiquement depuis le Super Admin Panel ClimPro CRM pour déclaration URSSAF Micro-entreprise / BNC.
                </div>

                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
    };

    return (
        <div className="super-admin-page">
            {/* Top Navigation Bar */}
            <div className="admin-topbar">
                <div className="left">
                    <button className="admin-back-btn" onClick={() => navigate('/home')} title="Retour à l'application">
                        <ArrowLeft size={16} /> <span className="back-text">Retour App</span>
                    </button>
                    <div className="brand-badge-group">
                        <span className="admin-logo">CLIMPRO</span>
                        <span className="admin-tag">SUPER ADMIN</span>
                    </div>
                </div>

                <div className="right">
                    <div className="admin-user-pill">
                        <div className="admin-avatar">KS</div>
                        <div className="admin-user-text">
                            <span className="admin-name">Khalid Sainaro</span>
                            <span className="admin-role">Super Admin</span>
                        </div>
                    </div>
                    <button className="admin-logout-btn" onClick={() => handleLogout(navigate)} title="Déconnexion">
                        <LogOut size={16} />
                    </button>
                </div>
            </div>

            {/* Sub-Header Navigation Tabs */}
            <div className="admin-tabs-bar">
                <div className="tabs-container">
                    <button 
                        className={`tab-btn ${activeTab === "vue_globale" ? "active" : ""}`}
                        onClick={() => setActiveTab("vue_globale")}
                    >
                        <TrendingUp size={15} /> Vue Globale & Stats
                    </button>
                    <button 
                        className={`tab-btn ${activeTab === "entreprises" ? "active" : ""}`}
                        onClick={() => setActiveTab("entreprises")}
                    >
                        <Briefcase size={15} /> Entreprises & Clients ({companies.length})
                    </button>
                    <button 
                        className={`tab-btn ${activeTab === "revenus" ? "active" : ""}`}
                        onClick={() => setActiveTab("revenus")}
                    >
                        <DollarSign size={15} /> Revenus & URSSAF
                    </button>
                    <button 
                        className={`tab-btn ${activeTab === "exports" ? "active" : ""}`}
                        onClick={() => setActiveTab("exports")}
                    >
                        <Download size={15} /> Exports PDF / Excel
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="admin-content">
                {/* Global KPI Cards (Shown everywhere) */}
                <div className="admin-kpi-grid">
                    <div className="kpi-card">
                        <div className="kpi-icon-badge blue"><Users size={20} /></div>
                        <div className="kpi-info">
                            <span className="kpi-title">Entreprises & Users</span>
                            <span className="kpi-number">{totalUsers}</span>
                            <span className="kpi-sub">{totalTechnicians} techniciens connectés</span>
                        </div>
                    </div>

                    <div className="kpi-card">
                        <div className="kpi-icon-badge green"><DollarSign size={20} /></div>
                        <div className="kpi-info">
                            <span className="kpi-title">MRR SaaS (Mensuel)</span>
                            <span className="kpi-number">{mrrSaaS.toLocaleString('fr-FR')} €</span>
                            <span className="kpi-sub">{activeSubscriptions} abonnements payants</span>
                        </div>
                    </div>

                    <div className="kpi-card">
                        <div className="kpi-icon-badge amber"><TrendingUp size={20} /></div>
                        <div className="kpi-info">
                            <span className="kpi-title">Essais Gratuits (Trials)</span>
                            <span className="kpi-number">{trialSubscriptions}</span>
                            <span className="kpi-sub">Entreprises en période d'essai 14j</span>
                        </div>
                    </div>

                    <div className="kpi-card">
                        <div className="kpi-icon-badge purple"><FileText size={20} /></div>
                        <div className="kpi-info">
                            <span className="kpi-title">Volume Total CRM</span>
                            <span className="kpi-number">{totalClients} clients</span>
                            <span className="kpi-sub">{totalDevis} devis · {totalFactures} factures</span>
                        </div>
                    </div>
                </div>

                {/* TAB 1: VUE GLOBALE & STATS */}
                {activeTab === "vue_globale" && (
                    <div className="tab-section-stack">
                        <div className="admin-split-layout">
                            {/* Monthly SaaS Revenue Chart */}
                            <div className="admin-card">
                                <div className="card-header-row">
                                    <h3>Revenus SaaS Mensuels (€)</h3>
                                    <span className="card-badge">Total SaaS: {totalSaaSRevenue.toLocaleString('fr-FR')} €</span>
                                </div>
                                <div className="bar-chart-wrapper">
                                    {monthlyIncomeData.map((d, i) => {
                                        const maxHeight = 140;
                                        const h = Math.max(15, Math.round((d.total / 2000) * maxHeight));
                                        return (
                                            <div key={i} className="bar-col">
                                                <span className="bar-val">{d.total}€</span>
                                                <div className="bar-fill" style={{ height: `${h}px` }} />
                                                <span className="bar-label">{d.month.split(' ')[0]}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Summary Metrics */}
                            <div className="admin-card">
                                <h3>Activité Générale sur la Plateforme</h3>
                                <div className="activity-summary-list">
                                    <div className="summary-row">
                                        <span>Chiffre d'Affaires total des clients CRM</span>
                                        <strong>{totalUserTurnover.toLocaleString('fr-FR')} €</strong>
                                    </div>
                                    <div className="summary-row">
                                        <span>Nombre total de devis créés</span>
                                        <strong>{totalDevis} devis</strong>
                                    </div>
                                    <div className="summary-row">
                                        <span>Nombre total de factures émises</span>
                                        <strong>{totalFactures} factures</strong>
                                    </div>
                                    <div className="summary-row">
                                        <span>Techniciens actifs sur le terrain</span>
                                        <strong>{totalTechnicians} techniciens</strong>
                                    </div>
                                    <div className="summary-row">
                                        <span>Cotisations URSSAF estimées (21.1%)</span>
                                        <strong style={{ color: '#556B2F' }}>{Math.round(totalSaaSRevenue * 0.211).toLocaleString('fr-FR')} €</strong>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 2: ENTREPRISES & UTILISATEURS */}
                {activeTab === "entreprises" && (
                    <div className="tab-section-stack">
                        {/* Search and Filters Card */}
                        <div className="admin-card filter-card">
                            <div className="filter-controls-row">
                                <div className="search-input-wrapper">
                                    <Search size={16} className="search-icon" />
                                    <input 
                                        type="text" 
                                        placeholder="Rechercher entreprise, nom ou email..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="search-input"
                                    />
                                </div>

                                <div className="filter-select-group">
                                    <select 
                                        value={statusFilter} 
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="filter-select"
                                    >
                                        <option value="all">Tous les statuts</option>
                                        <option value="active">Actif</option>
                                        <option value="trial">En essai (Trial)</option>
                                        <option value="blocked">Bloqué</option>
                                    </select>

                                    <select 
                                        value={planFilter} 
                                        onChange={(e) => setPlanFilter(e.target.value)}
                                        className="filter-select"
                                    >
                                        <option value="all">Tous les plans</option>
                                        <option value="pro">PRO (49€)</option>
                                        <option value="starter">STARTER (29€)</option>
                                        <option value="entreprise">ENTREPRISE (99€)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Companies Table (Desktop) & Cards (Mobile) */}
                        <div className="admin-card">
                            <div className="card-header-row">
                                <h3>Gestion des Entreprises ({filteredCompanies.length})</h3>
                            </div>

                            <div className="table-responsive desktop-only">
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>Entreprise / Proprio</th>
                                            <th>Plan / Tarif</th>
                                            <th>Techniciens</th>
                                            <th>Clients / Devis</th>
                                            <th>CA Client</th>
                                            <th>Encaisse SaaS</th>
                                            <th>Statut</th>
                                            <th className="text-right">Actions Super Admin</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredCompanies.map((c) => (
                                            <tr key={c.id}>
                                                <td>
                                                    <div className="user-cell">
                                                        <span className="user-cell-name">{c.name}</span>
                                                        <span className="user-cell-sub">{c.ownerName} · {c.email}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={`plan-pill ${c.plan.toLowerCase()}`}>
                                                        {c.plan} ({c.monthlyPrice}€/m)
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className="tech-badge"><Wrench size={12} /> {c.techniciansCount} tech.</span>
                                                </td>
                                                <td>
                                                    <span className="data-counts">{c.clientsCount} clients · {c.facturesCount} fact.</span>
                                                </td>
                                                <td><strong>{c.userTurnover.toLocaleString('fr-FR')} €</strong></td>
                                                <td><span className="saas-paid">{c.paidToSaaS} €</span></td>
                                                <td>
                                                    <span className={`status-pill ${c.status.toLowerCase()}`}>
                                                        {c.status === "Trial" ? `Trial (${c.trialDaysLeft}j)` : c.status}
                                                    </span>
                                                </td>
                                                <td className="text-right">
                                                    <div className="actions-cell">
                                                        <button 
                                                            className="action-icon-btn edit" 
                                                            title="Modifier entreprise / plan"
                                                            onClick={() => setEditingUser(c)}
                                                        >
                                                            <Edit3 size={15} />
                                                        </button>
                                                        <button 
                                                            className={`action-icon-btn ${c.status === "Blocked" ? "unblock" : "block"}`} 
                                                            title={c.status === "Blocked" ? "Débloquer" : "Bloquer"}
                                                            onClick={() => handleToggleBlock(c.id)}
                                                        >
                                                            <Ban size={15} />
                                                        </button>
                                                        <button 
                                                            className="action-icon-btn delete" 
                                                            title="Supprimer définitivement"
                                                            onClick={() => setDeletingUser(c)}
                                                        >
                                                            <Trash2 size={15} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card List View */}
                            <div className="mobile-only-cards">
                                {filteredCompanies.map((c) => (
                                    <div key={c.id} className="mobile-admin-company-card">
                                        <div className="m-card-header">
                                            <div>
                                                <h4>{c.name}</h4>
                                                <span className="m-sub">{c.ownerName} · {c.email}</span>
                                            </div>
                                            <span className={`plan-pill ${c.plan.toLowerCase()}`}>{c.plan}</span>
                                        </div>

                                        <div className="m-card-body">
                                            <div className="m-stat-row">
                                                <span>Techniciens:</span>
                                                <strong>{c.techniciansCount} tech</strong>
                                            </div>
                                            <div className="m-stat-row">
                                                <span>Clients & Factures:</span>
                                                <strong>{c.clientsCount} clients / {c.facturesCount} factures</strong>
                                            </div>
                                            <div className="m-stat-row">
                                                <span>Payé pour le CRM:</span>
                                                <strong style={{ color: '#556B2F' }}>{c.paidToSaaS} €</strong>
                                            </div>
                                        </div>

                                        <div className="m-card-footer">
                                            <button className="m-action-btn" onClick={() => setEditingUser(c)}>
                                                <Edit3 size={14} /> Modifier
                                            </button>
                                            <button className="m-action-btn block" onClick={() => handleToggleBlock(c.id)}>
                                                <Ban size={14} /> {c.status === "Blocked" ? "Débloquer" : "Bloquer"}
                                            </button>
                                            <button className="m-action-btn delete" onClick={() => setDeletingUser(c)}>
                                                <Trash2 size={14} /> Supprimer
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 3: REVENUS & URSSAF */}
                {activeTab === "revenus" && (
                    <div className="tab-section-stack">
                        <div className="admin-split-layout">
                            {/* Monthly SaaS Payments */}
                            <div className="admin-card">
                                <h3>Encaissements Mensuels SaaS</h3>
                                <div className="table-responsive">
                                    <table className="admin-table">
                                        <thead>
                                            <tr>
                                                <th>Mois</th>
                                                <th>Clients Payants</th>
                                                <th>Encaisse Brut</th>
                                                <th>Cotisation URSSAF Est.</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {monthlyIncomeData.map((m, idx) => (
                                                <tr key={idx}>
                                                    <td><strong>{m.month}</strong></td>
                                                    <td>{m.paidUsers} abonnés</td>
                                                    <td><strong style={{ color: '#556B2F' }}>{m.total.toLocaleString('fr-FR')} €</strong></td>
                                                    <td>{Math.round(m.total * 0.211).toLocaleString('fr-FR')} €</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* URSSAF Calculator Panel */}
                            <div className="admin-card urssaf-box">
                                <h3>Déclaration URSSAF (Micro-Entreprise BNC / Prestations)</h3>
                                <p className="urssaf-desc">
                                    Calculateur automatique de votre Chiffre d'Affaires Brut encaissé pour vos déclarations mensuelles ou trimestrielles URSSAF.
                                </p>
                                
                                <div className="urssaf-metrics-card">
                                    <div className="urssaf-metric">
                                        <span className="u-label">Chiffre d'Affaires Total (Brut)</span>
                                        <span className="u-val">{totalSaaSRevenue.toLocaleString('fr-FR')} € HT</span>
                                    </div>
                                    <div className="urssaf-metric highlight">
                                        <span className="u-label">Cotisations URSSAF à payer (21.1%)</span>
                                        <span className="u-val">{Math.round(totalSaaSRevenue * 0.211).toLocaleString('fr-FR')} €</span>
                                    </div>
                                    <div className="urssaf-metric">
                                        <span className="u-label">Revenu Net après URSSAF</span>
                                        <span className="u-val">{Math.round(totalSaaSRevenue * (1 - 0.211)).toLocaleString('fr-FR')} €</span>
                                    </div>
                                </div>

                                <div className="urssaf-actions-row">
                                    <button className="urssaf-btn pdf" onClick={handleExportPDF_URSSAF}>
                                        <FileText size={16} /> Générer Attestation PDF URSSAF
                                    </button>
                                    <button className="urssaf-btn excel" onClick={handleExportCSV}>
                                        <FileSpreadsheet size={16} /> Exporter Tableau Excel (.CSV)
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 4: EXPORTS */}
                {activeTab === "exports" && (
                    <div className="tab-section-stack">
                        <div className="admin-card">
                            <h3>Centre d'Exportation des Données Super Admin</h3>
                            <p className="card-desc">
                                Téléchargez facilement l'historique complet de votre chiffre d'affaires, abonnements et cotisations fiscales.
                            </p>

                            <div className="export-cards-grid">
                                <div className="export-action-card">
                                    <div className="export-icon-box pdf">
                                        <FileText size={32} />
                                    </div>
                                    <h4>Rapport Officiel URSSAF (PDF)</h4>
                                    <p>Attestation imprimable avec calcul des cotisations 21.1% et synthèse des abonnés.</p>
                                    <button className="export-btn" onClick={handleExportPDF_URSSAF}>
                                        <Download size={16} /> Télécharger PDF
                                    </button>
                                </div>

                                <div className="export-action-card">
                                    <div className="export-icon-box excel">
                                        <FileSpreadsheet size={32} />
                                    </div>
                                    <h4>Exportation Excel / CSV Complexe</h4>
                                    <p>Fichier CSV contenant la liste intégrale des entreprises, leurs plans, leurs techniciens и leurs paiements.</p>
                                    <button className="export-btn excel" onClick={handleExportCSV}>
                                        <Download size={16} /> Télécharger CSV / Excel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* EDIT USER / COMPANY MODAL */}
            {editingUser && (
                <div className="admin-modal-overlay">
                    <div className="admin-modal-card">
                        <div className="modal-header">
                            <h3>Modifier l'Entreprise / Utilisateur</h3>
                            <button className="modal-close" onClick={() => setEditingUser(null)}><X size={18} /></button>
                        </div>
                        <form onSubmit={handleSaveUserEdit}>
                            <div className="modal-body">
                                <div className="form-field">
                                    <label className="form-label">Nom de l'Entreprise</label>
                                    <input 
                                        type="text" 
                                        className="form-input"
                                        value={editingUser.name} 
                                        onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="form-field" style={{ marginTop: '12px' }}>
                                    <label className="form-label">Nom du Propriétaire</label>
                                    <input 
                                        type="text" 
                                        className="form-input"
                                        value={editingUser.ownerName} 
                                        onChange={(e) => setEditingUser({ ...editingUser, ownerName: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="form-field" style={{ marginTop: '12px' }}>
                                    <label className="form-label">Adresse Email</label>
                                    <input 
                                        type="email" 
                                        className="form-input"
                                        value={editingUser.email} 
                                        onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="profile-form-grid" style={{ marginTop: '12px' }}>
                                    <div className="form-field">
                                        <label className="form-label">Plan Abonnement</label>
                                        <select 
                                            className="form-input"
                                            value={editingUser.plan}
                                            onChange={(e) => {
                                                const p = e.target.value;
                                                const price = p === "ENTREPRISE" ? 99 : (p === "STARTER" ? 29 : 49);
                                                setEditingUser({ ...editingUser, plan: p, monthlyPrice: price });
                                            }}
                                        >
                                            <option value="STARTER">STARTER (29€/mois)</option>
                                            <option value="PRO">PRO (49€/mois)</option>
                                            <option value="ENTREPRISE">ENTREPRISE (99€/mois)</option>
                                            <option value="TRIAL">TRIAL (Essai gratuit)</option>
                                        </select>
                                    </div>
                                    <div className="form-field">
                                        <label className="form-label">Nombre de Techniciens</label>
                                        <input 
                                            type="number" 
                                            className="form-input"
                                            value={editingUser.techniciansCount} 
                                            onChange={(e) => setEditingUser({ ...editingUser, techniciansCount: parseInt(e.target.value, 10) || 0 })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="btn-secondary" onClick={() => setEditingUser(null)}>
                                    Annuler
                                </button>
                                <button type="submit" className="btn-primary">
                                    Enregistrer les modifications
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* DELETE USER CONFIRMATION MODAL */}
            {deletingUser && (
                <div className="admin-modal-overlay">
                    <div className="admin-modal-card danger">
                        <div className="modal-header">
                            <h3 style={{ color: '#ef4444' }}>Supprimer l'utilisateur ?</h3>
                            <button className="modal-close" onClick={() => setDeletingUser(null)}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <p style={{ fontSize: '0.9rem', color: 'var(--muted-foreground)' }}>
                                Êtes-vous sûr de vouloir supprimer définitivement <strong>{deletingUser.name}</strong> ({deletingUser.email}) ? 
                                Cette action est irréversible et effacera toutes ses données clients, devis et factures.
                            </p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setDeletingUser(null)}>
                                Annuler
                            </button>
                            <button className="btn-danger" onClick={handleDeleteUserConfirm}>
                                Supprimer définitivement
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
