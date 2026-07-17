import React from "react";
import { Phone, Mail, MapPin, Edit3, Calendar, MessageSquare, FileText } from "lucide-react";

function ClientDetailView({ selectedClient, setSelectedClient, getClientDetails, detailTab, setDetailTab, onEdit }) {
    const details = getClientDetails(selectedClient);
    if (!details) return null;

    const displayName = selectedClient.isOrg ? selectedClient.name : `${selectedClient.firstName} ${selectedClient.lastName}`;
    const initials = selectedClient.isOrg ? selectedClient.name[0] : `${selectedClient.firstName[0]}${selectedClient.lastName[0]}`;

    return (
        <>
            {/* Breadcrumbs */}
            <div className="client-breadcrumbs">
                <span className="breadcrumb-link" onClick={() => setSelectedClient(null)}>Clients</span>
                <span className="breadcrumb-arrow"> &gt; </span>
                <span className="breadcrumb-current">{displayName}</span>
            </div>

            {/* Detail Grid */}
            <div className="client-detail-layout">
                {/* Left Card: Profile & Stats */}
                <div className="client-profile-card">
                    <div className="client-profile-avatar-circle">
                        {initials}
                    </div>
                    <h2 className="client-profile-name">
                        {displayName}
                    </h2>

                    <div className="client-profile-contact-info">
                        <div className="mobile-contact-row">
                            <Phone size={16} className="contact-icon-icon" />
                            <span>{selectedClient.phone || "Non renseigné"}</span>
                        </div>
                        <div className="mobile-contact-row">
                            <Mail size={16} className="contact-icon-icon" />
                            <span>{selectedClient.email || "Non renseigné"}</span>
                        </div>
                        <div className="mobile-contact-row">
                            <MapPin size={16} className="contact-icon-icon" />
                            <span>{selectedClient.address ? `${selectedClient.address}, ${selectedClient.zip || ""} ${selectedClient.city || ""}` : "Non renseigné"}</span>
                        </div>
                    </div>

                    <div className="panel-divider"></div>

                    <h3 className="mobile-section-title">ÉQUIPEMENT</h3>
                    <div className="mobile-equipment-box">
                        <div className="equipment-row">
                            <span className="equipment-label">Marque / Modèle</span>
                            <span className="equipment-value">{details.equipment.model}</span>
                        </div>
                        <div className="equipment-row">
                            <span className="equipment-label">Date installation</span>
                            <span className="equipment-value">{details.equipment.installDate}</span>
                        </div>
                        <div className="equipment-row">
                            <span className="equipment-label">N° de série</span>
                            <span className="equipment-value font-mono">{details.equipment.serialNumber}</span>
                        </div>
                    </div>

                    <div className="panel-divider"></div>

                    <h3 className="mobile-section-title">STATUT ENTRETIEN</h3>
                    <div className="mobile-maintenance-box">
                        <div className="maintenance-badge green">
                            <span>{details.maintenance.status}</span>
                        </div>
                        <div className="maintenance-next">
                            Prochain entretien: {details.maintenance.nextMaintenance}
                        </div>
                    </div>

                    <div className="mobile-action-grid">
                        <button className="mobile-action-btn modifier" onClick={() => onEdit(selectedClient, selectedClient.isOrg)}>
                            <Edit3 size={16} />
                            <span>Modifier</span>
                        </button>
                        <button className="mobile-action-btn planifier" onClick={() => alert("Planification ouverte !")}>
                            <Calendar size={16} />
                            <span>Planifier</span>
                        </button>
                        <button className="mobile-action-btn sms" onClick={() => alert("SMS envoyé !")}>
                            <MessageSquare size={16} />
                            <span>SMS</span>
                        </button>
                        <button className="mobile-action-btn facture" onClick={() => alert("Facture créée !")}>
                            <FileText size={16} />
                            <span>Facture</span>
                        </button>
                    </div>
                </div>

                {/* Right Card: Tabs View */}
                <div className="client-detail-tabs-card">
                    <div className="mobile-tabs-header">
                        {["interventions", "messages", "factures", "devis"].map((tab) => (
                            <button
                                key={tab}
                                className={`mobile-tab-btn ${detailTab === tab ? "active" : ""}`}
                                onClick={() => setDetailTab(tab)}
                            >
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </button>
                        ))}
                    </div>

                    <div className="mobile-tab-body">
                        {detailTab === "interventions" && (
                            <div className="mobile-tab-panel">
                                {details.interventions.map((item, idx) => (
                                    <div key={idx} className="mobile-history-card">
                                        <div className="history-card-header">
                                            <h4>{item.title}</h4>
                                            <span className="history-card-date">{item.date}</span>
                                        </div>
                                        <p><strong>Tech:</strong> {item.tech} · <span className="status-finished">{item.status}</span></p>
                                        <p className="history-card-desc">"{item.desc}"</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {detailTab === "messages" && (
                            <div className="mobile-tab-panel">
                                {details.messages.map((item, idx) => (
                                    <div key={idx} className={`mobile-history-card msg-${item.sender.toLowerCase()}`}>
                                        <div className="history-card-header">
                                            <h4>{item.sender}</h4>
                                            <span className="history-card-date">{item.date}</span>
                                        </div>
                                        <p className="history-card-desc">"{item.text}"</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {detailTab === "factures" && (
                            <div className="mobile-tab-panel">
                                {details.factures.map((item, idx) => (
                                    <div key={idx} className="mobile-history-card bill">
                                        <div className="history-card-header">
                                            <h4>{item.id}</h4>
                                            <span className="history-card-date">{item.date}</span>
                                        </div>
                                        <p><strong>Montant:</strong> {item.amount} · <span className="status-paid">{item.status}</span></p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {detailTab === "devis" && (
                            <div className="mobile-tab-panel">
                                {details.devis.map((item, idx) => (
                                    <div key={idx} className="mobile-history-card quote">
                                        <div className="history-card-header">
                                            <h4>{item.id}</h4>
                                            <span className="history-card-date">{item.date}</span>
                                        </div>
                                        <p><strong>Montant:</strong> {item.amount} · <span className="status-accepted">{item.status}</span></p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

export default ClientDetailView;
