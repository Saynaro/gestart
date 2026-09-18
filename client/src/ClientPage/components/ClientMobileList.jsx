import React from "react";
import { ChevronRight, Users, Lock } from "lucide-react";

function ClientMobileList({ 
    sortedLetters, 
    groupedItems, 
    onSelect, 
    activeTabType = "particulier", 
    statusFilter = "Tous", 
    searchTerm = "", 
    loading = false,
    onOpenAddClient,
    isExpired = false
}) {
    if (loading) {
        return (
            <div className="client-mobile-skeleton-container" style={{ width: '92%', margin: '14px auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ backgroundColor: 'var(--card)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                    {[1, 2, 3, 4, 5].map((idx) => (
                        <div 
                            key={idx} 
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '15px 18px',
                                borderBottom: idx !== 5 ? '1px solid var(--border)' : 'none'
                            }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', flex: 1 }}>
                                <div 
                                    className="skeleton-shimmer" 
                                    style={{ width: `${40 + (idx % 3) * 18}%`, height: '15px', borderRadius: '5px' }} 
                                />
                                <div 
                                    className="skeleton-shimmer" 
                                    style={{ width: `${55 + (idx % 2) * 15}%`, height: '12px', borderRadius: '4px', opacity: 0.6 }} 
                                />
                            </div>
                            <div 
                                className="skeleton-shimmer" 
                                style={{ width: '14px', height: '14px', borderRadius: '3px', opacity: 0.3 }} 
                            />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (!sortedLetters || sortedLetters.length === 0) {
        const isOrg = activeTabType === "organisation";
        let emptyTitle = isOrg ? "Vous n'avez pas encore d'organisations" : "Vous n'avez pas encore de clients";
        let emptyDesc = isOrg 
            ? "Ajoutez votre première organisation pour commencer à gérer ses fiches et contacts." 
            : "Ajoutez votre premier client particulier pour commencer à gérer vos fiches et devis.";

        const hasSearch = Boolean(searchTerm && searchTerm.trim());
        const hasStatus = Boolean(statusFilter && statusFilter !== "Tous");
        const isFiltered = hasSearch || hasStatus;

        if (hasSearch) {
            emptyTitle = "Aucun contact trouvé";
            emptyDesc = `Aucun ${isOrg ? "organisation" : "client"} ne correspond à votre recherche "${searchTerm}".`;
        } else if (hasStatus) {
            emptyTitle = `Aucun ${isOrg ? "organisation" : "client"} avec le statut "${statusFilter}"`;
            emptyDesc = `Vous n'avez aucun contact ${isOrg ? "organisation" : "particulier"} dans la catégorie "${statusFilter}".`;
        }

        return (
            <div 
                className="client-mobile-empty-state" 
                style={{ 
                    width: '92%', 
                    margin: '24px auto', 
                    padding: '36px 20px', 
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center', 
                    backgroundColor: 'var(--card, #ffffff)', 
                    borderRadius: '20px', 
                    boxShadow: 'rgba(149, 157, 165, 0.08) 0px 4px 12px',
                    border: '1px solid var(--border, #e2e8f0)' 
                }}
            >
                <Users size={44} style={{ opacity: 0.35, color: 'var(--foreground)', margin: '0 auto 12px auto', display: 'block' }} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--foreground)', marginBottom: '6px' }}>
                    {emptyTitle}
                </h3>
                <p style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem', lineHeight: '1.4', margin: isFiltered ? '0 auto' : '0 auto 20px auto', maxWidth: '260px' }}>
                    {emptyDesc}
                </p>
                {!isFiltered && onOpenAddClient && (
                    <button 
                        onClick={onOpenAddClient}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: 'var(--sidebar-primary, #556B2F)',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '50px',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(85, 107, 47, 0.25)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        {isExpired && <Lock size={14} />}
                        + {isOrg ? "Nouvelle organisation" : "Nouveau client"}
                    </button>
                )}
            </div>
        );
    }

    return (
        <>
            {sortedLetters.map((letter) => {
                const items = groupedItems[letter] || [];
                return (
                    <div key={letter} style={{ width: '100%' }}>
                        {/* Letter Header */}
                        <div className="mobile-letter-divider">
                            {letter}
                        </div>

                        {/* Card Container */}
                        <div className="client-mobile-list-card">
                            {items.map((item, index) => {
                                const displayName = activeTabType === "particulier" ? 
                                    `${item.firstName} ${item.lastName}` : 
                                    item.name;

                                const subtext = item.email || "Non renseigné";
                                const isLast = index === items.length - 1;

                                return (
                                    <div 
                                        key={item.id} 
                                        className="mobile-client-list-row"
                                        onClick={() => {
                                            // Assign isOrg key dynamically based on tab type
                                            onSelect({ ...item, isOrg: activeTabType === "organisation" });
                                        }}
                                        style={{ borderBottom: isLast ? 'none' : '1px solid #f1f5f9' }}
                                    >
                                        <div className="mobile-client-row-left-content">
                                            <div className="mobile-client-name-badge-row">
                                                <span className="mobile-client-name-bold">{displayName}</span>
                                                {activeTabType === "particulier" && item.badge && (
                                                    <span className="mobile-contact-badge-green">{item.badge}</span>
                                                )}
                                            </div>
                                            <span className="mobile-client-subtext-email">{subtext}</span>
                                        </div>
                                        <ChevronRight size={18} className="mobile-row-chevron-right-grey" />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </>
    );
}

export default ClientMobileList;
