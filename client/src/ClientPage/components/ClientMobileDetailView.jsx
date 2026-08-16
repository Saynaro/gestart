import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Phone, Mail, MapPin, Edit3, Calendar, MessageSquare, FileText } from "lucide-react";
import SideBar from "../../components/SideBar";

function ClientMobileDetailView({ selectedClient, setSelectedClient, getClientDetails, detailTab, setDetailTab, onEdit, onOpenInvoice, onOpenQuote }) {
    const navigate = useNavigate();
    const details = getClientDetails(selectedClient);
    if (!details) return null;

    const displayName = selectedClient.isOrg ? selectedClient.name : `${selectedClient.firstName} ${selectedClient.lastName}`;
    const initials = selectedClient.isOrg ? selectedClient.name[0] : `${selectedClient.firstName[0]}${selectedClient.lastName[0]}`;

    return (
        <div className="mobile-contacts-view" style={{ backgroundColor: '#f8fafc' }}>
            {/* Header */}
            <div className="mobile-nav-header" style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: 'white', position: 'sticky', top: 0, zIndex: 100, display: 'flex', alignItems: 'center', padding: '16px' }}>
                <button className="mobile-back-circle" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'rgba(95, 75, 219, 0.08)', border: 'none', color: '#5f4bdb', cursor: 'pointer' }} onClick={() => window.history.back()}>
                    <ArrowLeft size={16} />
                </button>
                <span className="mobile-nav-header-title visible" style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', textAlign: 'center', flex: 1 }}>
                    {displayName}
                </span>
                <div style={{ width: '36px' }} />
            </div>
            
            <div className="mobile-contacts-scrollable-content" style={{ paddingBottom: '100px' }}>
                {/* Mobile Detail Layout */}
                <div className="mobile-detail-container" style={{ padding: '16px' }}>
                    {/* Profile Card */}
                    <div className="mobile-detail-profile-card" style={{ paddingTop: '28px' }}>
                        <div className="mobile-profile-avatar">
                            {initials}
                        </div>
                        
                        <h2 className="mobile-profile-name">
                            {displayName}
                        </h2>
                        
                        <div className="mobile-profile-contact-info">
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
                                <span style={{ color: 'var(--foreground)', fontSize: '13.5px', fontWeight: 600, textAlign: 'right' }}>{details.equipment?.model || "Non renseigné"}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                <span style={{ color: 'var(--muted-foreground)', fontSize: '13.5px', fontWeight: 500, textAlign: 'left' }}>Installé le</span>
                                <span style={{ color: 'var(--foreground)', fontSize: '13.5px', fontWeight: 600, textAlign: 'right' }}>{details.equipment?.installDate || "Non renseigné"}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                <span style={{ color: 'var(--muted-foreground)', fontSize: '13.5px', fontWeight: 500, textAlign: 'left' }}>N° de série</span>
                                <span style={{ color: 'var(--foreground)', fontSize: '13.5px', fontWeight: 600, fontFamily: 'monospace', textAlign: 'right' }}>{details.equipment?.serialNumber || "N/A"}</span>
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
            </div>
            {/* Mobile Bottom Tab Bar */}
            <SideBar hideFab={true} />
        </div>
    );
}

export default ClientMobileDetailView;
