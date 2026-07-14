import React, { useState } from "react";
import "../HomePage/Homepage.css";
import "./ClientPage.css";
import SideBar from "../components/SideBar";
import Header from "../components/Header";

const initialClients = [
    { name: "Jean Dupont", company: "AluTech SAS", email: "jean.dupont@alutech.fr", status: "Active" },
    { name: "Sophie Martin", company: "BatiConstruct", email: "s.martin@baticonstruct.fr", status: "En attente" },
    { name: "Pierre Leroy", company: "Chauffage Pro", email: "p.leroy@chauffagepro.fr", status: "Active" },
    { name: "Marie Dubois", company: "EcoEnergie", email: "m.dubois@ecoenergie.fr", status: "Active" },
    { name: "Thomas Petit", company: "Génie Climatique", email: "t.petit@genieclim.fr", status: "Désactivé" },
    { name: "Lucie Bernard", company: "ThermaAir", email: "l.bernard@thermaair.fr", status: "Active" },
    { name: "Antoine Richard", company: "Richard & Fils", email: "antoine@richardfils.fr", status: "En attente" },
    { name: "Julie Michel", company: "SolarLife", email: "j.michel@solarlife.fr", status: "Active" }
];

function ClientPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    const filteredClients = initialClients.filter(client => {
        const matchesSearch = 
            client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            client.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
            client.email.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesStatus = 
            statusFilter === "all" || 
            (statusFilter === "active" && client.status === "Active") ||
            (statusFilter === "pending" && client.status === "En attente") ||
            (statusFilter === "disabled" && client.status === "Désactivé");

        return matchesSearch && matchesStatus;
    });

    return (
        <div className="home-page">
            <SideBar />
            <div className="main-content">
                <Header />
                <div className="page-content">
                    <div className="content-header-row">
                        <div className="content-header">
                            <h1 className="content-title">Clients</h1>
                            <p className="content-subtitle">Gérez vos relations clients et leurs informations.</p>
                        </div>
                        <button className="new-client-btn">
                            + Nouveau Client
                        </button>
                    </div>

                    {/* Filters and search */}
                    <div className="filters-bar">
                        <div className="search-input-wrapper">
                            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="8"></circle>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                            </svg>
                            <input 
                                type="text" 
                                placeholder="Rechercher un client..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="search-input"
                            />
                        </div>
                        <div className="filter-options">
                            <button 
                                className={`filter-tab ${statusFilter === "all" ? "active" : ""}`}
                                onClick={() => setStatusFilter("all")}
                            >
                                Tous
                            </button>
                            <button 
                                className={`filter-tab ${statusFilter === "active" ? "active" : ""}`}
                                onClick={() => setStatusFilter("active")}
                            >
                                Actifs
                            </button>
                            <button 
                                className={`filter-tab ${statusFilter === "pending" ? "active" : ""}`}
                                onClick={() => setStatusFilter("pending")}
                            >
                                En attente
                            </button>
                        </div>
                    </div>

                    <div className="clients-grid">
                        {filteredClients.map((client, index) => (
                            <div key={index} className="client-card">
                                <div className="client-avatar-badge">{client.name.split(" ").map(n => n[0]).join("")}</div>
                                <div className="client-info">
                                    <h3>{client.name}</h3>
                                    <span className="client-company">{client.company}</span>
                                    <span className="client-email">{client.email}</span>
                                </div>
                                <div className="client-status-wrapper">
                                    <span className={`status-pill ${client.status.toLowerCase().replace(" ", "-")}`}>
                                        {client.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                        {filteredClients.length === 0 && (
                            <div className="no-results">
                                Aucun client ne correspond à votre recherche.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ClientPage;
