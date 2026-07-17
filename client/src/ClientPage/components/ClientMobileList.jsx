import React from "react";
import { ChevronRight } from "lucide-react";

function ClientMobileList({ sortedLetters, groupedItems, onSelect, activeTabType }) {
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
