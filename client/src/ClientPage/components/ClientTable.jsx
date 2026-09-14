import React, { useState, useEffect, useRef } from "react";
import { MoreVertical, Eye, Edit3, Calendar, Trash2, Users } from "lucide-react";

function getInitials(client) {
    if (!client) return "CL";
    if (client.isOrg) {
        const n = (client.name || "").trim();
        if (!n) return "OR";
        const parts = n.split(/\s+/);
        if (parts.length >= 2) {
            return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        }
        return n.substring(0, 2).toUpperCase();
    }
    const f = client.firstName ? client.firstName[0] : "";
    const l = client.lastName ? client.lastName[0] : "";
    return `${f}${l}`.toUpperCase() || "CL";
}

function ClientTable({ 
    clients, 
    getClientDetails, 
    onSelect, 
    onEdit, 
    onPlan, 
    onDelete, 
    activeTabType = "particulier", 
    statusFilter = "Tous", 
    searchTerm = "", 
    onAddClient,
    loading = false,
    isReadOnly = false 
}) {
    const [activeDropdownId, setActiveDropdownId] = useState(null);
    const [dropdownPlacement, setDropdownPlacement] = useState("bottom");
    const dropdownRef = useRef(null);

    const toggleDropdown = (e, clientId) => {
        e.stopPropagation();
        if (activeDropdownId === clientId) {
            setActiveDropdownId(null);
        } else {
            const rect = e.currentTarget.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            setDropdownPlacement(spaceBelow < 230 ? "top" : "bottom");
            setActiveDropdownId(clientId);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setActiveDropdownId(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (loading) {
        return (
            <div className="table-skeleton-container" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', backgroundColor: 'var(--card)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div 
                        key={i} 
                        className="skeleton-shimmer" 
                        style={{ height: '46px', borderRadius: '10px', width: '100%' }} 
                    />
                ))}
            </div>
        );
    }

    if (!clients || clients.length === 0) {
        const isOrg = activeTabType === "organisation";
        let emptyTitle = isOrg ? "Vous n'avez pas encore d'organisations" : "Vous n'avez pas encore de clients";
        let emptyDesc = isOrg 
            ? "Ajoutez votre première organisation (entreprise, syndic, commerce) pour gérer ses fiches et contacts." 
            : "Ajoutez votre premier client particulier pour commencer à gérer ses équipements et factures.";

        if (searchTerm && searchTerm.trim()) {
            emptyTitle = "Aucun contact trouvé";
            emptyDesc = `Aucun ${isOrg ? "organisation" : "client"} ne correspond à votre recherche "${searchTerm}".`;
        } else if (statusFilter && statusFilter !== "Tous") {
            emptyTitle = `Aucun ${isOrg ? "organisation" : "client"} avec le statut "${statusFilter}"`;
            emptyDesc = `Vous n'avez aucun contact ${isOrg ? "organisation" : "particulier"} dans la catégorie "${statusFilter}".`;
        }

        return (
            <div className="fp-empty-state" style={{ padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', backgroundColor: 'var(--card)', borderRadius: '14px', border: '1px solid var(--border)', width: '100%', boxSizing: 'border-box' }}>
                <Users size={44} style={{ opacity: 0.4, margin: '0 auto 12px auto', display: 'block' }} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '6px' }}>{emptyTitle}</h3>
                <p style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem', marginBottom: '20px' }}>
                    {emptyDesc}
                </p>
                {!isReadOnly && (
                    <button className="new-client-btn" onClick={() => onAddClient ? onAddClient() : (onEdit && onEdit({ isNew: true, isOrg }, isOrg))}>
                        + {isOrg ? "Nouvelle Organisation" : "Nouveau Client"}
                    </button>
                )}
            </div>
        );
    }

    const getStatusPillClass = (status) => {
        if (!status) return "status-pill ok";
        const val = status.toLowerCase();
        if (val.includes("urgent")) return "status-pill urgent";
        if (val.includes("planifier") || val.includes("warning") || val.includes("prévoir") || val.includes("prevoir")) return "status-pill warning";
        if (val.includes("aucun") || val.includes("non")) return "status-pill gray";
        return "status-pill ok";
    };

    return (
        <div className="client-table-card">
            <table className="client-data-table">
                <thead>
                    <tr>
                        <th style={{ width: "23%" }}>Client</th>
                        <th style={{ width: "20%" }}>Adresse</th>
                        <th style={{ width: "20%" }}>Équipement</th>
                        <th style={{ width: "18%" }}>Entretien / Intervention</th>
                        <th style={{ width: "13%" }}>Statut</th>
                        <th style={{ width: "6%" }}></th>
                    </tr>
                </thead>
                <tbody>
                    {clients.map((client) => {
                        const details = getClientDetails(client);
                        const initials = getInitials(client);
                        const displayName = client.isOrg ? client.name : `${client.firstName} ${client.lastName}`;
                        const displayAddress = client.address ? `${client.address}, ${client.city}` : "Non renseignée";
                        const statusVal = details.maintenance?.status || "OK";
                        const summary = client.interventionSummary || details.interventionSummary;

                        return (
                            <tr key={client.id} className="client-table-row" onClick={() => onSelect(client)}>
                                <td>
                                    <div className="client-profile-cell">
                                        <div className="client-avatar-badge">{initials}</div>
                                        <span className="client-name-bold">{displayName}</span>
                                    </div>
                                </td>
                                <td>
                                    <span className="client-table-text-muted">{displayAddress}</span>
                                </td>
                                <td>
                                    <span className="client-table-text-medium">{details.equipment?.model || "Aucun"}</span>
                                </td>
                                <td>
                                    {summary?.type === 'upcoming' ? (
                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ 
                                                display: 'inline-block', 
                                                width: '6px', 
                                                height: '6px', 
                                                borderRadius: '50%', 
                                                backgroundColor: '#16a34a' 
                                            }} />
                                            <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>
                                                {summary.date}
                                            </span>
                                            <span style={{ 
                                                fontSize: '11px', 
                                                color: '#16a34a', 
                                                fontWeight: 600, 
                                                backgroundColor: 'rgba(22, 163, 74, 0.1)', 
                                                padding: '1px 6px', 
                                                borderRadius: '4px' 
                                            }}>
                                                Prévu
                                            </span>
                                        </div>
                                    ) : summary?.type === 'past' ? (
                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ color: 'var(--muted-foreground)', fontSize: '13px' }}>
                                                {summary.date}
                                            </span>
                                            <span style={{ 
                                                fontSize: '11px', 
                                                color: 'var(--muted-foreground)', 
                                                backgroundColor: 'rgba(0, 0, 0, 0.05)', 
                                                padding: '1px 6px', 
                                                borderRadius: '4px' 
                                            }}>
                                                Dernier
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="client-table-text-muted">Aucune</span>
                                    )}
                                </td>
                                <td style={{ overflow: "visible", whiteSpace: "nowrap" }}>
                                    <span className={getStatusPillClass(statusVal)}>
                                         {statusVal}
                                     </span>
                                </td>
                                <td onClick={(e) => e.stopPropagation()} style={{ position: "relative", overflow: "visible" }}>
                                    <button 
                                        className={`client-row-more-btn ${activeDropdownId === client.id ? "active" : ""}`}
                                        onClick={(e) => toggleDropdown(e, client.id)}
                                        title="Actions"
                                    >
                                        <MoreVertical size={18} />
                                    </button>

                                    {activeDropdownId === client.id && (
                                        <div className={`client-row-dropdown placement-${dropdownPlacement}`} ref={dropdownRef}>
                                            <button 
                                                className="dropdown-item" 
                                                onClick={() => {
                                                    onSelect(client);
                                                    setActiveDropdownId(null);
                                                }}
                                            >
                                                <Eye size={15} />
                                                <span>Voir la fiche</span>
                                            </button>
                                            {!isReadOnly && (
                                                <button 
                                                    className="dropdown-item" 
                                                    onClick={() => {
                                                        onEdit(client, client.isOrg);
                                                        setActiveDropdownId(null);
                                                    }}
                                                >
                                                    <Edit3 size={15} />
                                                    <span>Modifier</span>
                                                </button>
                                            )}
                                            <button 
                                                className="dropdown-item" 
                                                onClick={() => {
                                                    onPlan(client);
                                                    setActiveDropdownId(null);
                                                }}
                                            >
                                                <Calendar size={15} />
                                                <span>Planifier</span>
                                            </button>
                                            {!isReadOnly && (
                                                <>
                                                    <div className="dropdown-divider"></div>
                                                    <button 
                                                        className="dropdown-item delete" 
                                                        onClick={() => {
                                                            if (onDelete) onDelete(client);
                                                            setActiveDropdownId(null);
                                                        }}
                                                    >
                                                        <Trash2 size={15} />
                                                        <span>Supprimer</span>
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

export default ClientTable;
