import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Search } from 'lucide-react';

function InterventionPickerModal({ currentValue, onSelect, onClose }) {
    const [query, setQuery] = useState("");
    
    const list = [
        "Entretien annuel",
        "Dépannage d'urgence",
        "Mise en service climatisation",
        "Installation pompe à chaleur",
        "Contrôle d'étanchéité"
    ];

    const filtered = list.filter(item => 
        item.toLowerCase().includes(query.toLowerCase())
    );

    return createPortal(
        <div className="client-search-overlay-wrapper" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="client-search-panel" onClick={(e) => e.stopPropagation()}>
                <div className="client-search-header">
                    <button type="button" className="client-search-back-btn" onClick={onClose}>
                        <X size={22} />
                    </button>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Type d'intervention</h3>
                    <div style={{ width: 34 }}></div>
                </div>

                <div className="client-search-bar-container">
                    <div className="client-search-input-wrapper">
                        <Search size={18} className="client-search-icon" />
                        <input
                            type="text"
                            placeholder="Rechercher ou saisir un type..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="client-search-input"
                            autoFocus
                        />
                    </div>
                </div>

                <div className="client-search-list-container" style={{ padding: '16px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {filtered.map(item => {
                        const isSelected = currentValue === item;
                        return (
                            <div
                                key={item}
                                className={`client-search-item ${isSelected ? 'selected' : ''}`}
                                onClick={() => {
                                    onSelect(item);
                                    onClose();
                                }}
                                style={{
                                    padding: '12px 16px',
                                    borderRadius: '10px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    backgroundColor: isSelected ? 'rgba(85, 107, 47, 0.1)' : 'var(--card)',
                                    border: isSelected ? '1.5px solid #556B2F' : '1px solid var(--border)'
                                }}
                            >
                                <span className="client-item-name" style={{ fontWeight: isSelected ? 700 : 500, color: 'var(--foreground)' }}>{item}</span>
                            </div>
                        );
                    })}
                    {filtered.length === 0 && (
                        <div className="client-search-empty" style={{ textAlign: 'center', padding: '20px', color: 'var(--muted-foreground)' }}>
                            <span>Aucun type ne correspond</span>
                        </div>
                    )}
                </div>

                <div className="client-search-footer">
                    <button
                        type="button"
                        className="client-search-confirm-btn"
                        onClick={() => {
                            if (query.trim()) {
                                onSelect(query.trim());
                                onClose();
                            }
                        }}
                        disabled={!query.trim()}
                        style={{ opacity: query.trim() ? 1 : 0.6 }}
                    >
                        Sélectionner le texte saisi
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

export default InterventionPickerModal;
