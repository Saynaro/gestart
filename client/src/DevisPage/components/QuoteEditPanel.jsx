import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, ArrowLeft, Plus, Trash2, Search, ChevronRight, Edit2, Eye, MoreHorizontal, FileText, ChevronDown, Palette } from "lucide-react";
import InterventionPickerModal from "../../components/InterventionPickerModal";
import EcheancePickerModal, { computeDueDate, getEcheanceLabel } from "../../components/EcheancePickerModal";
import DocumentCustomizerModal from "../../components/DocumentCustomizerModal";
import { useDocumentCustomization } from "../../utils/documentCustomization";
import { useUser } from "../../utils/useUser";
import { apiFetch } from "../../utils/api";

// Same client list as NewQuoteModal
const CLIENT_LIST = [];

const TVA_RATES = [0, 5.5, 10, 20];

const INTERVENTION_TYPES = [
    "Entretien annuel",
    "Dépannage d'urgence",
    "Mise en service climatisation",
    "Installation pompe à chaleur",
    "Contrôle d'étanchéité",
];

function ClientPickerModal({ currentName, onSelect, onClose }) {
    const [clientsList, setClientsList] = useState(CLIENT_LIST);
    const [showNewClientForm, setShowNewClientForm] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [newName, setNewName] = useState("");
    const [newType, setNewType] = useState("Particulier");
    const [newEmail, setNewEmail] = useState("");
    const [newPhone, setNewPhone] = useState("");
    const [newAddress, setNewAddress] = useState("");
    const [creatingLoading, setCreatingLoading] = useState(false);

    useEffect(() => {
        const fetchClients = async () => {
            try {
                const data = await apiFetch('/v1/clients');
                const list = data.data?.clients || data.clients || (Array.isArray(data) ? data : []);
                if (list.length > 0) {
                    const mapped = list.map(c => ({
                        id: c.id,
                        name: c.companyName || `${c.firstName || ''} ${c.lastName || ''}`.trim(),
                        type: c.type === 'COMPANY' || c.companyName ? "Organisation" : "Particulier",
                        email: c.email || "",
                        phone: c.phone || "",
                        address: c.address ? `${c.address}${c.postalCode || c.city ? `, ${c.postalCode || ''} ${c.city || ''}` : ''}`.trim() : (c.city || "")
                    }));
                    setClientsList(mapped);
                }
            } catch (err) {
                console.warn("API clients error in QuoteEditPanel:", err);
            }
        };
        fetchClients();
    }, []);

    const handleCreateClient = async (e) => {
        e.preventDefault();
        if (!newName.trim()) {
            alert("Veuillez saisir un nom pour le client.");
            return;
        }
        setCreatingLoading(true);
        try {
            const nameParts = newName.trim().split(" ");
            const firstName = nameParts[0] || "Client";
            const lastName = nameParts.slice(1).join(" ") || (newType === "Organisation" ? "" : "Particulier");

            const res = await apiFetch('/v1/clients', {
                method: 'POST',
                body: JSON.stringify({
                    firstName,
                    lastName: lastName || "Particulier",
                    companyName: newType === "Organisation" ? newName.trim() : null,
                    type: newType === "Organisation" ? "COMPANY" : "INDIVIDUAL",
                    email: newEmail.trim() || null,
                    phone: newPhone.trim() || "0600000000",
                    address: newAddress.trim() || "Adresse non renseignée"
                })
            });

            const created = res.data?.client || res.client || {
                id: Date.now().toString(),
                name: newName.trim(),
                email: newEmail.trim(),
                phone: newPhone.trim(),
                address: newAddress.trim(),
                type: newType
            };

            const mappedClient = {
                id: created.id,
                name: created.companyName || `${created.firstName || ''} ${created.lastName || ''}`.trim() || newName.trim(),
                type: newType,
                email: created.email || newEmail.trim(),
                phone: created.phone || newPhone.trim(),
                address: created.address || newAddress.trim()
            };

            onSelect(mappedClient);
        } catch (err) {
            console.error("Create client error:", err);
            onSelect({
                id: `temp_${Date.now()}`,
                name: newName.trim(),
                type: newType,
                email: newEmail.trim(),
                phone: newPhone.trim(),
                address: newAddress.trim()
            });
        } finally {
            setCreatingLoading(false);
        }
    };

    const filtered = clientsList.filter(c =>
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.email.toLowerCase().includes(query.toLowerCase())
    );

    const grouped = {};
    filtered.forEach(c => {
        const letter = c.name.charAt(0).toUpperCase();
        if (!grouped[letter]) grouped[letter] = [];
        grouped[letter].push(c);
    });

    return (
        <div className="fp-edit-overlay" onClick={onClose}>
            <div
                className="fp-edit-panel"
                onClick={e => e.stopPropagation()}
                style={{ maxHeight: "min(92vh, 720px)", animation: "fpScaleIn 0.22s cubic-bezier(0.22,1,0.36,1)" }}
            >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <button className="fp-icon-btn" onClick={showNewClientForm ? () => setShowNewClientForm(false) : onClose} style={{ border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", color: "var(--foreground)" }}>
                            <ArrowLeft size={18} />
                        </button>
                        <span style={{ fontWeight: 700, fontSize: "1rem" }}>
                            {showNewClientForm ? "Nouveau client" : "Sélectionner un client"}
                        </span>
                    </div>
                    <button className="fp-icon-btn" onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--muted-foreground)" }}>
                        <X size={18} />
                    </button>
                </div>

                {showNewClientForm ? (
                    <form onSubmit={handleCreateClient} style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px", overflowY: "auto" }}>
                        <div style={{ display: "flex", gap: "10px", marginBottom: "4px" }}>
                            <button
                                type="button"
                                onClick={() => setNewType("Particulier")}
                                style={{
                                    flex: 1,
                                    padding: "8px",
                                    borderRadius: "6px",
                                    border: newType === "Particulier" ? "1.5px solid #556B2F" : "1px solid var(--border)",
                                    backgroundColor: newType === "Particulier" ? "rgba(85, 107, 47, 0.1)" : "var(--background)",
                                    color: newType === "Particulier" ? "#556B2F" : "var(--foreground)",
                                    fontWeight: 700,
                                    fontSize: "0.85rem",
                                    cursor: "pointer"
                                }}
                            >
                                Particulier
                            </button>
                            <button
                                type="button"
                                onClick={() => setNewType("Organisation")}
                                style={{
                                    flex: 1,
                                    padding: "8px",
                                    borderRadius: "6px",
                                    border: newType === "Organisation" ? "1.5px solid #556B2F" : "1px solid var(--border)",
                                    backgroundColor: newType === "Organisation" ? "rgba(85, 107, 47, 0.1)" : "var(--background)",
                                    color: newType === "Organisation" ? "#556B2F" : "var(--foreground)",
                                    fontWeight: 700,
                                    fontSize: "0.85rem",
                                    cursor: "pointer"
                                }}
                            >
                                Entreprise
                            </button>
                        </div>

                        <div>
                            <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--muted-foreground)", display: "block", marginBottom: 4 }}>Nom complet ou raison sociale *</label>
                            <input
                                required
                                autoFocus
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                placeholder="Ex: Jean Dupont ou SARL Climatik"
                                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", outline: "none", boxSizing: "border-box" }}
                            />
                        </div>

                        <div>
                            <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--muted-foreground)", display: "block", marginBottom: 4 }}>Email</label>
                            <input
                                type="email"
                                value={newEmail}
                                onChange={e => setNewEmail(e.target.value)}
                                placeholder="client@exemple.fr"
                                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", outline: "none", boxSizing: "border-box" }}
                            />
                        </div>

                        <div>
                            <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--muted-foreground)", display: "block", marginBottom: 4 }}>Téléphone</label>
                            <input
                                type="tel"
                                value={newPhone}
                                onChange={e => setNewPhone(e.target.value)}
                                placeholder="06 12 34 56 78"
                                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", outline: "none", boxSizing: "border-box" }}
                            />
                        </div>

                        <div>
                            <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--muted-foreground)", display: "block", marginBottom: 4 }}>Adresse</label>
                            <input
                                value={newAddress}
                                onChange={e => setNewAddress(e.target.value)}
                                placeholder="10 Rue de la Paix, 75001 Paris"
                                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", outline: "none", boxSizing: "border-box" }}
                            />
                        </div>

                        <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                            <button
                                type="submit"
                                disabled={creatingLoading}
                                style={{
                                    flex: 2,
                                    padding: "12px",
                                    backgroundColor: "#556B2F",
                                    color: "white",
                                    border: "none",
                                    borderRadius: 8,
                                    fontWeight: 700,
                                    cursor: "pointer"
                                }}
                            >
                                {creatingLoading ? "Création..." : "Créer et sélectionner"}
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowNewClientForm(false)}
                                style={{
                                    flex: 1,
                                    padding: "12px",
                                    backgroundColor: "transparent",
                                    border: "1px solid var(--border)",
                                    borderRadius: 8,
                                    fontWeight: 600,
                                    color: "var(--foreground)",
                                    cursor: "pointer"
                                }}
                            >
                                Annuler
                            </button>
                        </div>
                    </form>
                ) : (
                    <>
                        <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "10px", flexShrink: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--background)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px" }}>
                                <Search size={15} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
                                <input
                                    autoFocus
                                    value={query}
                                    onChange={e => setQuery(e.target.value)}
                                    placeholder="Rechercher un client..."
                                    style={{ border: "none", background: "transparent", outline: "none", fontFamily: "var(--font-body)", fontSize: "0.875rem", width: "100%", color: "var(--foreground)" }}
                                />
                            </div>

                            <button
                                type="button"
                                onClick={() => setShowNewClientForm(true)}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "8px",
                                    width: "100%",
                                    padding: "10px",
                                    backgroundColor: "rgba(85, 107, 47, 0.08)",
                                    color: "#556B2F",
                                    border: "1px dashed #556B2F",
                                    borderRadius: "8px",
                                    fontWeight: 700,
                                    fontSize: "0.85rem",
                                    cursor: "pointer"
                                }}
                            >
                                <Plus size={16} /> Créer un nouveau client
                            </button>
                        </div>

                        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
                            {Object.keys(grouped).sort().map(letter => (
                                <div key={letter}>
                                    <div style={{ padding: "6px 20px 2px", fontSize: "0.72rem", fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                                        {letter}
                                    </div>
                                    {grouped[letter].map(client => (
                                        <button
                                            key={client.id || client.email || client.name}
                                            onClick={() => onSelect(client)}
                                            style={{
                                                display: "flex",
                                                flexDirection: "column",
                                                width: "100%",
                                                padding: "10px 20px",
                                                background: client.name === currentName ? "rgba(85,107,47,0.08)" : "none",
                                                border: "none",
                                                cursor: "pointer",
                                                textAlign: "left",
                                                fontFamily: "var(--font-body)",
                                                transition: "background 0.15s",
                                                borderLeft: client.name === currentName ? "3px solid #556B2F" : "3px solid transparent",
                                            }}
                                            onMouseEnter={e => { if (client.name !== currentName) e.currentTarget.style.background = "var(--muted)"; }}
                                            onMouseLeave={e => { if (client.name !== currentName) e.currentTarget.style.background = "none"; }}
                                        >
                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                                                <span style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--foreground)" }}>{client.name}</span>
                                                <span style={{ fontSize: "0.72rem", color: "var(--muted-foreground)", backgroundColor: "var(--muted)", padding: "2px 6px", borderRadius: "4px" }}>
                                                    {client.type}
                                                </span>
                                            </div>
                                            <span style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", marginTop: "2px" }}>
                                                {client.email || client.address || "Aucun email"}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            ))}
                            {filtered.length === 0 && (
                                <div style={{ padding: "30px 20px", textAlign: "center", color: "var(--muted-foreground)", fontSize: "0.85rem" }}>
                                    Aucun client trouvé
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function ArticleEditorDrawer({ line, onSave, onClose }) {
    const [showCatalogSearch, setShowCatalogSearch] = useState(!line);
    const [catalogSearchQuery, setCatalogSearchQuery] = useState("");
    const [catalogItems, setCatalogItems] = useState([]);

    const fetchCatalog = async () => {
        try {
            const res = await apiFetch('/v1/catalog');
            const raw = res.data || res.items || (Array.isArray(res) ? res : []);
            const mapped = raw.map(item => ({
                id: item.id,
                description: item.name || "Article",
                name: item.name || "Article",
                reference: item.reference || "",
                unitPrice: Number(item.defaultPrice || item.unitPrice || 0),
                tvaRate: Number(item.tvaRate !== undefined ? item.tvaRate : 20),
                urssafCategory: item.type === "PRODUCT" ? "Vente de marchandises (BIC)" : "Prestations de services (BNC)",
                unit: item.unit || "À l'unité"
            })).sort((a, b) => (a.description || "").localeCompare(b.description || ""));
            setCatalogItems(mapped);
        } catch (e) {
            console.warn("Failed to fetch catalog:", e);
        }
    };

    useEffect(() => {
        fetchCatalog();
    }, []);

    const [desc, setDesc] = useState(line ? line.description : "");
    const [qty, setQty] = useState(line ? (line.quantity || line.qty || 1) : 1);
    const [price, setPrice] = useState(line ? (line.unitPrice !== undefined ? line.unitPrice.toString() : "") : "");
    const [tvaRate, setTvaRate] = useState(line ? (line.tvaRate !== undefined ? Number(line.tvaRate) : 20) : 20);
    const [ref, setRef] = useState(line ? (line.reference || "") : "");
    const [urssafCategory, setUrssafCategory] = useState(line ? (line.urssafCategory || "Vente de marchandises (BIC)") : "Vente de marchandises (BIC)");
    const [unit, setUnit] = useState(line ? (line.unit || "À l'unité") : "À l'unité");

    const [showUrssafSelector, setShowUrssafSelector] = useState(false);
    const [showUnitSelector, setShowUnitSelector] = useState(false);

    const handleSave = async () => {
        if (!desc.trim()) { alert("Veuillez saisir une désignation."); return; }
        const itemPrice = parseFloat(price) || 0;
        onSave({
            description: desc.trim(),
            quantity: parseFloat(qty) || 1,
            qty: parseFloat(qty) || 1,
            unitPrice: itemPrice,
            tvaRate: Number(tvaRate),
            reference: ref?.trim() || "",
            urssafCategory,
            unit
        });

        // Auto-save to catalog database
        try {
            await apiFetch('/v1/catalog', {
                method: 'POST',
                body: JSON.stringify({
                    name: desc.trim(),
                    reference: ref?.trim() || null,
                    unitPrice: itemPrice,
                    tvaRate: Number(tvaRate),
                    type: (urssafCategory?.includes("Matériel") || urssafCategory?.includes("marchandises")) ? "PRODUCT" : "SERVICE",
                    unit
                })
            });
        } catch (err) {
            console.warn("Auto-save catalog item error:", err);
        }
    };

    const getGroupedCatalog = (list) => {
        const grouped = {};
        list.forEach(item => {
            const letter = (item.description || "A").charAt(0).toUpperCase();
            if (!grouped[letter]) grouped[letter] = [];
            grouped[letter].push(item);
        });
        return grouped;
    };

    const filteredCatalog = catalogItems.filter(item =>
        (item.description || "").toLowerCase().includes(catalogSearchQuery.toLowerCase())
    );
    const groupedCatalog = getGroupedCatalog(filteredCatalog);

    return (
        <>
            {showCatalogSearch && createPortal(
                <div className="client-search-overlay-wrapper" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
                    <div className="client-search-panel">
                        <div className="client-search-header">
                            <button type="button" className="client-search-back-btn" onClick={onClose}><X size={22} /></button>
                            <h3>Sélectionner un article / service</h3>
                            <div style={{ width: 34 }}></div>
                        </div>

                        <div className="client-search-bar-container">
                            <div className="client-search-input-wrapper">
                                <Search size={18} className="client-search-icon" />
                                <input
                                    type="text"
                                    placeholder="Nom de la fourniture ou prestation..."
                                    value={catalogSearchQuery}
                                    onChange={(e) => setCatalogSearchQuery(e.target.value)}
                                    className="client-search-input"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="client-search-list-container">
                            <div
                                className="client-search-item"
                                onClick={() => {
                                    setDesc(catalogSearchQuery);
                                    setPrice("");
                                    setRef("");
                                    setTvaRate(20);
                                    setUrssafCategory("Vente de marchandises (BIC)");
                                    setUnit("À l'unité");
                                    setShowCatalogSearch(false);
                                }}
                                style={{ cursor: 'pointer', border: '1px dashed #556B2F', borderRadius: '8px', margin: '8px 12px', backgroundColor: 'rgba(85, 107, 47, 0.05)' }}
                            >
                                <span className="client-item-name" style={{ color: '#556B2F', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                                    <Plus size={16} /> Créer un nouvel article {catalogSearchQuery && `"${catalogSearchQuery}"`}
                                </span>
                            </div>

                            {Object.keys(groupedCatalog).map(letter => (
                                <div key={letter} className="client-search-group">
                                    <span className="client-search-group-letter">{letter}</span>
                                    <div className="client-search-group-items">
                                        {groupedCatalog[letter].map(item => (
                                            <div
                                                key={item.id}
                                                className="client-search-item"
                                                onClick={() => {
                                                    setDesc(item.description);
                                                    setPrice(item.unitPrice.toString());
                                                    setTvaRate(item.tvaRate !== undefined ? Number(item.tvaRate) : 20);
                                                    setRef(item.reference || "");
                                                    setUrssafCategory(item.urssafCategory || "Prestations de services (BNC)");
                                                    setUnit(item.unit || "À l'unité");
                                                    setShowCatalogSearch(false);
                                                }}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <div>
                                                    <span className="client-item-name">{item.description}</span>
                                                    {item.reference && <span style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', display: 'block' }}>Réf: {item.reference}</span>}
                                                </div>
                                                <span className="client-item-type" style={{ fontWeight: 700, color: '#556B2F' }}>
                                                    {item.unitPrice} € HT
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            {catalogItems.length === 0 && (
                                <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>
                                    Aucun article dans le catalogue. Cliquez sur "Créer un nouvel article".
                                </div>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {!showCatalogSearch && createPortal(
                <div className="article-drawer-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
                    <div className="article-drawer-content" onClick={(e) => e.stopPropagation()}>
                        <div className="article-drawer-header">
                            <button type="button" className="drawer-round-btn" onClick={onClose}>
                                <X size={20} />
                            </button>
                            <h2>{line ? "Modifier l'article" : "Créer un nouvel article"}</h2>
                            <button type="button" className="drawer-round-btn" style={{ opacity: 0 }} />
                        </div>

                        <div className="article-drawer-body">
                            <div>
                                <div className="article-drawer-group-title">Nom et référence</div>
                                <div className="article-drawer-group-card">
                                    <div className="article-drawer-field">
                                        <label className="article-drawer-label">Désignation*</label>
                                        <input
                                            type="text"
                                            className="article-drawer-input"
                                            placeholder="Ex: Main d'œuvre diagnostic"
                                            value={desc}
                                            onChange={(e) => setDesc(e.target.value)}
                                            required
                                            autoFocus
                                        />
                                    </div>
                                    <div className="article-drawer-field">
                                        <label className="article-drawer-label">Référence</label>
                                        <input
                                            type="text"
                                            className="article-drawer-input"
                                            placeholder="Ex: REF-001"
                                            value={ref}
                                            onChange={(e) => setRef(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <div className="article-drawer-group-title">Tarification & TVA</div>
                                <div className="article-drawer-group-card">
                                    <div className="article-drawer-field">
                                        <label className="article-drawer-label">Prix unitaire HT (€)*</label>
                                        <input
                                            type="number"
                                            step="any"
                                            className="article-drawer-input"
                                            placeholder="Ex: 85"
                                            value={price}
                                            onChange={(e) => setPrice(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div className="article-drawer-field">
                                        <label className="article-drawer-label">Taux TVA (%)</label>
                                        <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                                            {[20, 10, 5.5, 0].map(rate => (
                                                <button
                                                    key={rate}
                                                    type="button"
                                                    onClick={() => setTvaRate(rate)}
                                                    style={{
                                                        flex: 1,
                                                        padding: "8px 4px",
                                                        borderRadius: "6px",
                                                        border: tvaRate === rate ? "1.5px solid #556B2F" : "1px solid var(--border)",
                                                        backgroundColor: tvaRate === rate ? "#556B2F" : "var(--background)",
                                                        color: tvaRate === rate ? "#FFFFFF" : "var(--foreground)",
                                                        fontWeight: 700,
                                                        fontSize: "0.82rem",
                                                        cursor: "pointer",
                                                        transition: "all 0.15s"
                                                    }}
                                                >
                                                    {rate}%
                                                </button>
                                            ))}
                                        </div>
                                        <select
                                            className="form-field-select"
                                            value={tvaRate}
                                            onChange={(e) => setTvaRate(parseFloat(e.target.value) || 0)}
                                            style={{
                                                width: '100%',
                                                height: '40px',
                                                borderRadius: '8px',
                                                border: '1px solid var(--border)',
                                                padding: '0 12px',
                                                fontSize: '0.85rem',
                                                backgroundColor: 'var(--card)',
                                                color: 'var(--foreground)',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <option value="20">20% (Taux normal)</option>
                                            <option value="10">10% (Taux intermédiaire)</option>
                                            <option value="5.5">5.5% (Taux réduit)</option>
                                            <option value="0">0% (Exonéré / Franchise)</option>
                                        </select>
                                    </div>

                                    <div className="article-drawer-field">
                                        <label className="article-drawer-label">Type d'article (URSSAF)</label>
                                        <div className="article-drawer-trigger" onClick={() => setShowUrssafSelector(true)}>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{urssafCategory}</span>
                                            <ChevronRight size={18} style={{ color: 'var(--muted-foreground)' }} />
                                        </div>
                                    </div>

                                    <div className="article-drawer-field">
                                        <label className="article-drawer-label">Unité de facturation</label>
                                        <div className="article-drawer-trigger" onClick={() => setShowUnitSelector(true)}>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{unit}</span>
                                            <span className="article-drawer-trigger-value">
                                                {unit !== "Aucune" ? `/ ${unit.replace("À l'", "").replace("À la ", "").replace("Au ", "").replace("À ", "")}` : ""}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="article-drawer-field">
                                        <label className="article-drawer-label">Quantité</label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--background)', borderRadius: '8px', padding: '8px', border: '1px solid var(--border)' }}>
                                            <button
                                                type="button"
                                                onClick={() => setQty(Math.max(1, qty - 1))}
                                                style={{ width: '36px', height: '36px', borderRadius: '6px', border: 'none', backgroundColor: 'rgba(85, 107, 47, 0.1)', color: '#556B2F', cursor: 'pointer', fontWeight: 800, fontSize: '1rem' }}
                                            >
                                                −
                                            </button>
                                            <input
                                                type="number"
                                                value={qty}
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value) || 1;
                                                    setQty(Math.max(1, val));
                                                }}
                                                style={{ flex: 1, textAlign: 'center', border: 'none', borderRadius: '8px', backgroundColor: 'transparent', color: 'var(--foreground)', fontWeight: 800, fontSize: '1rem', outline: 'none', padding: '8px' }}
                                                min="1"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setQty(qty + 1)}
                                                style={{ width: '36px', height: '36px', borderRadius: '6px', border: 'none', backgroundColor: '#556B2F', color: 'white', cursor: 'pointer', fontWeight: 800, fontSize: '1rem' }}
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="article-drawer-footer">
                            <button type="button" className="drawer-primary-btn" onClick={handleSave}>
                                {line ? "Enregistrer les modifications" : "Confirmer et ajouter"}
                            </button>
                            <button type="button" className="drawer-cancel-btn" onClick={onClose} style={{ width: '100%', padding: '11px', borderRadius: '8px', border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--foreground)', fontWeight: 600, cursor: 'pointer', marginTop: '8px' }}>
                                Annuler
                            </button>
                        </div>

                        {showUrssafSelector && (
                            <div className="selector-subsheet">
                                <div className="article-drawer-header">
                                    <button type="button" className="drawer-round-btn" onClick={() => setShowUrssafSelector(false)}>
                                        <ArrowLeft size={20} />
                                    </button>
                                    <h2>Type d'article</h2>
                                    <button type="button" className="drawer-round-btn" style={{ opacity: 0 }} />
                                </div>
                                <div style={{ padding: '14px 20px 0', fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>
                                    Détermine la catégorie de votre déclaration URSSAF.
                                </div>
                                <div className="selector-options-list">
                                    {[
                                        "Vente de marchandises (BIC)",
                                        "Prestations de services (BNC)",
                                        "Prestations de services artisanales ou commerciales (BIC)",
                                        "Vente de produits fabriqués (BIC)",
                                        "Débours"
                                    ].map((cat) => {
                                        const isSelected = urssafCategory === cat;
                                        return (
                                            <div
                                                key={cat}
                                                className={`selector-option-card ${isSelected ? 'selected' : ''}`}
                                                onClick={() => {
                                                    setUrssafCategory(cat);
                                                    setShowUrssafSelector(false);
                                                }}
                                            >
                                                <div className="option-details">
                                                    <span className="option-title">{cat}</span>
                                                </div>
                                                <div className="option-radio">
                                                    <div className="option-radio-inner" />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {showUnitSelector && (
                            <div className="selector-subsheet">
                                <div className="article-drawer-header">
                                    <button type="button" className="drawer-round-btn" onClick={() => setShowUnitSelector(false)}>
                                        <ArrowLeft size={20} />
                                    </button>
                                    <h2>Unité de facturation</h2>
                                    <button type="button" className="drawer-round-btn" style={{ opacity: 0 }} />
                                </div>
                                <div className="selector-options-list">
                                    {[
                                        "À l'unité",
                                        "À l'heure",
                                        "À la journée",
                                        "À la semaine",
                                        "À l'année",
                                        "Au gramme",
                                        "Au forfait",
                                        "Au caractère",
                                        "À la ligne",
                                        "Aucune"
                                    ].map((u) => {
                                        const isSelected = unit === u;
                                        return (
                                            <div
                                                key={u}
                                                className={`selector-option-card ${isSelected ? 'selected' : ''}`}
                                                onClick={() => {
                                                    setUnit(u);
                                                    setShowUnitSelector(false);
                                                }}
                                            >
                                                <div className="option-details">
                                                    <span className="option-title">{u}</span>
                                                </div>
                                                <div className="option-radio">
                                                    <div className="option-radio-inner" />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}

function QuoteEditPanel({ quote, onClose, onSave }) {
    const { company } = useUser();
    const [docCustomization] = useDocumentCustomization();
    const [showCustomizer, setShowCustomizer] = useState(false);
    const [q, setQ] = useState({
        ...quote,
        lines: (quote.lines || []).map((l, i) => ({
            ...l,
            id: l.id || Date.now() + i,
            description: l.description || "Prestation",
            qty: Number(l.quantity || l.qty || 1),
            quantity: Number(l.quantity || l.qty || 1),
            unitPrice: Number(l.unitPrice) || 0,
            tvaRate: Number(l.tvaRate !== undefined ? l.tvaRate : (quote.tvaRate || 20))
        }))
    });

    const [showClientPicker, setShowClientPicker] = useState(false);
    const [showArticleEditor, setShowArticleEditor] = useState(false);
    const [editingLine, setEditingLine] = useState(null);
    const [showEcheancePicker, setShowEcheancePicker] = useState(false);

    // Totals
    const subtotalHt = q.lines.reduce((s, l) => s + (parseFloat(l.unitPrice) || 0) * (parseFloat(l.qty) || 1), 0);
    const tvaAmt = q.lines.reduce((s, l) => {
        const rate = l.tvaRate !== undefined ? Number(l.tvaRate) : (Number(q.tvaRate) || 20);
        return s + ((parseFloat(l.unitPrice) || 0) * (parseFloat(l.qty) || 1) * (rate / 100));
    }, 0);
    const totalTtc = subtotalHt + tvaAmt;

    const calculatedDueDate = computeDueDate(q.date, q.echeanceOptionId || '30j', q.echeanceCustomDate || '');
    const echeanceLabel = getEcheanceLabel(q.echeanceOptionId || '30j', q.echeanceCustomDate || '');

    const companyDisplayName = company?.name || quote.company?.name || "Mon Entreprise";
    const companyDisplayAddress = company?.address ? `${company.address}${company.postalCode || company.city ? `, ${company.postalCode || ''} ${company.city || ''}` : ''}` : "Adresse non renseignée";
    const companyDisplaySiret = company?.siret || "Non renseigné";
    const companyDisplayPhone = company?.phone || "Non renseigné";
    const companyDisplayEmail = company?.email || "contact@entreprise.fr";
    const companyLogo = docCustomization.logoUrl || company?.logoUrl;

    const handleSelectClient = (client) => {
        setQ(p => ({
            ...p,
            clientId: client.id,
            client: client,
            clientName: client.name,
            clientEmail: client.email || "",
            clientPhone: client.phone || "",
            clientAddress: client.address || "",
        }));
        setShowClientPicker(false);
    };

    const handleOpenNewArticle = () => {
        setEditingLine(null);
        setShowArticleEditor(true);
    };

    const handleOpenEditArticle = (line) => {
        setEditingLine(line);
        setShowArticleEditor(true);
    };

    const handleSaveArticle = (data) => {
        if (editingLine) {
            setQ(p => ({ ...p, lines: p.lines.map(l => l.id === editingLine.id ? { ...l, ...data } : l) }));
        } else {
            setQ(p => ({ ...p, lines: [...p.lines, { id: Date.now(), ...data }] }));
        }
        setShowArticleEditor(false);
    };

    const handleRemoveLine = (id) => {
        setQ(p => ({ ...p, lines: p.lines.filter(l => l.id !== id) }));
    };

    const handleSave = () => {
        onSave({
            ...q,
            clientId: q.clientId || q.client?.id,
            client: q.client,
            clientName: q.clientName || q.client?.name,
            clientEmail: q.clientEmail || q.client?.email,
            clientPhone: q.clientPhone || q.client?.phone,
            clientAddress: q.clientAddress || q.client?.address,
            dueDate: calculatedDueDate,
            paymentConditions: echeanceLabel,
            subtotalHt,
            tvaAmount: tvaAmt,
            totalTtc
        });
    };

    // Live preview
    const renderPreview = () => (
        <div className="live-preview-a4-wrapper">
            <div
                className="live-preview-a4-sheet"
                style={{
                    backgroundColor: docCustomization.bgColor || '#FFFFFF',
                    color: docCustomization.textColor || '#1A1A1A',
                    fontSize: docCustomization.fontSize || '9pt',
                    fontFamily: docCustomization.fontFamily || 'Inter, sans-serif'
                }}
            >
                {docCustomization.structure === 'banner' && (
                    <div style={{ height: '8px', backgroundColor: docCustomization.primaryColor || '#556B2F', margin: '-24px -20px 14px -20px', borderRadius: '2px 2px 0 0' }} />
                )}

                <div className="pdf-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12pt' }}>
                    <div className="pdf-header-left" style={{ flex: 1 }}>
                        {docCustomization.showLogo && docCustomization.logoPosition !== 'right' && (
                            companyLogo ? (
                                <img
                                    src={companyLogo}
                                    alt="Logo"
                                    style={{
                                        maxHeight: `${docCustomization.logoSize || 45}px`,
                                        maxWidth: `${(docCustomization.logoSize || 45) * 2.5}px`,
                                        objectFit: 'contain',
                                        marginBottom: '6pt'
                                    }}
                                />
                            ) : (
                                <div
                                    className="pdf-logo-stub"
                                    style={{
                                        fontSize: '1.1em',
                                        padding: '4px 8px',
                                        height: `${docCustomization.logoSize || 45}px`,
                                        minWidth: `${(docCustomization.logoSize || 45) * 1.8}px`,
                                        backgroundColor: docCustomization.primaryColor || '#556B2F',
                                        color: '#FFF',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: '700',
                                        borderRadius: '4px',
                                        marginBottom: '6pt'
                                    }}
                                >
                                    <span>{companyDisplayName.substring(0, 10).toUpperCase()}</span>
                                </div>
                            )
                        )}
                        <h3 className="company-name" style={{ fontSize: '1.1em', color: docCustomization.primaryColor || '#556B2F', margin: 0, fontWeight: 700 }}>{companyDisplayName}</h3>
                        <p className="company-details" style={{ fontSize: '0.88em', lineHeight: 1.3, margin: '4px 0 0 0' }}>
                            {docCustomization.showAddress && <span>{companyDisplayAddress}<br /></span>}
                            {docCustomization.showSiret && <span>SIRET : {companyDisplaySiret}<br /></span>}
                            {docCustomization.showPhone && <span>Tél : {companyDisplayPhone}<br /></span>}
                            {docCustomization.showEmail && <span>Email : {companyDisplayEmail}</span>}
                        </p>
                    </div>
                    <div className="pdf-header-right" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', textAlign: 'right' }}>
                        {docCustomization.showLogo && docCustomization.logoPosition === 'right' && (
                            companyLogo ? (
                                <img
                                    src={companyLogo}
                                    alt="Logo"
                                    style={{
                                        maxHeight: `${docCustomization.logoSize || 45}px`,
                                        maxWidth: `${(docCustomization.logoSize || 45) * 2.5}px`,
                                        objectFit: 'contain',
                                        marginBottom: '6pt'
                                    }}
                                />
                            ) : (
                                <div
                                    className="pdf-logo-stub"
                                    style={{
                                        fontSize: '1.1em',
                                        padding: '4px 8px',
                                        height: `${docCustomization.logoSize || 45}px`,
                                        minWidth: `${(docCustomization.logoSize || 45) * 1.8}px`,
                                        backgroundColor: docCustomization.primaryColor || '#556B2F',
                                        color: '#FFF',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: '700',
                                        borderRadius: '4px',
                                        marginBottom: '6pt'
                                    }}
                                >
                                    <span>{companyDisplayName.substring(0, 10).toUpperCase()}</span>
                                </div>
                            )
                        )}
                        <h1 className="doc-type-label" style={{ fontSize: '1.8em', marginBottom: '4px', color: docCustomization.primaryColor || '#556B2F', margin: 0, fontWeight: 800 }}>DEVIS</h1>
                        <table className="doc-meta-table" style={{ fontSize: '0.9em' }}>
                            <tbody>
                                <tr>
                                    <td><strong>Numéro :</strong></td>
                                    <td>{q.number || `DEV-${q.id}`}</td>
                                </tr>
                                <tr>
                                    <td><strong>Date d'émission :</strong></td>
                                    <td>{q.date ? new Date(q.date).toLocaleDateString('fr-FR') : '—'}</td>
                                </tr>
                                <tr>
                                    <td><strong>Date d'exigibilité :</strong></td>
                                    <td>{new Date(calculatedDueDate).toLocaleDateString('fr-FR')}</td>
                                </tr>
                                {docCustomization.showDeliveryDate && q.deliveryDate && (
                                    <tr>
                                        <td><strong>Date de livraison :</strong></td>
                                        <td>{new Date(q.deliveryDate).toLocaleDateString('fr-FR')}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div
                    className="pdf-billing-section"
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        gap: '2px',
                        margin: '10pt 0',
                        padding: '8pt 10pt',
                        backgroundColor: docCustomization.structure === 'modern' ? `${docCustomization.primaryColor || '#556B2F'}12` : '#FAFAF8',
                        borderRadius: '6px',
                        textAlign: 'left'
                    }}
                >
                    <span className="section-label" style={{ fontSize: '7.5pt', fontWeight: 700, opacity: 0.65, letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                        DEVIS POUR :
                    </span>
                    <h4 className="client-name" style={{ fontSize: '10pt', fontWeight: 700, margin: 0, color: '#1A1A1A', lineHeight: 1.3 }}>
                        {q.clientName || "Aucun client"}
                    </h4>
                    {q.clientAddress && (
                        <div style={{ fontSize: '8.5pt', opacity: 0.85, lineHeight: 1.3 }}>
                            {q.clientAddress}
                        </div>
                    )}
                    {q.clientEmail && (
                        <div style={{ fontSize: '8.5pt', opacity: 0.85, lineHeight: 1.3 }}>
                            {q.clientEmail}
                        </div>
                    )}
                </div>

                <table className="pdf-items-table" style={{ fontSize: '8.5pt', marginBottom: '15pt' }}>
                    <thead style={{ backgroundColor: docCustomization.primaryColor || '#556B2F', color: '#FFFFFF' }}>
                        <tr>
                            <th style={{ textAlign: 'left', padding: '6pt 8pt' }}>Description</th>
                            <th className="text-center" style={{ width: '40px', padding: '6pt', whiteSpace: 'nowrap' }}>Qté</th>
                            <th className="text-right" style={{ minWidth: '75px', padding: '6pt 8pt', whiteSpace: 'nowrap' }}>Unit. HT</th>
                            <th className="text-right" style={{ minWidth: '75px', padding: '6pt 8pt', whiteSpace: 'nowrap' }}>Total HT</th>
                        </tr>
                    </thead>
                    <tbody>
                        {q.lines.map((line, idx) => (
                            <tr key={idx}>
                                <td>{line.description || '—'}</td>
                                <td className="text-center" style={{ whiteSpace: 'nowrap' }}>{line.qty}</td>
                                <td className="text-right" style={{ whiteSpace: 'nowrap' }}>{(parseFloat(line.unitPrice) || 0).toLocaleString('fr-FR')} €</td>
                                <td className="text-right" style={{ whiteSpace: 'nowrap' }}>{((parseFloat(line.unitPrice) || 0) * (line.qty || 1)).toLocaleString('fr-FR')} €</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="pdf-summary-block" style={{ marginBottom: '15pt' }}>
                    <table className="pdf-summary-table" style={{ fontSize: '8.5pt', width: 'auto', minWidth: '180pt' }}>
                        <tbody>
                            <tr>
                                <td style={{ whiteSpace: 'nowrap', padding: '3pt 6pt' }}>Sous-total HT :</td>
                                <td style={{ textAlign: 'right', whiteSpace: 'nowrap', padding: '3pt 6pt' }}>{subtotalHt.toLocaleString('fr-FR')} €</td>
                            </tr>
                            <tr>
                                <td style={{ whiteSpace: 'nowrap', padding: '3pt 6pt' }}>TVA ({q.tvaRate || 20}%) :</td>
                                <td style={{ textAlign: 'right', whiteSpace: 'nowrap', padding: '3pt 6pt' }}>{tvaAmt.toLocaleString('fr-FR')} €</td>
                            </tr>
                            <tr className="grand-total-row" style={{ backgroundColor: docCustomization.primaryColor || '#556B2F', color: '#FFFFFF' }}>
                                <td style={{ whiteSpace: 'nowrap', padding: '6pt 8pt' }}><strong>TOTAL TTC :</strong></td>
                                <td style={{ textAlign: 'right', whiteSpace: 'nowrap', padding: '6pt 8pt' }}><strong>{totalTtc.toLocaleString('fr-FR')} €</strong></td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {docCustomization.showPaymentConditions && (
                    <div className="pdf-footer-section" style={{ fontSize: '7.5pt', paddingTop: '8pt', borderTop: '1px solid #E0E0E0', marginTop: '12pt', display: 'flex', flexDirection: 'column', gap: '4pt' }}>
                        <div><strong>Conditions de paiement :</strong> Paiement {echeanceLabel} (Échéance le {new Date(calculatedDueDate).toLocaleDateString('fr-FR')})</div>
                        <span>Validité du devis : 30 jours.</span>
                        {docCustomization.showIban && (company?.settings?.bankIban || company?.bankIban || company?.iban || q?.company?.settings?.bankIban) && (
                            <span>IBAN: {company?.settings?.bankIban || company?.bankIban || company?.iban || q?.company?.settings?.bankIban}</span>
                        )}
                        {docCustomization.showAgaMention && <div style={{ fontStyle: 'italic', marginTop: '2pt' }}>Membre d'une association agréée, le règlement par chèque est accepté.</div>}
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="fp-edit-overlay" onClick={onClose}>
            <div className="fp-detail-wide-container" onClick={e => e.stopPropagation()}>
                {/* LEFT Panel */}
                <div className="fp-edit-panel fp-detail-left">
                    <div className="fp-edit-header">
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <button
                                className="fp-icon-btn"
                                onClick={onClose}
                                style={{ border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", color: "var(--foreground)" }}
                            >
                                <ArrowLeft size={18} />
                            </button>
                            <span className="fp-edit-title">Modifier le devis {q.number}</span>
                        </div>
                        <button className="fp-icon-btn" onClick={onClose} aria-label="Fermer">
                            <X size={16} />
                        </button>
                    </div>

                    <div className="fp-edit-body">
                        {/* Client Section */}
                        <div className="fp-edit-section">
                            <div className="fp-edit-section-header">
                                <span className="fp-edit-section-title">Client</span>
                            </div>
                            <div
                                className="fp-edit-field-card"
                                onClick={() => setShowClientPicker(true)}
                                style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: "var(--background)", border: "1px solid var(--border)", borderRadius: 8 }}
                            >
                                <div>
                                    <span style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", display: "block", marginBottom: 2 }}>Nom du client</span>
                                    <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--foreground)" }}>{q.clientName || "Sélectionner un client"}</span>
                                </div>
                                <ChevronRight size={16} style={{ color: "var(--muted-foreground)" }} />
                            </div>
                        </div>

                        {/* Dates & Échéance Section */}
                        <div className="fp-edit-section">
                            <div className="fp-edit-section-header">
                                <span className="fp-edit-section-title">Dates & Échéance</span>
                            </div>
                            <div className="fp-edit-field-row" style={{ marginBottom: 12 }}>
                                <span className="fp-edit-field-label">Date du devis</span>
                                <input
                                    type="date"
                                    value={q.date || ""}
                                    onChange={e => setQ(p => ({ ...p, date: e.target.value }))}
                                    style={{ border: "none", background: "transparent", fontFamily: "var(--font-body)", fontWeight: 600, fontSize: "0.875rem", color: "var(--foreground)", cursor: "pointer", outline: "none" }}
                                />
                            </div>

                            {/* Mandatory Date d'échéance selector */}
                            <div
                                onClick={() => setShowEcheancePicker(true)}
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    width: "100%",
                                    padding: "10px 12px",
                                    border: "1.5px solid var(--border)",
                                    borderRadius: 8,
                                    background: "var(--background)",
                                    cursor: "pointer",
                                    boxSizing: "border-box",
                                    marginBottom: 12
                                }}
                            >
                                <div>
                                    <span style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", display: "block", marginBottom: 2 }}>Date d'échéance*</span>
                                    <span style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--foreground)" }}>
                                        {echeanceLabel} ({new Date(calculatedDueDate).toLocaleDateString('fr-FR')})
                                    </span>
                                </div>
                                <ChevronRight size={16} style={{ color: "var(--muted-foreground)" }} />
                            </div>

                            {/* Optional Date de livraison */}
                            {!q.deliveryDate ? (
                                <button
                                    type="button"
                                    onClick={() => setQ(p => ({ ...p, deliveryDate: p.date || new Date().toISOString().split("T")[0] }))}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: 6,
                                        width: "100%",
                                        padding: "10px",
                                        borderRadius: 8,
                                        border: "1.5px dashed #556B2F",
                                        background: "rgba(85, 107, 47, 0.05)",
                                        color: "#556B2F",
                                        fontWeight: 700,
                                        fontSize: "0.8rem",
                                        cursor: "pointer"
                                    }}
                                >
                                    <Plus size={14} /> Ajouter une date de livraison
                                </button>
                            ) : (
                                <div style={{ padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--background)" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                                        <span style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", fontWeight: 700 }}>Date de livraison</span>
                                        <button
                                            type="button"
                                            onClick={() => setQ(p => ({ ...p, deliveryDate: null }))}
                                            style={{ border: "none", background: "none", color: "var(--destructive)", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}
                                        >
                                            <Trash2 size={13} /> Supprimer
                                        </button>
                                    </div>
                                    <input
                                        type="date"
                                        value={q.deliveryDate || ""}
                                        onChange={e => setQ(p => ({ ...p, deliveryDate: e.target.value }))}
                                        style={{ border: "none", background: "transparent", fontFamily: "var(--font-body)", fontWeight: 600, fontSize: "0.875rem", color: "var(--foreground)", cursor: "pointer", outline: "none", width: "100%" }}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Articles Section */}
                        <div className="fp-edit-section">
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                                <div className="fp-edit-section-header" style={{ flex: 1, marginBottom: 0 }}>
                                    <span className="fp-edit-section-title">Articles</span>
                                </div>
                                <button
                                    onClick={handleOpenNewArticle}
                                    style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "6px 12px", border: "1px solid #556B2F", borderRadius: 6, background: "none", color: "#556B2F", fontFamily: "var(--font-body)", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer" }}
                                >
                                    <Plus size={13} /> Ajouter
                                </button>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                {q.lines.map((line) => (
                                    <div key={line.id} className="fp-edit-article-item">
                                        <button
                                            onClick={() => handleOpenEditArticle(line)}
                                            style={{ flex: 1, background: "none", border: "none", textAlign: "left", cursor: "pointer", fontFamily: "var(--font-body)", padding: 0 }}
                                        >
                                            <div className="fp-edit-article-desc">{line.description}</div>
                                            <div className="fp-edit-article-qty">
                                                {line.qty} × {(parseFloat(line.unitPrice) || 0).toLocaleString("fr-FR")} € HT
                                            </div>
                                        </button>
                                        <span className="fp-edit-article-price">
                                            {((parseFloat(line.unitPrice) || 0) * (parseFloat(line.qty) || 1)).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} € HT
                                        </span>
                                        <button
                                            onClick={() => handleRemoveLine(line.id)}
                                            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--destructive)", display: "flex", alignItems: "center", padding: "2px 4px", marginLeft: 4 }}
                                            title="Supprimer"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="fp-edit-footer">
                        <button className="fp-drawer-action-primary" onClick={handleSave}>
                            Enregistrer les modifications
                        </button>
                        <button className="fp-drawer-action-secondary" onClick={onClose}>
                            Annuler
                        </button>
                    </div>
                </div>

                {/* RIGHT Panel: Live preview */}
                <div className="fp-detail-right">
                    <div className="preview-side-header">
                        <FileText size={14} />
                        <span>Aperçu du devis</span>
                        <button className="personnaliser-btn" type="button" onClick={() => setShowCustomizer(true)}>
                            <Palette size={14} />
                            Personnaliser
                        </button>
                    </div>
                    <div className="preview-side-scrollable">
                        {renderPreview()}
                    </div>
                </div>
            </div>

            {showCustomizer && (
                <DocumentCustomizerModal docType="devis" onClose={() => setShowCustomizer(false)} />
            )}

            {/* Client Picker */}
            {showClientPicker && (
                <ClientPickerModal
                    currentName={q.clientName}
                    onSelect={handleSelectClient}
                    onClose={() => setShowClientPicker(false)}
                />
            )}

            {/* Article editor drawer */}
            {showArticleEditor && (
                <ArticleEditorDrawer
                    line={editingLine}
                    onSave={handleSaveArticle}
                    onClose={() => setShowArticleEditor(false)}
                />
            )}
            {showEcheancePicker && (
                <EcheancePickerModal
                    selectedOptionId={q.echeanceOptionId}
                    customDate={q.echeanceCustomDate}
                    onSelect={({ echeanceOptionId: optId, customDateStr: custStr }) => {
                        setQ(p => ({ ...p, echeanceOptionId: optId, echeanceCustomDate: custStr }));
                    }}
                    onClose={() => setShowEcheancePicker(false)}
                />
            )}
        </div>
    );
}

export default QuoteEditPanel;
