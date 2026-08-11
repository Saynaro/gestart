import React from "react";
import { Phone, Mail, MapPin, Edit3, Calendar, MessageSquare, FileText } from "lucide-react";

function ClientDetailView({ selectedClient, setSelectedClient, getClientDetails, detailTab, setDetailTab, onEdit, onOpenInvoice, onOpenQuote }) {
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
                <div className="client-profile-card" style={{ paddingTop: '28px' }}>
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

                    <h3 className="mobile-section-title" style={{ marginBottom: '8px', textAlign: 'left' }}>ÉQUIPEMENT</h3>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        backgroundColor: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border)',
                        borderRadius: '14px',
                        padding: '14px 16px',
                        width: '100%',
                        boxSizing: 'border-box'
                    }}>
                        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                            <span style={{ color: 'var(--muted-foreground)', fontSize: '13.5px', fontWeight: 500, textAlign: 'left' }}>Modèle</span>
                            <span style={{ color: 'var(--foreground)', fontSize: '13.5px', fontWeight: 600, textAlign: 'right' }}>{details.equipment.model}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                            <span style={{ color: 'var(--muted-foreground)', fontSize: '13.5px', fontWeight: 500, textAlign: 'left' }}>Installé le</span>
                            <span style={{ color: 'var(--foreground)', fontSize: '13.5px', fontWeight: 600, textAlign: 'right' }}>{details.equipment.installDate}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                            <span style={{ color: 'var(--muted-foreground)', fontSize: '13.5px', fontWeight: 500, textAlign: 'left' }}>N° de série</span>
                            <span style={{ color: 'var(--foreground)', fontSize: '13.5px', fontWeight: 600, fontFamily: 'monospace', textAlign: 'right' }}>{details.equipment.serialNumber}</span>
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
                        <button className="mobile-action-btn planifier" onClick={() => navigate('/planning', { state: { clientId: selectedClient.id, clientName: displayName } })}>
                            <Calendar size={16} />
                            <span>Planifier</span>
                        </button>
                        <button className="mobile-action-btn sms" onClick={() => navigate('/messages', { state: { clientId: selectedClient.id, clientName: displayName } })}>
                            <MessageSquare size={16} />
                            <span>SMS</span>
                        </button>
                        <button className="mobile-action-btn facture" onClick={() => navigate('/factures', { state: { clientId: selectedClient.id, clientName: displayName, openNewModal: true } })}>
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

                    <div className="mobile-tabs-content">
                        {detailTab === "interventions" && (
                            <div className="mobile-tab-panel">
                                {details.interventions.map((item, idx) => (
                                    <div key={idx} className="mobile-history-card">
                                        <div className="history-card-header">
                                            <h4>{item.title}</h4>
                                            <span className="history-card-date">{item.date}</span>
                                        </div>
                                        <p className="history-card-desc">{item.desc}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {detailTab === "messages" && (
                            <div className="mobile-tab-panel">
                                {details.messages.map((item, idx) => (
                                    <div key={idx} className="mobile-history-card msg">
                                        <div className="history-card-header">
                                            <h4>{item.author}</h4>
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
                                    <div
                                        key={idx}
                                        className="mobile-history-card bill"
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => {
                                            if (onOpenInvoice) {
                                                onOpenInvoice({
                                                    id: idx + 1,
                                                    number: item.id.replace(/^FACT-/, "F-"),
                                                    date: item.date || "15/03/2026",
                                                    clientName: displayName,
                                                    clientEmail: selectedClient.email || "client@email.com",
                                                    clientAddress: selectedClient.address || "12 Rue des Fleurs, 75001 Paris",
                                                    subtotalHt: 100,
                                                    tvaAmount: 20,
                                                    totalTtc: parseFloat((item.amount || "120,00 €").replace("€", "").replace(",", ".")) || 120,
                                                    status: item.status === "PAYÉ" || item.status === "Payée" ? "paid" : "pending"
                                                });
                                            }
                                        }}
                                    >
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
                                    <div
                                        key={idx}
                                        className="mobile-history-card quote"
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => {
                                            if (onOpenQuote) {
                                                onOpenQuote({
                                                    id: idx + 1,
                                                    number: item.id.replace(/^DEV-/, "D-"),
                                                    date: item.date || "10/03/2026",
                                                    clientName: displayName,
                                                    clientEmail: selectedClient.email || "client@email.com",
                                                    clientAddress: selectedClient.address || "12 Rue des Fleurs, 75001 Paris",
                                                    subtotalHt: 100,
                                                    tvaAmount: 20,
                                                    totalTtc: parseFloat((item.amount || "120,00 €").replace("€", "").replace(",", ".")) || 120,
                                                    status: item.status === "ACCEPTÉ" || item.status === "Signé" ? "ACCEPTED" : "SENT"
                                                });
                                            }
                                        }}
                                    >
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
