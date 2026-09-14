import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Phone, Mail, MapPin, Edit3, Calendar, MessageSquare, FileText, Camera, PenTool, CheckCircle2, Clock, Play, Sparkles, Wrench } from "lucide-react";
import InterventionDetailModal, { getInterventionStatusInfo } from "./InterventionDetailModal";
import SideBar from "../../components/SideBar";

function ClientMobileDetailView({ selectedClient, setSelectedClient, getClientDetails, detailTab, setDetailTab, onEdit, onOpenInvoice, onOpenQuote, isReadOnly = false }) {
    const navigate = useNavigate();
    const [selectedInterventionForModal, setSelectedInterventionForModal] = useState(null);
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

    const fullAddress = [selectedClient.address, [selectedClient.zip, selectedClient.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");
    const availableTabs = isReadOnly ? ["interventions", "auto-rappel"] : ["interventions", "auto-rappel", "factures", "devis"];
    const currentTab = availableTabs.includes(detailTab) ? detailTab : "interventions";

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
                            {selectedClient.phone ? (
                                <a href={`tel:${selectedClient.phone.replace(/\s+/g, '')}`} className="mobile-contact-row clickable">
                                    <Phone size={16} className="contact-icon-icon" />
                                    <span>{selectedClient.phone}</span>
                                </a>
                            ) : (
                                <div className="mobile-contact-row">
                                    <Phone size={16} className="contact-icon-icon" />
                                    <span>Non renseigné</span>
                                </div>
                            )}
                            {selectedClient.email ? (
                                <a href={`mailto:${selectedClient.email}`} className="mobile-contact-row clickable">
                                    <Mail size={16} className="contact-icon-icon" />
                                    <span>{selectedClient.email}</span>
                                </a>
                            ) : (
                                <div className="mobile-contact-row">
                                    <Mail size={16} className="contact-icon-icon" />
                                    <span>Non renseigné</span>
                                </div>
                            )}
                            {fullAddress ? (
                                <a 
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="mobile-contact-row clickable"
                                >
                                    <MapPin size={16} className="contact-icon-icon" />
                                    <span>{fullAddress}</span>
                                </a>
                            ) : (
                                <div className="mobile-contact-row">
                                    <MapPin size={16} className="contact-icon-icon" />
                                    <span>Non renseigné</span>
                                </div>
                            )}
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
                            {!isReadOnly && (
                                <button className="mobile-action-btn modifier" onClick={() => onEdit(selectedClient, selectedClient.isOrg)}>
                                    <Edit3 size={16} />
                                    <span>Modifier</span>
                                </button>
                            )}
                            <button className="mobile-action-btn planifier" onClick={() => navigate('/planning', { state: { clientId: selectedClient.id, clientName: displayName } })}>
                                <Calendar size={16} />
                                <span>Planifier</span>
                            </button>
                            <button className="mobile-action-btn sms" onClick={() => navigate('/messages', { state: { clientId: selectedClient.id, clientName: displayName, phone: selectedClient.phone, email: selectedClient.email, address: selectedClient.address } })}>
                                <MessageSquare size={16} />
                                <span>SMS</span>
                            </button>
                            {!isReadOnly && (
                                <button className="mobile-action-btn facture" onClick={() => navigate('/factures', { state: { clientId: selectedClient.id, clientName: displayName, clientEmail: selectedClient.email, clientAddress: selectedClient.address, openNewModal: true } })}>
                                    <FileText size={16} />
                                    <span>Facture</span>
                                </button>
                            )}
                        </div>
                    </div>
                    
                    {/* Right Card: Tabs View */}
                    <div className="client-detail-tabs-card">
                        <div className="mobile-tabs-header">
                            {availableTabs.map((tab) => (
                                <button
                                    key={tab}
                                    className={`mobile-tab-btn ${currentTab === tab ? "active" : ""}`}
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
                                        details.interventions.map((item, idx) => {
                                            const hasPhotos = (item.photos && item.photos.length > 0) || (item.raw?.photos && item.raw.photos.length > 0);
                                            const hasSignature = !!item.clientSignature || !!item.raw?.clientSignature;
                                            const statusBadge = getInterventionStatusInfo(item);

                                            return (
                                                <div
                                                    key={idx}
                                                    className="mobile-history-card"
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={() => setSelectedInterventionForModal(item)}
                                                >
                                                    <div className="history-card-header">
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                            <h4>{item.title}</h4>
                                                            <span style={{
                                                                fontSize: '11px',
                                                                fontWeight: 700,
                                                                color: statusBadge.color,
                                                                backgroundColor: statusBadge.bg,
                                                                padding: '2px 8px',
                                                                borderRadius: '12px'
                                                            }}>
                                                                {statusBadge.label}
                                                            </span>
                                                        </div>
                                                        <span className="history-card-date">{item.date}</span>
                                                    </div>
                                                    <p className="history-card-desc" style={{ marginBottom: (hasPhotos || hasSignature) ? '8px' : '0' }}>
                                                        {item.desc}
                                                    </p>

                                                    {(hasPhotos || hasSignature) && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px', fontSize: '12px', color: 'var(--muted-foreground)' }}>
                                                            {hasPhotos && (
                                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#556B2F', fontWeight: 600 }}>
                                                                    <Camera size={13} />
                                                                    <span>{(item.photos || item.raw?.photos || []).length} photo{(item.photos || item.raw?.photos || []).length > 1 ? 's' : ''}</span>
                                                                </span>
                                                            )}
                                                            {hasSignature && (
                                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#16a34a', fontWeight: 600 }}>
                                                                    <PenTool size={13} />
                                                                    <span>Signée</span>
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            )}
                            
                            {detailTab === "auto-rappel" && (
                                <div className="mobile-tab-panel">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Sparkles size={15} color="#556B2F" />
                                            <h4 style={{ margin: 0, fontSize: '0.9rem' }}>Rappels Automatiques</h4>
                                        </div>
                                        <button
                                            className="mobile-action-btn"
                                            style={{ padding: '4px 8px', fontSize: '0.72rem', height: 'auto', backgroundColor: '#556B2F', color: '#ffffff', borderRadius: '6px' }}
                                            onClick={() => navigate('/premium')}
                                        >
                                            Gérer
                                        </button>
                                    </div>

                                    {(!details.reminderAutomations || details.reminderAutomations.length === 0) ? (
                                        <div style={{ textAlign: 'center', color: 'var(--muted-foreground)', padding: '24px', fontSize: '13px' }}>
                                            <Clock size={24} style={{ opacity: 0.4, marginBottom: '6px' }} />
                                            <p style={{ margin: '0 0 8px 0' }}>Aucun cycle de rappel actif.</p>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            {details.reminderAutomations.map((auto, idx) => {
                                                const serviceName = auto.trackedServices?.[0]?.serviceType?.name || auto.name || "Prestation générale";
                                                const nextDateStr = auto.nextReminderAt ? new Date(auto.nextReminderAt).toLocaleDateString('fr-FR') : "Non définie";

                                                return (
                                                    <div key={auto.id || idx} className="mobile-history-card" style={{ borderLeft: '4px solid #556B2F', padding: '12px' }}>
                                                        <div className="history-card-header" style={{ marginBottom: '6px' }}>
                                                            <h4 style={{ margin: 0, fontSize: '0.85rem' }}>{serviceName}</h4>
                                                            <span style={{ fontSize: '0.7rem', color: auto.enabled ? '#16a34a' : 'var(--muted-foreground)' }}>
                                                                {auto.enabled ? "Actif" : "En pause"}
                                                            </span>
                                                        </div>
                                                        <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--muted-foreground)' }}>
                                                            Prochain rappel: <strong style={{ color: '#556B2F' }}>{nextDateStr}</strong> ({auto.frequencyValue} mois)
                                                        </p>
                                                    </div>
                                                );
                                            })}
                                        </div>
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

            {/* Intervention Detail Modal Layer */}
            <InterventionDetailModal
                isOpen={!!selectedInterventionForModal}
                onClose={() => setSelectedInterventionForModal(null)}
                intervention={selectedInterventionForModal}
                client={selectedClient}
            />
        </div>
    );
}

export default ClientMobileDetailView;
