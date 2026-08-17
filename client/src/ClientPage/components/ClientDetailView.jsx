import React from "react";
import { useNavigate } from "react-router-dom";
import { Phone, Mail, MapPin, Edit3, Calendar, MessageSquare, FileText } from "lucide-react";

function ClientDetailView({ selectedClient, setSelectedClient, getClientDetails, detailTab, setDetailTab, onEdit, onOpenInvoice, onOpenQuote }) {
    const navigate = useNavigate();
    const details = getClientDetails(selectedClient);
    if (!details) return null;

    const displayName = selectedClient.isOrg ? selectedClient.name : `${selectedClient.firstName} ${selectedClient.lastName}`;
    let initials = "CL";
    if (selectedClient.isOrg) {
        const n = (selectedClient.name || "").trim();
        const parts = n.split(/\s+/);
        initials = parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : n.substring(0, 2).toUpperCase() || "OR";
    } else {
        const f = selectedClient.firstName ? selectedClient.firstName[0] : "";
        const l = selectedClient.lastName ? selectedClient.lastName[0] : "";
        initials = `${f}${l}`.toUpperCase() || "CL";
    }

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
                    <div className={`mobile-maintenance-box ${details.maintenance.hasNext ? 'has-next' : 'no-next'}`}>
                        <div className={`maintenance-badge ${details.maintenance.statusClass || (details.maintenance.hasNext ? 'green' : 'gray')}`}>
                            <span>{details.maintenance.hasNext ? (details.maintenance.status || "OK") : "—"}</span>
                        </div>
                        <div className={`maintenance-next ${details.maintenance.hasNext ? '' : 'muted'}`}>
                            {details.maintenance.hasNext
                                ? `Prochain entretien: ${details.maintenance.nextMaintenance}`
                                : `Aucun entretien à venir`}
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
                        <button className="mobile-action-btn sms" onClick={() => navigate('/messages', { state: { clientId: selectedClient.id, clientName: displayName, phone: selectedClient.phone, email: selectedClient.email, address: selectedClient.address } })}>
                            <MessageSquare size={16} />
                            <span>SMS</span>
                        </button>
                        <button className="mobile-action-btn facture" onClick={() => navigate('/factures', { state: { clientId: selectedClient.id, clientName: displayName, clientEmail: selectedClient.email, clientAddress: selectedClient.address, openNewModal: true } })}>
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
                                {details.interventions.length === 0 ? (
                                    <p style={{ textAlign: 'center', color: 'var(--muted-foreground)', padding: '24px', fontSize: '13.5px' }}>
                                        Aucune intervention enregistrée pour ce client.
                                    </p>
                                ) : (
                                    details.interventions.map((item, idx) => (
                                        <div key={idx} className="mobile-history-card">
                                            <div className="history-card-header">
                                                <h4>{item.title}</h4>
                                                <span className="history-card-date">{item.date}</span>
                                            </div>
                                            <p className="history-card-desc">{item.desc}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {detailTab === "messages" && (
                            <div className="mobile-tab-panel">
                                {details.messages.length === 0 ? (
                                    <p style={{ textAlign: 'center', color: 'var(--muted-foreground)', padding: '24px', fontSize: '13.5px' }}>
                                        Aucun message SMS pour ce client.
                                    </p>
                                ) : (
                                    details.messages.map((item, idx) => (
                                        <div key={idx} className="mobile-history-card msg">
                                            <div className="history-card-header">
                                                <h4>{item.author}</h4>
                                                <span className="history-card-date">{item.date}</span>
                                            </div>
                                            <p className="history-card-desc">"{item.text}"</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {detailTab === "factures" && (
                            <div className="mobile-tab-panel">
                                {details.factures.length === 0 ? (
                                    <p style={{ textAlign: 'center', color: 'var(--muted-foreground)', padding: '24px', fontSize: '13.5px' }}>
                                        Aucune facture pour ce client.
                                    </p>
                                ) : (
                                    details.factures.map((item, idx) => (
                                        <div
                                            key={idx}
                                            className="mobile-history-card bill"
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => {
                                                if (onOpenInvoice) {
                                                    onOpenInvoice(item.raw || {
                                                        id: idx + 1,
                                                        number: item.id,
                                                        date: item.date,
                                                        clientName: displayName,
                                                        clientEmail: selectedClient.email || "",
                                                        clientAddress: selectedClient.address || "",
                                                        totalTtc: parseFloat((item.amount || "0").replace("€", "").replace(",", ".")) || 0,
                                                        status: item.statusKey || "draft"
                                                    });
                                                }
                                            }}
                                        >
                                            <div className="history-card-header">
                                                <h4>{item.id}</h4>
                                                <span className="history-card-date">{item.date}</span>
                                            </div>
                                            <p style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                                                <span><strong>Montant:</strong> {item.amount}</span>
                                                <span style={{ color: 'var(--border)' }}>·</span>
                                                <span className={`fp-status-badge ${item.statusKey || 'draft'}`}>
                                                    {item.status}
                                                </span>
                                            </p>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {detailTab === "devis" && (
                            <div className="mobile-tab-panel">
                                {details.devis.length === 0 ? (
                                    <p style={{ textAlign: 'center', color: 'var(--muted-foreground)', padding: '24px', fontSize: '13.5px' }}>
                                        Aucun devis pour ce client.
                                    </p>
                                ) : (
                                    details.devis.map((item, idx) => (
                                        <div
                                            key={idx}
                                            className="mobile-history-card quote"
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => {
                                                if (onOpenQuote) {
                                                    onOpenQuote(item.raw || {
                                                        id: idx + 1,
                                                        number: item.id,
                                                        date: item.date,
                                                        clientName: displayName,
                                                        clientEmail: selectedClient.email || "",
                                                        clientAddress: selectedClient.address || "",
                                                        totalTtc: parseFloat((item.amount || "0").replace("€", "").replace(",", ".")) || 0,
                                                        status: (item.statusKey || "DRAFT").toUpperCase()
                                                    });
                                                }
                                            }}
                                        >
                                            <div className="history-card-header">
                                                <h4>{item.id}</h4>
                                                <span className="history-card-date">{item.date}</span>
                                            </div>
                                            <p style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                                                <span><strong>Montant:</strong> {item.amount}</span>
                                                <span style={{ color: 'var(--border)' }}>·</span>
                                                <span className={`dv-status-badge ${(item.statusKey || 'DRAFT').toUpperCase()}`}>
                                                    {item.status}
                                                </span>
                                            </p>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

export default ClientDetailView;
