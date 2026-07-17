import React, { useState, useEffect, useRef } from "react";
import { MoreVertical, Eye, Edit3, Calendar, Archive } from "lucide-react";

function ClientTable({ clients, getClientDetails, onSelect, onEdit, onPlan, onArchive }) {
    const [activeDropdownId, setActiveDropdownId] = useState(null);
    const dropdownRef = useRef(null);

    const toggleDropdown = (e, clientId) => {
        e.stopPropagation();
        setActiveDropdownId(activeDropdownId === clientId ? null : clientId);
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

    const getStatusPillClass = (status) => {
        if (!status) return "status-pill ok";
        const val = status.toLowerCase();
        if (val.includes("urgent")) return "status-pill urgent";
        if (val.includes("bientôt") || val.includes("bientot")) return "status-pill bientot";
        return "status-pill ok";
    };

    return (
        <div className="client-table-card">
            <table className="client-data-table">
                <thead>
                    <tr>
                        <th>Client</th>
                        <th>Adresse</th>
                        <th>Équipement</th>
                        <th>Dernier entretien</th>
                        <th>Statut</th>
                        <th style={{ width: "60px" }}></th>
                    </tr>
                </thead>
                <tbody>
                    {clients.map((client) => {
                        const details = getClientDetails(client);
                        const lastIntervention = details.interventions?.[0]?.date || "Aucun";
                        const initials = client.isOrg ? client.name[0] : `${client.firstName[0]}${client.lastName[0]}`;
                        const displayName = client.isOrg ? client.name : `${client.firstName} ${client.lastName}`;
                        const displayAddress = client.address ? `${client.address}, ${client.city}` : "Non renseignée";
                        const statusVal = details.maintenance?.status || "OK";

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
                                    <span className="client-table-text-muted">{lastIntervention}</span>
                                </td>
                                <td>
                                    <span className={getStatusPillClass(statusVal)}>
                                        {statusVal}
                                    </span>
                                </td>
                                <td onClick={(e) => e.stopPropagation()} style={{ position: "relative" }}>
                                    <button 
                                        className={`client-row-more-btn ${activeDropdownId === client.id ? "active" : ""}`}
                                        onClick={(e) => toggleDropdown(e, client.id)}
                                    >
                                        <MoreVertical size={18} />
                                    </button>

                                    {activeDropdownId === client.id && (
                                        <div className="client-row-dropdown" ref={dropdownRef}>
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
                                            <div className="dropdown-divider"></div>
                                            <button 
                                                className="dropdown-item delete" 
                                                onClick={() => {
                                                    onArchive(client);
                                                    setActiveDropdownId(null);
                                                }}
                                            >
                                                <Archive size={15} />
                                                <span>Archiver</span>
                                            </button>
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
